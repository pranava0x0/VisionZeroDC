import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Bills = require("../src/bills-logic.js");
const doc = JSON.parse(readFileSync(new URL("../data/bills.json", import.meta.url), "utf8"));

test("bills data validates and stays separate from enacted law", () => {
  assert.deepEqual(Bills.validateDoc(doc), []);
  // Pending bills must never link the enacted-law domain (that's legislation.json's guard).
  for (const bill of Bills.bills(doc)) {
    assert.ok(!/code\.dccouncil\.gov/.test(bill.lims_url), `${bill.id} must not link code.dccouncil.gov`);
  }
});

test("every unverified bill is badge-gated with a status note", () => {
  for (const bill of Bills.bills(doc)) {
    if (bill.status_verified === false) {
      assert.ok(bill.status_note && bill.status_note.length > 0, `${bill.id} needs a status_note`);
    }
  }
});

test("the flagship insurance-modernization bill is present", () => {
  const ids = Bills.bills(doc).map((b) => b.id);
  assert.ok(ids.includes("b26-0057-insurance-modernization"));
});

test("lineage entries in the tracker carry a law_id; others are verification-flagged", () => {
  const entries = Bills.lineageEntries(doc);
  assert.ok(entries.length >= 6, "lineage should span the multi-year arc");
  for (const entry of entries) {
    if (entry.in_tracker) {
      assert.ok(entry.law_id, `${entry.short_title} in tracker needs a law_id`);
    } else {
      assert.equal(entry.needs_verification, true, `${entry.short_title} not in tracker must be flagged`);
    }
  }
});

test("validator rejects a bill dressed up as enacted law", () => {
  const bad = {
    _provenance: { captured_at: "2026-07-09", caveats: ["x"] },
    bills: [{ id: "x", title: "t", summary: "s", status: "introduced", status_verified: false, status_note: "n", lims_url: "https://code.dccouncil.gov/us/dc/council/laws/26-1" }],
  };
  const errors = Bills.validateDoc(bad);
  assert.ok(errors.some((e) => /code\.dccouncil\.gov/.test(e)));
});

test("validator rejects a non-boolean status_verified", () => {
  const bad = {
    _provenance: { captured_at: "2026-07-09", caveats: ["x"] },
    bills: [{ id: "x", title: "t", summary: "s", status: "introduced", status_verified: "yes", lims_url: "https://lims.dccouncil.gov/x" }],
  };
  assert.ok(Bills.validateDoc(bad).some((e) => /boolean status_verified/.test(e)));
});
