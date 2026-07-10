/**
 * Pure, DOM-free logic for the Pending & Proposed bills surface and the
 * law-lineage panel on laws.html.
 *
 * Loaded in the browser via <script src="src/bills-logic.js"> and in Node via
 * require() for tests. The validator enforces the separation the plan requires:
 * pending bills are LIMS-sourced and MUST NOT be dressed up as enacted law
 * (that domain, code.dccouncil.gov, belongs to legislation.json). Every bill
 * carries an explicit status_verified flag so the UI can badge unconfirmed
 * statuses instead of asserting them.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.BillsLogic = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function bills(doc) {
    return doc && Array.isArray(doc.bills) ? doc.bills : [];
  }

  function lineageEntries(doc) {
    return doc && doc.lineage && Array.isArray(doc.lineage.entries) ? doc.lineage.entries : [];
  }

  function verifiedCount(doc) {
    return bills(doc).filter((bill) => bill.status_verified === true).length;
  }

  function isEnactedTrackerUrl(url) {
    return /^https:\/\/code\.dccouncil\.gov\//.test(String(url || ""));
  }

  function validateBill(bill) {
    const errors = [];
    if (!bill || typeof bill !== "object") return ["bill must be an object"];
    const id = bill.id || "unknown";
    for (const field of ["id", "title", "summary", "status"]) {
      if (!bill[field] || typeof bill[field] !== "string") errors.push(`${id} missing ${field}`);
    }
    if (typeof bill.status_verified !== "boolean") {
      errors.push(`${id} needs a boolean status_verified`);
    }
    if (!bill.lims_url || typeof bill.lims_url !== "string") {
      errors.push(`${id} needs a lims_url`);
    } else if (isEnactedTrackerUrl(bill.lims_url)) {
      errors.push(`${id} links code.dccouncil.gov — enacted law belongs in legislation.json, not the pending-bills surface`);
    }
    // An unverified status must not be presented as fact: require a status_note explaining what to confirm.
    if (bill.status_verified === false && (!bill.status_note || typeof bill.status_note !== "string")) {
      errors.push(`${id} is unverified and needs a status_note describing what to confirm`);
    }
    return errors;
  }

  function validateLineage(entry) {
    const errors = [];
    if (!entry || typeof entry !== "object") return ["lineage entry must be an object"];
    const label = entry.short_title || "unknown";
    if (typeof entry.year !== "number") errors.push(`${label} lineage entry needs a numeric year`);
    if (!entry.short_title || !entry.core_promise) errors.push(`${label} lineage entry needs short_title and core_promise`);
    if (entry.in_tracker === true && !entry.law_id) {
      errors.push(`${label} is marked in_tracker but has no law_id`);
    }
    if (entry.in_tracker === false && entry.needs_verification !== true) {
      errors.push(`${label} is not in the tracker and must be flagged needs_verification`);
    }
    return errors;
  }

  function validateDoc(doc) {
    const errors = [];
    if (!doc || typeof doc !== "object") return ["document must be an object"];
    const prov = doc._provenance || {};
    if (!prov.captured_at) errors.push("missing _provenance.captured_at");
    if (!Array.isArray(prov.caveats) || prov.caveats.length === 0) errors.push("missing _provenance.caveats");
    const list = bills(doc);
    if (list.length === 0) errors.push("no bills present");
    for (const bill of list) errors.push(...validateBill(bill));
    for (const entry of lineageEntries(doc)) errors.push(...validateLineage(entry));
    const ids = list.map((bill) => bill.id);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (duplicates.length) errors.push(`duplicate bill ids: ${Array.from(new Set(duplicates)).join(", ")}`);
    return errors;
  }

  return { bills, lineageEntries, verifiedCount, validateBill, validateLineage, validateDoc };
});
