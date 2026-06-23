/**
 * Pure, DOM-free logic for the Safe Streets Law Tracker.
 *
 * Loaded in the browser via <script src="src/laws-logic.js"> and in Node via
 * require() for tests. Keep source/data assertions here so the page cannot drift
 * into unsupported compliance claims.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.LawsLogic = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function laws(doc) {
    return doc && Array.isArray(doc.laws) ? doc.laws : [];
  }

  function normalizeTag(tag) {
    return String(tag || "").trim().toLowerCase();
  }

  function countByStatus(doc) {
    const counts = {};
    for (const law of laws(doc)) {
      const key = law.status || "unknown";
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }

  function allTags(doc) {
    const seen = new Set();
    for (const law of laws(doc)) {
      for (const tag of law.tags || []) {
        const normalized = normalizeTag(tag);
        if (normalized) seen.add(normalized);
      }
    }
    return Array.from(seen).sort();
  }

  function filterLaws(doc, selectedTag) {
    const tag = normalizeTag(selectedTag);
    if (!tag || tag === "all") return laws(doc);
    return laws(doc).filter((law) => (law.tags || []).map(normalizeTag).includes(tag));
  }

  function deliveryLead(law) {
    const pointers = law && Array.isArray(law.delivery_pointers) ? law.delivery_pointers : [];
    return pointers[0] || null;
  }

  function validateLaw(law) {
    const errors = [];
    if (!law || typeof law !== "object") return ["law must be an object"];
    for (const field of ["id", "title", "citation", "status", "law_url", "summary", "source_title"]) {
      if (!law[field] || typeof law[field] !== "string") errors.push(`${law.id || "unknown"} missing ${field}`);
    }
    if (!/^https:\/\/code\.dccouncil\.gov\//.test(law.law_url || "")) {
      errors.push(`${law.id || "unknown"} must link to the D.C. Law Library`);
    }
    if (!Array.isArray(law.requirements) || law.requirements.length === 0) {
      errors.push(`${law.id || "unknown"} needs at least one requirement`);
    }
    if (!Array.isArray(law.delivery_pointers) || law.delivery_pointers.length === 0) {
      errors.push(`${law.id || "unknown"} needs at least one delivery pointer`);
    }
    if (/\$\d/.test(`${law.summary || ""} ${(law.requirements || []).join(" ")}`) && law.id !== "vision-zero-ped-bike-fund") {
      errors.push(`${law.id || "unknown"} contains a dollar claim outside a codified fund`);
    }
    return errors;
  }

  function validateDoc(doc) {
    const errors = [];
    if (!doc || typeof doc !== "object") return ["document must be an object"];
    if (!doc.captured_at) errors.push("missing captured_at");
    if (!Array.isArray(doc.caveats) || doc.caveats.length === 0) errors.push("missing caveats");
    for (const law of laws(doc)) errors.push(...validateLaw(law));
    const ids = laws(doc).map((law) => law.id);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (duplicates.length) errors.push(`duplicate law ids: ${Array.from(new Set(duplicates)).join(", ")}`);
    return errors;
  }

  return { allTags, countByStatus, deliveryLead, filterLaws, validateDoc, validateLaw };
});
