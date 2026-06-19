/**
 * Pure, DOM-free logic for the ANC Safety Brief, shared by anc.js and unit tests.
 *
 * Loaded in the browser via <script src="src/anc-logic.js"> (exposes the global
 * `AncLogic`) and in Node via require() for tests. Keep this file free of DOM,
 * fetch, and Leaflet so it stays testable and reusable.
 *
 * These selectors decide what data a commissioner sees for their ward and what
 * the generated resolution draft asserts, so the editorial caveats are baked into
 * buildDraft() and guarded by tests/. Ward totals come from the ward-grain
 * crash-summary; per-corridor counts come from the crashes↔HIN spatial join
 * (data/hotspots.geojson) — the draft labels each accordingly.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api; // Node / tests
  } else {
    root.AncLogic = api; // browser global
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Recent-window ward row (label like "2024-present"); falls back to all-time.
  // Returns null when the summary has no usable window or the ward is absent.
  function wardRow(summary, n) {
    const windows = summary && summary.windows;
    const win = windows && (windows["2024"] || windows.all);
    if (!win || !Array.isArray(win.wards)) return null;
    const row = win.wards.find((w) => w.ward === `Ward ${n}`);
    return row ? { ...row, _label: win.label || "recent", _since: win.since } : null;
  }

  // Corridors whose `ward` string names Ward n, ordered by rank. The word-boundary
  // match keeps "Ward 7" from also matching "Ward 7" inside a longer number.
  function corridorsForWard(geojson, n) {
    const feats = geojson && Array.isArray(geojson.features) ? geojson.features : [];
    return feats
      .map((f) => f && f.properties)
      .filter((p) => p && typeof p.ward === "string" && new RegExp(`\\bWard ${n}\\b`).test(p.ward))
      .sort((a, b) => (a.rank || 99) - (b.rank || 99));
  }

  // Split recommendations into those that name the ward explicitly and citywide/
  // programmatic ones that also apply. A rec is only counted once (ward wins).
  function recsForWard(recsDoc, n) {
    const all = recsDoc && Array.isArray(recsDoc.recommendations) ? recsDoc.recommendations : [];
    const wardRe = new RegExp(`ward[s]?\\b[^.]*\\b${n}\\b`, "i");
    const cityRe = /citywide|programmatic|network|all dc|district-wide/i;
    const ward = [];
    const citywide = [];
    for (const r of all) {
      const scope = `${r.location_scope || ""} ${r.problem || ""}`;
      if (wardRe.test(scope)) ward.push(r);
      else if (cityRe.test(r.location_scope || "")) citywide.push(r);
    }
    return { ward, citywide };
  }

  // Build the editable resolution draft as plain text. `stats` may be null (no
  // ward snapshot); corridors/groups come from the selectors above. Every figure
  // is tagged with its preliminary/ward-grain provenance.
  function buildDraft(n, stats, corridors, groups) {
    corridors = corridors || [];
    groups = groups || { ward: [], citywide: [] };
    const lines = [];
    lines.push(`DRAFT RESOLUTION — Traffic safety in Ward ${n}`);
    lines.push(`(Advisory Neighborhood Commission ___ , Single-Member District ___)`);
    lines.push("");

    if (stats) {
      lines.push(
        `WHEREAS, open police-reported crash data show approximately ${stats.ksi} people killed or ` +
          `seriously injured and ${stats.fatalities} traffic deaths in Ward ${n} (${stats.label}; figures are ` +
          `preliminary and ward-grain, via Open Data DC's "Crashes in DC");`
      );
      lines.push("");
    }

    if (corridors.length) {
      lines.push(`WHEREAS, the following high-injury corridor(s) run through Ward ${n}:`);
      corridors.forEach((p) => {
        const sev = p.severity || {};
        const bits = [];
        if (Number.isFinite(sev.injuries)) bits.push(`${sev.injuries} injuries`);
        if (Number.isFinite(sev.fatalities)) bits.push(`${sev.fatalities} deaths`);
        const detail = bits.join(", ") + (sev.period ? `, ${sev.period}` : "");
        lines.push(
          `  - ${p.corridor_name}${p.location_scope ? ` (${p.location_scope})` : ""}: ${detail} ` +
            `[crashes within 25 m of the DDOT High Injury Network];`
        );
      });
      lines.push("");
    }

    const recs = groups.ward.length ? groups.ward : groups.citywide;
    if (recs.length) {
      lines.push(`WHEREAS, evidence-backed countermeasures can reduce this harm, including:`);
      recs.slice(0, 4).forEach((r) => {
        lines.push(`  - ${r.title} (evidence confidence: ${r.confidence || "see source"});`);
      });
      lines.push("");
    }

    lines.push(`NOW, THEREFORE, BE IT RESOLVED that the Commission:`);
    let i = 1;
    if (corridors.length) {
      const top = corridors[0];
      const fix = (top.recommended_interventions || [])[0];
      lines.push(
        `  ${i++}. Urges DDOT to prioritize ${top.corridor_name} for safety redesign` +
          (fix ? `, beginning with ${fix.name.toLowerCase()};` : ";")
      );
    }
    if (recs.length) {
      lines.push(
        `  ${i++}. Supports the evidence-backed interventions listed above, led by engineering and ` +
          `speed management rather than enforcement alone;`
      );
    }
    lines.push(`  ${i++}. Requests a DDOT briefing on Vision Zero progress and planned capital projects in Ward ${n};`);
    lines.push(`  ${i++}. Asks that these figures be confirmed against DDOT's curated crash records before final action.`);
    lines.push("");
    lines.push(
      `Sources: "Crashes in DC" and the DDOT High Injury Network (Open Data DC); DC Vision Zero ` +
        `(visionzero.dc.gov). Per-corridor counts are crashes within 25 m of the HIN centerline (2022-present); ` +
        `ward totals are preliminary and ward-grain. Both come from open police-reported data and may differ ` +
        `from DDOT's curated figures.`
    );
    return lines.join("\n");
  }

  return { wardRow, corridorsForWard, recsForWard, buildDraft };
});
