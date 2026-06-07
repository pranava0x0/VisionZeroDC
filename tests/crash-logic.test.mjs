/**
 * Unit tests for src/crash-logic.js (the pure crash logic shared with app.js).
 * Zero dependencies — uses Node's built-in test runner.
 *
 * Run: node --test
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const C = require("../src/crash-logic.js");

// --- crashStats / severityFor -------------------------------------------

test("crashStats sums each severity across all person-type columns", () => {
  const props = {
    FATAL_DRIVER: 1,
    FATAL_PEDESTRIAN: 2,
    MAJORINJURIES_BICYCLIST: 3,
    MINORINJURIES_PASSENGER: 0,
    MINORINJURIES_DRIVER: 4,
  };
  const s = C.crashStats(props);
  assert.equal(s.fatalities, 3);
  assert.equal(s.major, 3);
  assert.equal(s.minor, 4);
});

test("crashStats treats missing / non-numeric fields as zero", () => {
  assert.deepEqual(C.crashStats({}), { fatalities: 0, major: 0, minor: 0 });
  assert.deepEqual(C.crashStats({ FATAL_DRIVER: null, MAJORINJURIES_DRIVER: undefined }), {
    fatalities: 0,
    major: 0,
    minor: 0,
  });
});

test("severityFor returns the most severe non-zero category", () => {
  assert.equal(C.severityFor({ FATAL_DRIVER: 1, MAJORINJURIES_DRIVER: 5 }), "fatal");
  assert.equal(C.severityFor({ MAJORINJURIES_DRIVER: 1, MINORINJURIES_DRIVER: 9 }), "major");
  assert.equal(C.severityFor({ MINORINJURIES_DRIVER: 1 }), "minor");
  assert.equal(C.severityFor({}), "property");
});

// --- triageScore ---------------------------------------------------------

test("triageScore applies the documented weights", () => {
  // 2 crashes + 1 fatal(40) + 1 major(12) + 1 minor(2) + 1 ped(2) + 1 bike(2) + 1 speed(1)
  const attrs = {
    CRASH_COUNT: 2,
    FATAL_COUNT: 1,
    MAJOR_COUNT: 1,
    MINOR_COUNT: 1,
    PEDESTRIAN_COUNT: 1,
    BICYCLE_COUNT: 1,
    SPEEDING_COUNT: 1,
  };
  assert.equal(C.triageScore(attrs), 2 + 40 + 12 + 2 + 2 + 2 + 1);
});

test("triageScore weights match the documented heuristic constants", () => {
  assert.deepEqual(C.TRIAGE_WEIGHTS, {
    crash: 1,
    fatal: 40,
    major: 12,
    minor: 2,
    pedestrian: 2,
    bicycle: 2,
    speeding: 1,
  });
});

test("attrNumber reads lower- or upper-case stat field names", () => {
  assert.equal(C.attrNumber({ CRASH_COUNT: 7 }, "CRASH_COUNT"), 7);
  assert.equal(C.attrNumber({ crash_count: 7 }, "crash_count"), 7);
  assert.equal(C.attrNumber({}, "CRASH_COUNT"), 0);
});

// --- cleanLocationName ---------------------------------------------------

test("cleanLocationName strips a trailing WASHINGTON and collapses whitespace", () => {
  assert.equal(C.cleanLocationName("14TH ST NW   WASHINGTON"), "14TH ST NW");
  assert.equal(C.cleanLocationName("GEORGIA AVE NW, WASHINGTON,"), "GEORGIA AVE NW,");
  assert.equal(C.cleanLocationName(""), "Location not available");
  assert.equal(C.cleanLocationName(null), "Location not available");
});

// --- parseHotspot --------------------------------------------------------

test("parseHotspot builds a labelled record and computes its score", () => {
  const feature = {
    attributes: { WARD: "Ward 5", ADDRESS: "RHODE ISLAND AVE NE WASHINGTON", CRASH_COUNT: 10, FATAL_COUNT: 1 },
  };
  const loc = C.parseHotspot(feature, "location");
  assert.equal(loc.location, "RHODE ISLAND AVE NE");
  assert.equal(loc.ward, "Ward 5");
  assert.equal(loc.score, 10 + 40);

  const ward = C.parseHotspot(feature, "ward");
  assert.equal(ward.location, "Ward 5"); // ward kind uses WARD as the label
});

test("parseHotspot tolerates a missing attributes object", () => {
  const r = C.parseHotspot({}, "ward");
  assert.equal(r.location, "Ward not available");
  assert.equal(r.score, 0);
});

// --- formatRate ----------------------------------------------------------

test("formatRate renders n/a for null/undefined and rounds by magnitude", () => {
  assert.equal(C.formatRate(null), "n/a");
  assert.equal(C.formatRate(undefined), "n/a");
  assert.equal(C.formatRate(12067), "12,067"); // >=100 -> no decimals
  assert.equal(C.formatRate(5.234), "5.2"); // <100 -> one decimal
  assert.equal(C.formatRate(0), "0");
});

// --- decodeFilters -------------------------------------------------------

test("decodeFilters returns defaults for empty or invalid params", () => {
  assert.deepEqual(C.decodeFilters(""), {
    date: "2024",
    sev: "all",
    mode: "all",
    violOn: false,
    vmonth: null,
  });
  // invalid values fall back to defaults
  const f = C.decodeFilters("?date=1999&sev=bogus&mode=teleport");
  assert.equal(f.date, "2024");
  assert.equal(f.sev, "all");
  assert.equal(f.mode, "all");
});

test("decodeFilters reads valid filters and the violations overlay", () => {
  const f = C.decodeFilters("?date=all&sev=fatal&mode=pedestrian&viol=1&vmonth=2025-11");
  assert.deepEqual(f, {
    date: "all",
    sev: "fatal",
    mode: "pedestrian",
    violOn: true,
    vmonth: "2025-11",
  });
});

// --- parseView -----------------------------------------------------------

test("parseView extracts center and zoom, or null when absent/invalid", () => {
  assert.deepEqual(C.parseView("?c=38.9,-77.03&z=14"), { center: [38.9, -77.03], zoom: 14 });
  assert.equal(C.parseView(""), null);
  assert.equal(C.parseView("?c=38.9,-77.03"), null); // missing zoom
  assert.equal(C.parseView("?c=notanumber&z=14"), null);
  assert.equal(C.parseView("?c=38.9&z=14"), null); // only one coordinate
});

// --- encodeState ---------------------------------------------------------

test("encodeState omits default filters to keep URLs short", () => {
  const qs = C.encodeState({
    date: "2024",
    sev: "all",
    mode: "all",
    violOn: false,
    lat: 38.9,
    lng: -77.03,
    zoom: 12,
  });
  const p = new URLSearchParams(qs);
  assert.equal(p.get("date"), null);
  assert.equal(p.get("sev"), null);
  assert.equal(p.get("c"), "38.90000,-77.03000");
  assert.equal(p.get("z"), "12");
});

test("encodeState includes non-default filters and the violations month", () => {
  const qs = C.encodeState({
    date: "all",
    sev: "fatal",
    mode: "pedestrian",
    violOn: true,
    vmonth: "2025-11",
    lat: 38.901,
    lng: -77.03,
    zoom: 14,
  });
  const p = new URLSearchParams(qs);
  assert.equal(p.get("date"), "all");
  assert.equal(p.get("sev"), "fatal");
  assert.equal(p.get("mode"), "pedestrian");
  assert.equal(p.get("viol"), "1");
  assert.equal(p.get("vmonth"), "2025-11");
});

test("encode -> decode round-trips the filter state", () => {
  const original = { date: "2025", sev: "major", mode: "bicycle", violOn: true, vmonth: "2026-01" };
  const qs = C.encodeState({ ...original, lat: 38.9, lng: -77.0, zoom: 13 });
  const decoded = C.decodeFilters("?" + qs);
  assert.deepEqual(decoded, original);
  const view = C.parseView("?" + qs);
  assert.deepEqual(view, { center: [38.9, -77.0], zoom: 13 });
});
