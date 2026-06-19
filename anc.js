/**
 * ANC Safety Brief (anc.html): community-led intervention prioritization.
 * Pick a ward; see its crash burden, high-injury corridors, and evidence-backed
 * recommendations, then generate an editable resolution draft to bring to an
 * Advisory Neighborhood Commission. Static and source-grounded: every figure
 * comes from the baked open-data JSON, with its preliminary/ward-grain caveats
 * carried through into the draft. No backend; "Open in email" only opens the
 * user's mail client with a prefilled (un-sent) message.
 */

const els = {
  select: document.querySelector("#anc-ward"),
  brief: document.querySelector("#anc-brief"),
  stats: document.querySelector("#anc-stats"),
  statsNote: document.querySelector("#anc-stats-note"),
  corridors: document.querySelector("#anc-corridors"),
  recs: document.querySelector("#anc-recs"),
  draft: document.querySelector("#anc-draft"),
  copyBtn: document.querySelector("#anc-copy"),
  emailLink: document.querySelector("#anc-email"),
  printBtn: document.querySelector("#anc-print"),
  copyStatus: document.querySelector("#anc-copy-status"),
  error: document.querySelector("#anc-error"),
};

const fmtNum = (v) => new Intl.NumberFormat("en-US").format(v || 0);

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sourceLink(url, title) {
  const label = esc(title || "source");
  return /^https?:\/\//i.test(url || "")
    ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`
    : `<span class="src-plain">${label}</span>`;
}

async function getJson(url) {
  const resp = await fetch(url, { cache: "no-cache" });
  if (!resp.ok) throw new Error(`${url}: HTTP ${resp.status}`);
  return resp.json();
}

// Pure data selectors + draft builder live in src/anc-logic.js (DOM-free, tested).
const { wardRow, corridorsForWardFromHin, recsForWard, buildDraft } = AncLogic;

// How many ward corridors to show before the "show all" disclosure, and how many
// to name in the generated resolution draft (kept short so it stays readable).
const CORRIDORS_VISIBLE = 5;
const CORRIDORS_IN_DRAFT = 5;

// --- rendering -------------------------------------------------------------

function renderStats(row, n) {
  if (!row) {
    els.stats.innerHTML = `<p class="anc-empty">No ward-level snapshot available for Ward ${esc(n)}.</p>`;
    els.statsNote.textContent = "";
    return null;
  }
  const ksi = (row.fatalities || 0) + (row.major_injuries || 0);
  const figures = [
    { num: row.fatalities, label: "traffic deaths", fatal: true },
    { num: ksi, label: "killed or seriously injured" },
    { num: row.crashes, label: "total crashes" },
  ];
  els.stats.innerHTML = figures
    .map(
      (f) =>
        `<div class="anc-figure">` +
        `<strong class="${f.fatal ? "fatal" : ""}">${fmtNum(f.num)}</strong>` +
        `<span>${esc(f.label)}</span>` +
        `</div>`
    )
    .join("");
  const rateBits = [];
  if (Number.isFinite(row.ksi_per_100k) && row.ksi_per_100k != null) {
    rateBits.push(`~${fmtNum(Math.round(row.ksi_per_100k))} KSI per 100,000 residents`);
  }
  els.statsNote.innerHTML =
    `Ward figures, ${esc(row._label)}, from open police-reported crash data (` +
    sourceLink("https://opendata.dc.gov/datasets/DCGIS::crashes-in-dc", "Crashes in DC") +
    `). ` +
    (rateBits.length ? rateBits.join("; ") + ". " : "") +
    `The most recent ~2 years are preliminary and rise as records are coded; per-capita rates use a ` +
    `ward-population estimate (see the data notes), so treat ward-to-ward comparison as approximate.`;
  return { ksi, fatalities: row.fatalities || 0, crashes: row.crashes || 0, label: row._label };
}

function corridorCardHtml(p) {
  const sev = p.severity || {};
  const fixes = (p.recommended_interventions || []).slice(0, 2);
  const ksi = Number.isFinite(sev.ksi) ? sev.ksi : (sev.fatalities || 0) + (sev.major_injuries || 0);
  // Lead with KSI (the ranking basis), then deaths + total injured for context.
  const parts = [`${fmtNum(ksi)} killed/seriously injured`];
  if (Number.isFinite(sev.fatalities)) parts.push(`${fmtNum(sev.fatalities)} deaths`);
  if (Number.isFinite(sev.injuries)) parts.push(`${fmtNum(sev.injuries)} injuries`);
  const sevLine = parts.join(" · ") + (sev.period ? ` (${esc(sev.period)})` : "");
  const priority = esc(p.priority || "");
  const prClass = /urgent/i.test(priority) ? "urgent" : "high";
  return (
    `<article class="anc-corridor">` +
    `<div class="anc-corridor-head">` +
    `<span class="corridor-rank">#${esc(p.rank)}</span>` +
    (priority ? `<span class="corridor-priority ${prClass}">${priority}</span>` : "") +
    `</div>` +
    `<h3 class="corridor-name">${esc(p.corridor_name)}</h3>` +
    (p.location_scope ? `<p class="corridor-scope">${esc(p.location_scope)}</p>` : "") +
    `<p class="corridor-sev">${sevLine}</p>` +
    (fixes.length
      ? `<ul class="anc-fix-list">` +
        fixes.map((f) => `<li>${esc(f.name)}${f.effect ? ` <span class="anc-effect">(${esc(f.effect)})</span>` : ""}</li>`).join("") +
        `</ul>`
      : "") +
    `</article>`
  );
}

