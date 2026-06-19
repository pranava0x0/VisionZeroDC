/**
 * Data-integrity tests for data/hotspots.geojson — the file that drives the
 * High-Injury Corridors map (hotspots.html / hotspots.js).
 *
 * hotspots.js renders these features blind: it trusts the schema, draws a
 * polyline per LineString, and reads severity/priority/interventions straight
 * into the sidebar. So a bad row shows up as a broken card or a corridor drawn
 * in the wrong place rather than a thrown error. These tests guard the shape
 * and the invariants the UI assumes:
 *
 *   - schema the sidebar reads (rank, name, severity, interventions, priority)
 *   - ksi === fatalities + major_injuries (true KSI: killed or seriously injured)
 *   - every coordinate is [lng, lat] inside DC (regresses PR5-001, where New
 *     York Ave was plotted in the wrong quadrant)
 *   - ranks are a clean 1..N set and KSI is non-increasing with rank
 *
 * Run: node --test
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const geo = JSON.parse(readFileSync(join(ROOT, "data/hotspots.geojson"), "utf8"));

// DC bounding box — same extent hotspots.js uses for the map (DC_BOUNDS),
// expressed as [lng, lat] ranges. A point outside this is a geocoding error.
const DC = { lngMin: -77.13, lngMax: -76.90, latMin: 38.78, latMax: 39.00 };
const PRIORITIES = new Set(["URGENT", "HIGH"]);
const CONFIDENCE = new Set(["high", "medium", "low"]);

const features = geo.features || [];

test("file is a non-empty GeoJSON FeatureCollection", () => {
  assert.equal(geo.type, "FeatureCollection");
  assert.ok(Array.isArray(geo.features));
  assert.ok(features.length > 0, "expected at least one corridor feature");
});

test("every feature carries a stable id and Feature type", () => {
  const ids = features.map((f) => f.id);
  for (const f of features) {
    assert.equal(f.type, "Feature");
    assert.equal(typeof f.id, "string");
    assert.ok(f.id.length > 0, "feature id must be non-empty");
  }
  assert.equal(new Set(ids).size, ids.length, "feature ids must be unique");
});

test("every feature has the sidebar schema hotspots.js reads", () => {
  for (const f of features) {
    const p = f.properties;
    assert.ok(p, `${f.id}: missing properties`);
    assert.equal(typeof p.rank, "number", `${f.id}: rank`);
    assert.equal(typeof p.corridor_name, "string", `${f.id}: corridor_name`);
    assert.ok(p.corridor_name.trim().length > 0, `${f.id}: empty corridor_name`);
    assert.equal(typeof p.location_scope, "string", `${f.id}: location_scope`);
    assert.equal(typeof p.ward, "string", `${f.id}: ward`);

    assert.ok(p.severity, `${f.id}: missing severity`);
    for (const k of ["injuries", "major_injuries", "fatalities", "ksi", "crashes"]) {
      assert.equal(typeof p.severity[k], "number", `${f.id}: severity.${k}`);
      assert.ok(p.severity[k] >= 0, `${f.id}: severity.${k} must be >= 0`);
    }

    assert.ok(PRIORITIES.has(p.priority), `${f.id}: bad priority "${p.priority}"`);
    assert.ok(CONFIDENCE.has(p.confidence), `${f.id}: bad confidence "${p.confidence}"`);
  }
});

test("each feature has at least one well-formed recommended intervention", () => {
  // createCorridorCard() shows the first two; each needs a name to render.
  for (const f of features) {
    const fixes = f.properties.recommended_interventions;
    assert.ok(Array.isArray(fixes) && fixes.length > 0, `${f.id}: no interventions`);
    for (const fix of fixes) {
      assert.equal(typeof fix.id, "string", `${f.id}: intervention.id`);
      assert.equal(typeof fix.name, "string", `${f.id}: intervention.name`);
      assert.ok(fix.name.trim().length > 0, `${f.id}: empty intervention name`);
      assert.equal(typeof fix.effect, "string", `${f.id}: intervention.effect`);
    }
  }
});

test("ksi equals fatalities + major_injuries (true killed-or-seriously-injured)", () => {
  for (const f of features) {
    const s = f.properties.severity;
    assert.equal(s.ksi, s.fatalities + s.major_injuries, `${f.id}: ksi != fatalities + major_injuries`);
    // major injuries are a subset of all injuries, and KSI never exceeds all injured + killed
    assert.ok(s.major_injuries <= s.injuries, `${f.id}: major_injuries > injuries`);
    assert.ok(s.ksi <= s.injuries + s.fatalities, `${f.id}: ksi > injuries + fatalities`);
  }
});

test("mode_breakdown, when present, never exceeds total KSI", () => {
  for (const f of features) {
    const m = f.properties.mode_breakdown;
    if (!m) continue;
    const sum =
      (m.pedestrian_ksi || 0) + (m.cyclist_ksi || 0) + (m.driver_ksi || 0) + (m.passenger_ksi || 0);
    assert.ok(sum <= f.properties.severity.ksi, `${f.id}: mode_breakdown sum ${sum} > ksi`);
  }
});

test("geometry is a LineString with >= 2 [lng, lat] points", () => {
  for (const f of features) {
    const g = f.geometry;
    assert.equal(g.type, "LineString", `${f.id}: geometry.type`);
    assert.ok(Array.isArray(g.coordinates) && g.coordinates.length >= 2, `${f.id}: needs >= 2 points`);
    for (const c of g.coordinates) {
      assert.ok(Array.isArray(c) && c.length === 2, `${f.id}: coordinate must be [lng, lat]`);
      assert.ok(Number.isFinite(c[0]) && Number.isFinite(c[1]), `${f.id}: non-numeric coordinate`);
    }
  }
});

test("every coordinate sits inside the DC bounding box (regresses PR5-001)", () => {
  for (const f of features) {
    for (const [lng, lat] of f.geometry.coordinates) {
      assert.ok(
        lng >= DC.lngMin && lng <= DC.lngMax,
        `${f.id}: longitude ${lng} outside DC [${DC.lngMin}, ${DC.lngMax}] — wrong order or quadrant?`,
      );
      assert.ok(
        lat >= DC.latMin && lat <= DC.latMax,
        `${f.id}: latitude ${lat} outside DC [${DC.latMin}, ${DC.latMax}] — wrong order or quadrant?`,
      );
    }
  }
});

test("ranks form a clean 1..N set with no gaps or duplicates", () => {
  const ranks = features.map((f) => f.properties.rank).sort((a, b) => a - b);
  assert.deepEqual(ranks, Array.from({ length: features.length }, (_, i) => i + 1));
});

test("KSI is non-increasing as rank increases (ranking tracks severity)", () => {
  const byRank = [...features].sort((a, b) => a.properties.rank - b.properties.rank);
  for (let i = 1; i < byRank.length; i++) {
    const prev = byRank[i - 1].properties.severity.ksi;
    const cur = byRank[i].properties.severity.ksi;
    assert.ok(cur <= prev, `rank ${i + 1} has higher KSI (${cur}) than rank ${i} (${prev})`);
  }
});
