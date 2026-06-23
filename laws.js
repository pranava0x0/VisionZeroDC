(function () {
  "use strict";

  const DATA_URL = "data/legislation.json";
  const logic = window.LawsLogic;
  const els = {
    count: document.getElementById("law-count"),
    source: document.getElementById("law-source"),
    filters: document.getElementById("law-filters"),
    grid: document.getElementById("law-grid"),
    caveats: document.getElementById("law-caveats"),
    error: document.getElementById("law-error"),
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
    } catch (err) {
      els.error.hidden = false;
      els.error.textContent = err.message || "Unable to load legislation data.";
      els.grid.innerHTML = "";
    }
  }

  init();
})();
