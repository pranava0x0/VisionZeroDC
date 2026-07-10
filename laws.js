(function () {
  "use strict";

  const DATA_URL = "data/legislation.json";
  const BILLS_URL = "data/bills.json";
  const PITCH_URL = "data/pitch-targets.json";
  const logic = window.LawsLogic;
  const billsLogic = window.BillsLogic;
  const pitchLogic = window.PitchTargetsLogic;
  const els = {
    count: document.getElementById("law-count"),
    source: document.getElementById("law-source"),
    filters: document.getElementById("law-filters"),
    grid: document.getElementById("law-grid"),
    caveats: document.getElementById("law-caveats"),
    error: document.getElementById("law-error"),
    lineageNote: document.getElementById("lineage-note"),
    lineageList: document.getElementById("law-lineage-list"),
    billsNote: document.getElementById("bills-note"),
    billsGrid: document.getElementById("bills-grid"),
    pitchNote: document.getElementById("pitch-note"),
    pitchFirst: document.getElementById("pitch-first"),
    pitchTargets: document.getElementById("pitch-targets"),
    pitchCalendar: document.getElementById("pitch-calendar"),
    pitchOpposition: document.getElementById("pitch-opposition"),
  };

  let legislation = null;
  let selectedTag = "all";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderFilters() {
    const tags = logic.allTags(legislation);
    els.filters.innerHTML = [
      `<button type="button" class="law-filter active" data-tag="all" aria-pressed="true">All</button>`,
      ...tags.map((tag) => `<button type="button" class="law-filter" data-tag="${escapeHtml(tag)}" aria-pressed="false">${escapeHtml(tag)}</button>`),
    ].join("");
  }

  function pointerMarkup(pointer) {
    if (!pointer) return "";
    return `
      <div class="law-delivery">
        <p class="law-delivery-label">Track delivery</p>
        <a href="${escapeHtml(pointer.href)}">${escapeHtml(pointer.label)}</a>
        <p>${escapeHtml(pointer.note)}</p>
      </div>
    `;
  }

  function lawCard(law) {
    const date = law.effective_date ? `Effective ${escapeHtml(law.effective_date)}` : "Effective date depends on codified or budget context";
    const requirements = (law.requirements || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    const tags = (law.tags || []).map((tag) => `<span class="law-tag">${escapeHtml(tag)}</span>`).join("");
    return `
      <article class="law-card">
        <div class="law-card-head">
          <div>
            <p class="law-citation">${escapeHtml(law.citation)}</p>
            <h2>${escapeHtml(law.title)}</h2>
          </div>
          <span class="law-status">${escapeHtml(law.status)}</span>
        </div>
        <p class="law-date">${date}</p>
        <p class="law-summary">${escapeHtml(law.summary)}</p>
        <h3>What the law requires</h3>
        <ul>${requirements}</ul>
        ${pointerMarkup(logic.deliveryLead(law))}
        <div class="law-card-foot">
          <a href="${escapeHtml(law.law_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(law.source_title)}</a>
          <div class="law-tags">${tags}</div>
        </div>
      </article>
    `;
  }

  function renderCards() {
    const visible = logic.filterLaws(legislation, selectedTag);
    els.grid.innerHTML = visible.map(lawCard).join("");
    els.count.textContent = `${visible.length} law${visible.length === 1 ? "" : "s"} shown`;
  }

  function wireFilters() {
    els.filters.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-tag]");
      if (!button) return;
      selectedTag = button.dataset.tag || "all";
      els.filters.querySelectorAll("button").forEach((btn) => {
        const active = btn === button;
        btn.classList.toggle("active", active);
        btn.setAttribute("aria-pressed", String(active));
      });
      renderCards();
    });
  }

  function renderCaveats() {
    els.caveats.innerHTML = (legislation.caveats || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  // Render markup built ONLY from escapeHtml()-sanitized values. Uses a parsed
  // fragment rather than assigning a raw string, so no unsanitized HTML is ever
  // injected. Every ${...} in the templates below passes through escapeHtml.
  function setHTML(el, markup) {
    if (!el) return;
    const range = document.createRange();
    el.replaceChildren(range.createContextualFragment(markup));
  }

  function renderLineage(doc) {
    const lineage = doc.lineage || {};
    const entries = billsLogic.lineageEntries(doc);
    if (!entries.length) return;
    els.lineageNote.textContent = lineage.note || "";
    setHTML(els.lineageList, entries
      .map((entry) => {
        const flag = entry.needs_verification
          ? `<span class="unverified-badge" title="Exact citation not yet verified">citation unverified</span>`
          : `<span class="lineage-enacted">tracked</span>`;
        return `
          <li class="lineage-item">
            <span class="lineage-year">${escapeHtml(entry.year)}</span>
            <div>
              <p class="lineage-title">${escapeHtml(entry.short_title)} ${flag}</p>
              <p class="lineage-promise">${escapeHtml(entry.core_promise)}</p>
            </div>
          </li>`;
      })
      .join(""));
  }

  function renderBills(doc) {
    const bills = billsLogic.bills(doc);
    const prov = doc._provenance || {};
    els.billsNote.textContent = `${bills.length} tracked; sourced from DC Council LIMS. Statuses are advocacy-campaign references pending LIMS confirmation. Captured ${prov.captured_at || "n/a"}.`;
    setHTML(els.billsGrid, bills
      .map((bill) => {
        const badge = bill.status_verified
          ? `<span class="bill-status">${escapeHtml(bill.status)}</span>`
          : `<span class="bill-status bill-status-unverified" title="Not yet LIMS-confirmed">${escapeHtml(bill.status)} · unverified</span>`;
        const number = bill.bill_number ? escapeHtml(bill.bill_number) : "Bill number TBD";
        return `
          <article class="bill-card">
            <div class="bill-card-head">
              <p class="bill-number">${number}</p>
              ${badge}
            </div>
            <h3>${escapeHtml(bill.title)}</h3>
            <p class="bill-summary">${escapeHtml(bill.summary)}</p>
            <p class="bill-note">${escapeHtml(bill.status_note || "")}</p>
            <div class="bill-card-foot">
              <a href="${escapeHtml(bill.lims_url)}" target="_blank" rel="noopener noreferrer">Look up in LIMS</a>
              ${bill.campaign_url ? `<a href="${escapeHtml(bill.campaign_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(bill.campaign || "Campaign")}</a>` : ""}
            </div>
          </article>`;
      })
      .join(""));
  }

  function renderPitchTargets(doc) {
    const prov = doc._provenance || {};
    els.pitchNote.textContent = `Named recipients who can act, the channel, and the DC calendar moment. Web-verified ${prov.last_verified || prov.captured_at || "n/a"}; re-check names and URLs before pitching.`;

    const targetsById = {};
    pitchLogic.targets(doc).forEach((t) => { targetsById[t.id] = t; });
    const first = pitchLogic.firstPitch(doc);
    setHTML(els.pitchFirst, first.length
      ? `<h3>First-pitch sequence</h3><ol class="pitch-seq">${first
          .map((step) => {
            const t = targetsById[step.target_id];
            const name = t ? t.name : step.target_id;
            const link = t ? `<a href="${escapeHtml(t.source_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(name)}</a>` : escapeHtml(name);
            return `<li><strong>${link}</strong> — ${escapeHtml(step.why)}</li>`;
          })
          .join("")}</ol>`
      : "");

    const groups = [
      { type: "government", label: "Official / government" },
      { type: "advocacy", label: "Advocacy / coalition (pro-safety)" },
    ];
    setHTML(els.pitchTargets, groups
      .map((group) => {
        const items = pitchLogic.targetsByType(doc, group.type);
        if (!items.length) return "";
        const cards = items
          .map((t) => `
            <article class="pitch-card">
              <div class="pitch-card-head">
                <a class="pitch-name" href="${escapeHtml(t.source_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t.name)}</a>
                <span class="pitch-channels">${(t.channels || []).map(escapeHtml).join(" · ")}</span>
              </div>
              <p class="pitch-role">${escapeHtml(t.role)}</p>
            </article>`)
          .join("");
        return `<div class="pitch-group"><h3>${escapeHtml(group.label)}</h3>${cards}</div>`;
      })
      .join(""));

    setHTML(els.pitchCalendar, pitchLogic.calendarHooks(doc)
      .map((hook) => {
        const src = hook.source_url ? ` <a href="${escapeHtml(hook.source_url)}" target="_blank" rel="noopener noreferrer">source</a>` : "";
        return `<li><strong>${escapeHtml(hook.label)}</strong> — <span class="cal-season">${escapeHtml(hook.season)}</span>. ${escapeHtml(hook.note || "")}${src}</li>`;
      })
      .join(""));

    const opposition = pitchLogic.targetsByType(doc, "opposition")[0];
    if (opposition) {
      setHTML(els.pitchOpposition, `<strong>Know the opposition:</strong> ${escapeHtml(opposition.role)} <a href="${escapeHtml(opposition.source_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(opposition.name)}</a>`);
    }
  }

  async function renderPolicySurfaces() {
    // Non-fatal: a failure here must not blank the law grid.
    try {
      const [billsRes, pitchRes] = await Promise.all([fetch(BILLS_URL), fetch(PITCH_URL)]);
      if (billsRes.ok) {
        const billsDoc = await billsRes.json();
        const billErrors = billsLogic.validateDoc(billsDoc);
        if (billErrors.length) throw new Error(`bills.json: ${billErrors.join("; ")}`);
        renderLineage(billsDoc);
        renderBills(billsDoc);
      }
      if (pitchRes.ok) {
        const pitchDoc = await pitchRes.json();
        const pitchErrors = pitchLogic.validateDoc(pitchDoc);
        if (pitchErrors.length) throw new Error(`pitch-targets.json: ${pitchErrors.join("; ")}`);
        renderPitchTargets(pitchDoc);
      }
    } catch (err) {
      if (els.billsNote) els.billsNote.textContent = `Unable to load policy surfaces: ${err.message}`;
    }
  }

  async function init() {
    try {
      const response = await fetch(DATA_URL);
      if (!response.ok) throw new Error(`Unable to load ${DATA_URL}: ${response.status}`);
      legislation = await response.json();
      const errors = logic.validateDoc(legislation);
      if (errors.length) throw new Error(errors.join("; "));
      els.source.textContent = `Verified against ${legislation.source_title}; captured ${legislation.captured_at}.`;
      renderFilters();
      renderCards();
      renderCaveats();
      wireFilters();
      renderPolicySurfaces();
    } catch (err) {
      els.error.hidden = false;
      els.error.textContent = err.message || "Unable to load legislation data.";
      els.grid.innerHTML = "";
    }
  }

  init();
})();
