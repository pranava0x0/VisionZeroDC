/**
 * Unit tests for src/anc-logic.js (the pure ANC Safety Brief logic shared with anc.js).
 * Zero dependencies — uses Node's built-in test runner.
 *
 * Run: node --test
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const A = require("../src/anc-logic.js");

// --- fixtures --------------------------------------------------------------

const summary = {
  windows: {
    "2024": {
      label: "2024-present",
      since: "2024-01-01",
      wards: [
        { ward: "Ward 7", fatalities: 20, major_injuries: 121, crashes: 6709, ksi_per_100k: 182.04 },
        { ward: "Ward 3", fatalities: 1, major_injuries: 28, crashes: 2431, ksi_per_100k: 35.42 },
        { ward: "Unknown ward", fatalities: 0, major_injuries: 0, crashes: 5, ksi_per_100k: null },
      ],
    },
    all: {
      label: "all available records",
      since: null,
      wards: [{ ward: "Ward 7", fatalities: 148, major_injuries: 600, crashes: 20000, ksi_per_100k: 5475 }],
    },
  },
};

const hotspots = {
  features: [
    { properties: { rank: 2, corridor_name: "South Capitol Street", ward: "Ward 6, Ward 7, Ward 8", severity: { injuries: 412, fatalities: 2, period: "2022-2026" }, recommended_interventions: [{ name: "Protected intersections" }] } },
    { properties: { rank: 1, corridor_name: "New York Avenue NE", ward: "Ward 5, Ward 6, Ward 7", severity: { injuries: 438, fatalities: 3, period: "2022-2026" }, recommended_interventions: [{ name: "Road diet / lane rechannelization" }] } },
    { properties: { rank: 5, corridor_name: "Southern Avenue SE", ward: "Ward 8", severity: { injuries: 200, fatalities: 1, period: "2022-2026" }, recommended_interventions: [] } },
  ],
};

const recsDoc = {
  recommendations: [
    { id: "eor", title: "East-of-river package", location_scope: "Wards 7 and 8 (corridor grain)", problem: "Wards 7 and 8 carry an outsized share.", mechanism: "daylighting", confidence: "medium" },
    { id: "hin", title: "Speed management on the HIN", location_scope: "High Injury Network corridors citywide", problem: "Speed-involved crashes.", mechanism: "road diets", confidence: "medium" },
    { id: "systemic", title: "Scale cheap systemic fixes", location_scope: "Citywide / programmatic", problem: "Rising deaths.", mechanism: "countermeasures", confidence: "medium" },
    { id: "school", title: "Close the crossing-guard gap", location_scope: "All DC schools, prioritized by enrollment", problem: "school zones", mechanism: "guards", confidence: "medium" },
  ],
};

// --- wardRow ---------------------------------------------------------------

test("wardRow returns the recent-window row with label/since attached", () => {
  const row = A.wardRow(summary, 7);
  assert.equal(row.ward, "Ward 7");
  assert.equal(row.fatalities, 20);
  assert.equal(row._label, "2024-present");
  assert.equal(row._since, "2024-01-01");
});

test("wardRow returns null for a ward not present", () => {
  assert.equal(A.wardRow(summary, 1), null);
});

test("wardRow returns null when there is no usable window", () => {
  assert.equal(A.wardRow({}, 7), null);
  assert.equal(A.wardRow({ windows: {} }, 7), null);
  assert.equal(A.wardRow({ windows: { "2024": {} } }, 7), null);
});

test("wardRow falls back to the all-time window when 2024 is absent", () => {
  const row = A.wardRow({ windows: { all: summary.windows.all } }, 7);
  assert.equal(row.fatalities, 148);
  assert.equal(row._label, "all available records");
});

// --- corridorsForWard ------------------------------------------------------

test("corridorsForWard matches the ward and sorts by rank", () => {
  const got = A.corridorsForWard(hotspots, 7);
  assert.deepEqual(got.map((p) => p.corridor_name), ["New York Avenue NE", "South Capitol Street"]);
});

test("corridorsForWard returns only the single-ward corridor for Ward 8 ... and is word-bounded", () => {
  const got = A.corridorsForWard(hotspots, 8);
  assert.deepEqual(got.map((p) => p.corridor_name), ["South Capitol Street", "Southern Avenue SE"]);
  // Ward 5 should NOT match "Ward 5" inside nothing spurious; only NY Ave lists Ward 5.
  assert.deepEqual(A.corridorsForWard(hotspots, 5).map((p) => p.corridor_name), ["New York Avenue NE"]);
});

test("corridorsForWard returns [] for a ward with no corridors and for empty input", () => {
  assert.deepEqual(A.corridorsForWard(hotspots, 3), []);
  assert.deepEqual(A.corridorsForWard({}, 7), []);
  assert.deepEqual(A.corridorsForWard({ features: [] }, 7), []);
});

// --- recsForWard -----------------------------------------------------------

test("recsForWard puts ward-named recs in .ward and citywide ones in .citywide", () => {
  const { ward, citywide } = A.recsForWard(recsDoc, 7);
  assert.deepEqual(ward.map((r) => r.id), ["eor"]);
  // hin (network), systemic (programmatic), school (all dc) are citywide and not ward-7-named
  assert.deepEqual(citywide.map((r) => r.id).sort(), ["hin", "school", "systemic"]);
});

test("recsForWard does not double-count: a ward-named rec is excluded from citywide", () => {
  const { ward, citywide } = A.recsForWard(recsDoc, 8);
  assert.ok(ward.some((r) => r.id === "eor")); // "Wards 7 and 8" names ward 8
  assert.ok(!citywide.some((r) => r.id === "eor"));
});

test("recsForWard handles empty/missing docs", () => {
  assert.deepEqual(A.recsForWard({}, 7), { ward: [], citywide: [] });
  assert.deepEqual(A.recsForWard({ recommendations: [] }, 3), { ward: [], citywide: [] });
});

// --- buildDraft ------------------------------------------------------------

const stats7 = { ksi: 141, fatalities: 20, crashes: 6709, label: "2024-present" };

test("buildDraft includes ward stats, corridors, asks, and the source caveat", () => {
  const corridors = A.corridorsForWard(hotspots, 7);
  const groups = A.recsForWard(recsDoc, 7);
  const draft = A.buildDraft(7, stats7, corridors, groups);
  assert.match(draft, /DRAFT RESOLUTION — Traffic safety in Ward 7/);
  assert.match(draft, /141 people killed or seriously injured and 20 traffic deaths/);
  assert.match(draft, /New York Avenue NE/);
  assert.match(draft, /East-of-river package/);
  // top corridor's first fix drives the first resolved action, lowercased
  assert.match(draft, /prioritize New York Avenue NE for safety redesign, beginning with road diet/);
  // editorial caveats must always be present: HIN-join basis for corridors,
  // ward-grain caveat for ward totals
  assert.match(draft, /crashes within 25 m of the HIN centerline/);
  assert.match(draft, /ward totals are preliminary and ward-grain/);
});

test("buildDraft degrades gracefully with no stats and no corridors (citywide recs only)", () => {
  const groups = A.recsForWard(recsDoc, 3);
  const draft = A.buildDraft(3, null, [], groups);
  assert.ok(!/WHEREAS, open police-reported crash data/.test(draft), "no stats clause when stats is null");
  assert.ok(!/run through Ward 3/.test(draft), "no corridor clause when none match");
  // still resolves and still cites sources
  assert.match(draft, /NOW, THEREFORE, BE IT RESOLVED/);
  assert.match(draft, /Requests a DDOT briefing on Vision Zero progress/);
  assert.match(draft, /Sources: "Crashes in DC"/);
});

test("buildDraft tolerates missing corridors/groups arguments", () => {
  const draft = A.buildDraft(4, null);
  assert.match(draft, /DRAFT RESOLUTION — Traffic safety in Ward 4/);
  assert.match(draft, /NOW, THEREFORE, BE IT RESOLVED/);
});

test("buildDraft caps the cited countermeasures at four", () => {
  const many = { ward: Array.from({ length: 9 }, (_, i) => ({ title: `Rec ${i}`, confidence: "low" })), citywide: [] };
  const draft = A.buildDraft(5, stats7, [], many);
  const whereasRecs = draft.split("\n").filter((l) => /^ {2}- Rec \d/.test(l));
  assert.equal(whereasRecs.length, 4);
});
