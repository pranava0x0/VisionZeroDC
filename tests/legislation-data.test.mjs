import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Laws = require("../src/laws-logic.js");
const doc = JSON.parse(readFileSync(new URL("../data/legislation.json", import.meta.url), "utf8"));

test("legislation data has source integrity and no unsupported dollar claims", () => {
  assert.deepEqual(Laws.validateDoc(doc), []);
  assert.equal(doc.source_title, "D.C. Law Library");
  assert.ok(doc.caveats.some((c) => /Dollar figures/.test(c)));
});

test("law tracker includes the verified enacted laws from the campaign sweep", () => {
  const ids = doc.laws.map((law) => law.id).sort();
  assert.deepEqual(ids, [
    "ate-revenue-designation-2022",
    "safer-streets-2022",
    "steer-2024",
    "vision-zero-enhancement-2020",
    "vision-zero-ped-bike-fund",
  ]);
});

test("Vision Zero Omnibus connects the statutory top-15 corridor report to hotspots", () => {
  const law = doc.laws.find((item) => item.id === "vision-zero-enhancement-2020");
  assert.ok(law.requirements.some((item) => /top 15 most dangerous corridors/.test(item)));
  assert.ok(law.delivery_pointers.some((item) => item.href === "hotspots.html"));
});

test("tag filtering is deterministic and case-insensitive", () => {
  assert.ok(Laws.allTags(doc).includes("right on red"));
  assert.deepEqual(
    Laws.filterLaws(doc, "RIGHT ON RED").map((law) => law.id).sort(),
    ["safer-streets-2022", "vision-zero-enhancement-2020"],
  );
  assert.equal(Laws.filterLaws(doc, "all").length, doc.laws.length);
});
