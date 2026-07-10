import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Pitch = require("../src/pitch-targets-logic.js");
const doc = JSON.parse(readFileSync(new URL("../data/pitch-targets.json", import.meta.url), "utf8"));

test("pitch-target data validates with sources and resolvable references", () => {
  assert.deepEqual(Pitch.validateDoc(doc), []);
  for (const target of Pitch.targets(doc)) {
    assert.match(target.source_url, /^https?:\/\//, `${target.id} needs an http(s) source_url`);
  }
});

test("the opposition landscape is present and typed so the UI won't list it as an ally", () => {
  const opp = Pitch.targetsByType(doc, "opposition");
  assert.ok(opp.length >= 1, "opposition landscape required");
  assert.ok(/dcsafestreetscoalition\.org/.test(opp[0].source_url));
  assert.equal(Pitch.targetsForFinding(doc, "warnings").every((t) => t.type !== "opposition"), true);
});

test("finding types route to at least one government or advocacy target", () => {
  for (const f of Pitch.findingTypes(doc)) {
    const acting = Pitch.targetsForFinding(doc, f.id).filter((t) => t.type !== "opposition");
    assert.ok(acting.length >= 1, `no actor can act on finding ${f.id}`);
  }
});

test("first-pitch sequence is ordered and leads with DC Families for Safe Streets", () => {
  const seq = Pitch.firstPitch(doc);
  assert.ok(seq.length >= 1);
  assert.equal(seq[0].target_id, "dc-families-for-safe-streets");
  const ranks = seq.map((s) => s.rank);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
});

test("every target's calendar hooks resolve to a defined hook", () => {
  const hookIds = new Set(Pitch.calendarHooks(doc).map((h) => h.id));
  for (const target of Pitch.targets(doc)) {
    for (const h of target.calendar_hooks || []) {
      assert.ok(hookIds.has(h), `${target.id} references undefined hook ${h}`);
    }
  }
});

test("validator flags an unknown finding-type reference", () => {
  const bad = {
    _provenance: { captured_at: "2026-07-09", last_verified: "2026-07-09" },
    finding_types: [{ id: "warnings", label: "x" }],
    calendar_hooks: [],
    targets: [
      { id: "a", name: "A", type: "government", role: "r", source_url: "https://x.gov", can_act_on: ["nope"] },
      { id: "o", name: "O", type: "opposition", role: "r", source_url: "https://x.org" },
    ],
  };
  assert.ok(Pitch.validateDoc(bad).some((e) => /unknown finding type nope/.test(e)));
});
