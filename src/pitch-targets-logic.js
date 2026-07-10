/**
 * Pure, DOM-free logic for the coalition / pitch-target surface on laws.html.
 *
 * Loaded in the browser via <script src="src/pitch-targets-logic.js"> and in
 * Node via require() for tests. The validator keeps the surface honest: every
 * target carries a source URL, the finding-type and calendar references have to
 * resolve, and the opposition entry is typed so the UI can flag the name
 * collision instead of listing it as an ally.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.PitchTargetsLogic = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const TYPES = ["government", "advocacy", "opposition"];

  function targets(doc) {
    return doc && Array.isArray(doc.targets) ? doc.targets : [];
  }

  function findingTypes(doc) {
    return doc && Array.isArray(doc.finding_types) ? doc.finding_types : [];
  }

  function calendarHooks(doc) {
    return doc && Array.isArray(doc.calendar_hooks) ? doc.calendar_hooks : [];
  }

  function targetsForFinding(doc, findingId) {
    return targets(doc).filter((t) => Array.isArray(t.can_act_on) && t.can_act_on.includes(findingId));
  }

  function targetsByType(doc, type) {
    return targets(doc).filter((t) => t.type === type);
  }

  function firstPitch(doc) {
    const seq = doc && Array.isArray(doc.first_pitch_sequence) ? doc.first_pitch_sequence.slice() : [];
    return seq.sort((a, b) => (a.rank || 0) - (b.rank || 0));
  }

  function calendarHook(doc, id) {
    return calendarHooks(doc).find((hook) => hook.id === id) || null;
  }

  function validateTarget(target, findingIds, hookIds) {
    const errors = [];
    if (!target || typeof target !== "object") return ["target must be an object"];
    const id = target.id || "unknown";
    for (const field of ["id", "name", "type", "role", "source_url"]) {
      if (!target[field] || typeof target[field] !== "string") errors.push(`${id} missing ${field}`);
    }
    if (target.type && !TYPES.includes(target.type)) {
      errors.push(`${id} has unknown type ${target.type}`);
    }
    if (!/^https?:\/\//.test(String(target.source_url || ""))) {
      errors.push(`${id} needs an http(s) source_url`);
    }
    for (const f of target.can_act_on || []) {
      if (!findingIds.has(f)) errors.push(`${id} references unknown finding type ${f}`);
    }
    for (const h of target.calendar_hooks || []) {
      if (!hookIds.has(h)) errors.push(`${id} references unknown calendar hook ${h}`);
    }
    return errors;
  }

  function validateDoc(doc) {
    const errors = [];
    if (!doc || typeof doc !== "object") return ["document must be an object"];
    const prov = doc._provenance || {};
    if (!prov.captured_at) errors.push("missing _provenance.captured_at");
    if (!prov.last_verified) errors.push("missing _provenance.last_verified");

    const findingIds = new Set(findingTypes(doc).map((f) => f.id));
    const hookIds = new Set(calendarHooks(doc).map((h) => h.id));

    const list = targets(doc);
    if (list.length === 0) errors.push("no targets present");
    for (const target of list) errors.push(...validateTarget(target, findingIds, hookIds));

    const ids = list.map((t) => t.id);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (duplicates.length) errors.push(`duplicate target ids: ${Array.from(new Set(duplicates)).join(", ")}`);

    const targetIds = new Set(ids);
    for (const step of doc.first_pitch_sequence || []) {
      if (!targetIds.has(step.target_id)) errors.push(`first_pitch_sequence references unknown target ${step.target_id}`);
    }
    if (!list.some((t) => t.type === "opposition")) {
      errors.push("opposition landscape missing — pitch kits must anticipate documented counter-arguments");
    }
    return errors;
  }

  return {
    targets,
    findingTypes,
    calendarHooks,
    targetsForFinding,
    targetsByType,
    firstPitch,
    calendarHook,
    validateTarget,
    validateDoc,
  };
});