function renderCorridors(corridors, n) {
  if (!corridors.length) {
    els.corridors.innerHTML =
      `<p class="anc-empty">No High Injury Network corridors with recorded crashes run through Ward ${esc(n)} in this dataset. ` +
      `That doesn't mean the ward is free of risk — explore block-level patterns on the ` +
      `<a href="map.html">crash map</a>.</p>`;
    return;
  }
  const visible = corridors.slice(0, CORRIDORS_VISIBLE);
  const hidden = corridors.slice(CORRIDORS_VISIBLE);
  let html = `<div class="anc-corridor-grid">${visible.map(corridorCardHtml).join("")}</div>`;
  if (hidden.length) {
    html +=
      `<div class="anc-corridor-grid anc-corridor-more" id="anc-corridor-more" hidden>` +
      hidden.map(corridorCardHtml).join("") +
      `</div>` +
      `<button type="button" class="anc-show-all" id="anc-show-all" aria-expanded="false" aria-controls="anc-corridor-more">` +
      `Show all ${corridors.length} corridors in Ward ${esc(n)}</button>`;
  }
  els.corridors.innerHTML = html;
  if (hidden.length) {
    const btn = document.querySelector("#anc-show-all");
    const more = document.querySelector("#anc-corridor-more");
    btn.addEventListener("click", () => {
      const open = more.hidden;
      more.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      btn.textContent = open
        ? "Show fewer corridors"
        : `Show all ${corridors.length} corridors in Ward ${n}`;
    });
  }
}

function renderRecs(groups, n) {
  const card = (r, citywide) => {
    const conf = esc(r.confidence || "—");
    return (
      `<article class="anc-rec">` +
      (citywide ? `<span class="anc-rec-tag">citywide</span>` : "") +
      `<h3 class="anc-rec-title">${esc(r.title)}</h3>` +
      `<p class="anc-rec-mech">${esc(r.mechanism || r.problem || "")}</p>` +
      `<p class="anc-rec-meta">Confidence: <strong>${conf}</strong>` +
      (r.intervention_type ? ` · ${esc(r.intervention_type)}` : "") +
      `</p>` +
      `</article>`
    );
  };
  const ward = groups.ward.map((r) => card(r, false));
  const city = groups.citywide.map((r) => card(r, true));
  if (!ward.length && !city.length) {
    els.recs.innerHTML = `<p class="anc-empty">No recommendation cards are scoped to Ward ${esc(n)} yet.</p>`;
    return;
  }
  let html = "";
  if (ward.length) html += ward.join("");
  if (city.length) {
    html +=
      `<p class="anc-recs-sub">Citywide measures that also apply in Ward ${esc(n)}:</p>` +
      city.join("");
  }
  els.recs.innerHTML = html;
}

// --- resolution draft ------------------------------------------------------

function wireDraftActions(n) {
  const subject = `Draft resolution: traffic safety in Ward ${n}`;
  const updateMailto = () => {
    els.emailLink.href =
      `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(els.draft.value)}`;
  };
  updateMailto();
  els.draft.oninput = updateMailto;

  els.copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(els.draft.value);
      els.copyStatus.textContent = "Copied to clipboard.";
    } catch {
      els.draft.focus();
      els.draft.select();
      els.copyStatus.textContent = "Press Cmd/Ctrl+C to copy.";
    }
    setTimeout(() => (els.copyStatus.textContent = ""), 3000);
  };

  els.printBtn.onclick = () => window.print();
}

// --- boot ------------------------------------------------------------------

(async function init() {
  let summary, hinDoc, recsDoc;
  try {
    [summary, hinDoc, recsDoc] = await Promise.all([
      getJson("data/crash-summary.json"),
      getJson("data/hin-corridors.json").catch(() => ({ corridors: [] })),
      getJson("data/recommendations.json").catch(() => ({ recommendations: [] })),
    ]);
  } catch (err) {
    els.error.hidden = false;
    els.error.textContent =
      "Snapshot unavailable. Run python3 pipeline/snapshot.py to generate data/crash-summary.json.";
    return;
  }

  function show(n) {
    if (!n) {
      els.brief.hidden = true;
      return;
    }
    const stats = renderStats(wardRow(summary, n), n);
    const corridors = corridorsForWardFromHin(hinDoc, n);
    const groups = recsForWard(recsDoc, n);
    renderCorridors(corridors, n);
    renderRecs(groups, n);
    // The draft names only the top few corridors so the resolution stays readable.
    els.draft.value = buildDraft(n, stats, corridors.slice(0, CORRIDORS_IN_DRAFT), groups);
    wireDraftActions(n);
    els.brief.hidden = false;
  }

  // Deep-link support: anc.html#ward-7
  const fromHash = (location.hash.match(/ward-(\d)/i) || [])[1];
  if (fromHash) els.select.value = fromHash;

  els.select.addEventListener("change", () => {
    const n = els.select.value;
    if (n) history.replaceState(null, "", `#ward-${n}`);
    show(n);
  });

  if (els.select.value) show(els.select.value);
})();
