/**
 * Landing page (index.html): renders the safety overview from baked data.
 * No map, no Leaflet. Consumes data/crash-summary.json, data/countermeasures.json,
 * and data/recommendations.json. Pure rendering; analysis lives in pipeline/.
 */

const els = {
  band: document.querySelector(".insights-band"),
  scDeaths: document.querySelector("#sc-deaths"),
  scDeathsLabel: document.querySelector("#sc-deaths-label"),
  scKsi: document.querySelector("#sc-ksi"),
  scKsiLabel: document.querySelector("#sc-ksi-label"),
  scContext: document.querySelector("#sc-context"),
  hinHeadline: document.querySelector("#hin-headline"),
  hinContext: document.querySelector("#hin-context"),
  trendChart: document.querySelector("#trend-chart"),
  trendCaption: document.querySelector("#trend-caption"),
  modeShare: document.querySelector("#mode-share"),
  modeCaption: document.querySelector("#mode-caption"),
  recommendations: document.querySelector("#recommendations"),
  countermeasures: document.querySelector("#countermeasures"),
  snapshotStatus: document.querySelector("#snapshot-status"),
};

const fmtNum = (v) => new Intl.NumberFormat("en-US").format(v || 0);
const fmtDate = (ms) =>
  Number.isFinite(ms)
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(ms)
    : "an unknown date";

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function joinWithAnd(items) {
  if (items.length <= 1) return String(items[0] ?? "");
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

// Render a source as an external link only when it's a real http(s) URL; otherwise
// show plain text so a relative path can't open a raw data file in a new tab.
function sourceLink(url, title) {
  const label = esc(title || "source");
  return /^https?:\/\//i.test(url || "")
    ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`
    : `<span class="src-plain">${label}</span>`;
}

// --- A2 scorecard + A1 concentration --------------------------------------

function renderInsights(summary) {
  const sc = summary.scorecard;
  if (!sc) return;
  els.scDeaths.textContent = fmtNum(sc.latest_full_year_fatalities);
  els.scDeathsLabel.textContent = `traffic deaths in ${sc.latest_full_year} (preliminary)`;
  els.scKsi.textContent = fmtNum(sc.latest_full_year_ksi);
  els.scKsiLabel.textContent = `killed or seriously injured, ${sc.latest_full_year} (preliminary)`;
  els.scContext.textContent =
    `DC averaged ${sc.recent_avg_fatalities} deaths a year in ${sc.recent_window[0]}–${sc.recent_window[1]}, ` +
    `reaching ${sc.peak_recent_fatalities} in ${sc.peak_recent_year} — the year it had targeted zero deaths and ` +
    `serious injuries. The ${joinWithAnd(sc.preliminary_years)} counts are preliminary and rise as records are coded. ` +
    `Figures are from open police-reported crash data and may differ from DDOT's curated counts.`;

  const win = summary.windows && summary.windows["2024"];
  if (win) {
    const wards = win.wards
      .filter((w) => w.ward.startsWith("Ward ") && w.population)
      .map((w) => ({ ...w, ksi: w.fatalities + w.major_injuries }));
    const totalKsi = wards.reduce((s, w) => s + w.ksi, 0);
    const totalPop = wards.reduce((s, w) => s + w.population, 0);
    const top = [...wards].sort((a, b) => b.ksi - a.ksi).slice(0, 3);
    if (totalKsi > 0 && totalPop > 0 && top.length === 3) {
      const ksiShare = Math.round((top.reduce((s, w) => s + w.ksi, 0) / totalKsi) * 100);
      const popShare = Math.round((top.reduce((s, w) => s + w.population, 0) / totalPop) * 100);
      const nums = top.map((w) => Number(w.ward.replace("Ward ", ""))).sort((a, b) => a - b);
      els.hinHeadline.innerHTML =
        `Wards ${esc(joinWithAnd(nums))} — three of the District's eight — account for ` +
        `<span class="pct">${ksiShare}%</span> of everyone killed or seriously injured since 2024, ` +
        `while home to ${popShare}% of residents.`;
    }
  }
  els.hinContext.innerHTML =
    "Severe crashes cluster on a small share of streets and corridors. DDOT's " +
    '<a href="https://visionzero.dc.gov/" target="_blank" rel="noopener noreferrer">High Injury Network</a> ' +
    "targets these places for redesign and enforcement. Exact street-segment shares are a planned addition.";

  els.band.hidden = false;
}

// --- A3 trend sparklines ---------------------------------------------------

function sparkline(values, { width = 280, height = 56, preliminary = 0, color = "var(--accent)", label = "Trend" }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const n = values.length;
  const x = (i) => (n === 1 ? 0 : (i / (n - 1)) * (width - 8) + 4);
  const y = (v) => height - 6 - ((v - min) / span) * (height - 12);
  const solidPts = values.slice(0, n - preliminary).map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const dashFrom = Math.max(0, n - preliminary - 1);
  const dashPts = values.slice(dashFrom).map((v, i) => `${x(dashFrom + i).toFixed(1)},${y(v).toFixed(1)}`);
  const dots = values
    .map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2" fill="${color}"/>`)
    .join("");
  const accessibleName = `${label}: from ${values[0]} to ${values[values.length - 1]}, peak ${Math.max(...values)}.`;
  return (
    `<svg class="spark" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(accessibleName)}" preserveAspectRatio="none">` +
    `<title>${esc(accessibleName)}</title>` +
    `<polyline fill="none" stroke="${color}" stroke-width="2" points="${solidPts.join(" ")}"/>` +
    (preliminary > 0
      ? `<polyline fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="3 3" opacity="0.6" points="${dashPts.join(" ")}"/>`
      : "") +
    dots +
    `</svg>`
  );
}

function renderTrend(summary) {
  const years = summary.citywide_by_year || [];
  if (!years.length) {
    els.trendChart.textContent = "Trend data unavailable.";
    return;
  }
  const prelim = (summary.scorecard && summary.scorecard.preliminary_years) || [];
  const prelimCount = years.filter((r) => prelim.includes(r.year)).length;
  const deaths = years.map((r) => r.fatalities);
  const injuries = years.map((r) => r.major_injuries + r.minor_injuries);
  const first = years[0].year;
  const last = years[years.length - 1].year;

  const row = (label, vals, series) => {
    const lastVal = vals[vals.length - 1];
    const peak = Math.max(...vals);
    return (
      `<div class="trend-row">` +
      `<div class="trend-meta"><span class="trend-label">${esc(label)}</span>` +
      `<span class="trend-range">${first}–${last}</span></div>` +
      sparkline(vals, { preliminary: prelimCount, label, color: series === "deaths" ? "var(--severity-fatal)" : "var(--severity-major)" }) +
      `<div class="trend-stats"><strong>${fmtNum(lastVal)}</strong> latest · peak ${fmtNum(peak)}</div>` +
      `</div>`
    );
  };

  els.trendChart.innerHTML = row("Traffic deaths / year", deaths, "deaths") + row("People injured / year", injuries, "injuries");
  els.trendCaption.textContent =
    "Deaths climbed even as reported injuries fell after 2019 — higher speeds on emptier pandemic-era roads drove severity up. " +
    "Dashed segments are preliminary years that rise as records are coded; 2015 major-injury counts in the open data look anomalous.";
}

// --- A4 mode-share ---------------------------------------------------------

const MODE_LABELS = {
  pedestrian: "People walking",
  bicyclist: "People biking",
  driver: "Drivers",
  passenger: "Passengers",
  other: "Other",
};

function renderModeShare(summary) {
  const win = summary.windows && summary.windows["2024"];
  const modes = (win && win.ksi_by_mode) || [];
  if (!modes.length) {
    els.modeShare.textContent = "Mode breakdown unavailable.";
    return;
  }
  const total = modes.reduce((s, m) => s + m.ksi, 0) || 1;
  const max = Math.max(...modes.map((m) => m.ksi), 1);
  els.modeShare.innerHTML = modes
    .map((m) => {
      const pct = Math.round((m.ksi / total) * 100);
      const w = Math.round((m.ksi / max) * 100);
      return (
        `<div class="mode-row${m.vulnerable ? " vulnerable" : ""}">` +
        `<span class="mode-name">${esc(MODE_LABELS[m.mode] || m.mode)}${m.vulnerable ? ' <span class="vru-tag">vulnerable</span>' : ""}</span>` +
        `<span class="mode-bar"><span class="mode-fill" style="width:${w}%"></span></span>` +
        `<span class="mode-val">${fmtNum(m.ksi)} <span class="mode-pct">${pct}%</span></span>` +
        `</div>`
      );
    })
    .join("");
  const vru = modes.filter((m) => m.vulnerable).reduce((s, m) => s + m.ksi, 0);
  const vruPct = Math.round((vru / total) * 100);
  els.modeCaption.textContent =
    `People walking and biking — outside a vehicle's protection — make up ${vruPct}% of those killed or seriously injured since ${win.label.replace("-present", "")}. KSI = killed or seriously (major) injured.`;
}

// --- B1 recommendations + B2 countermeasures -------------------------------

function renderCountermeasures(library) {
  const items = (library && library.countermeasures) || [];
  els.countermeasures.innerHTML = items
    .map(
      (cm) =>
        `<article class="cm-card">` +
        `<div class="cm-head"><h3>${esc(cm.name)}</h3>` +
        `<span class="cm-type">${esc(cm.intervention_type)}</span></div>` +
        `<p class="cm-mech">${esc(cm.mechanism)}</p>` +
        `<p class="cm-effect"><strong>Effect:</strong> ${esc(cm.effect_size)}` +
        (cm.verified ? "" : ' <span class="badge unverified" title="Transcribed from the source; not yet re-verified.">unverified</span>') +
        `</p>` +
        `<p class="cm-src">${sourceLink(cm.source_url, cm.source_title)}</p>` +
        `</article>`
    )
    .join("");
}

function renderRecommendations(recs, library) {
  const items = (recs && recs.recommendations) || [];
  const cmById = {};
  for (const cm of (library && library.countermeasures) || []) cmById[cm.id] = cm;

  els.recommendations.innerHTML = items
    .map((r) => {
      const cms = (r.countermeasure_ids || [])
        .map((id) => cmById[id])
        .filter(Boolean)
        .map((cm) => `<li>${esc(cm.name)}</li>`)
        .join("");
      const evidence = (r.evidence || [])
        .map((e) => `<li>${esc(e.claim)} ${sourceLink(e.source_url, e.source_title)}</li>`)
        .join("");
      const conf = esc(r.confidence || "medium");
      return (
        `<article class="rec-card">` +
        `<div class="rec-head"><h3>${esc(r.title)}</h3>` +
        `<span class="badge conf-${conf}">${conf} confidence</span></div>` +
        `<p class="rec-problem">${esc(r.problem)}</p>` +
        `<p class="rec-line"><span class="rec-key">Where</span> ${esc(r.location_scope)}</p>` +
        `<p class="rec-line"><span class="rec-key">Mechanism</span> ${esc(r.mechanism)}</p>` +
        `<details class="rec-evidence"><summary>Evidence &amp; sources</summary><ul>${evidence}</ul></details>` +
        (cms ? `<p class="rec-key">Proven countermeasures</p><ul class="rec-cms">${cms}</ul>` : "") +
        `<p class="rec-line"><span class="rec-key">Equity check</span> ${esc(r.equity_check)}</p>` +
        `<p class="rec-line uncertainty"><span class="rec-key">Uncertainty</span> ${esc(r.uncertainty)}</p>` +
        (r.map_link
          ? `<p class="rec-actions"><a class="rec-map-link" href="${esc(r.map_link)}">View on the crash map →</a></p>`
          : "") +
        `</article>`
      );
    })
    .join("");
}

// --- snapshot hygiene ------------------------------------------------------

function renderSnapshotStatus(summary) {
  const ms = Date.parse(summary.captured_at);
  const ageDays = Number.isFinite(ms) ? Math.floor((Date.now() - ms) / 86400000) : null;
  const stale = ageDays !== null && ageDays > 45;
  els.snapshotStatus.textContent =
    `Snapshot captured ${fmtDate(ms)}` + (stale ? ` · may be stale (${ageDays} days old)` : "");
  if (stale) els.snapshotStatus.classList.add("stale");
}

// --- boot ------------------------------------------------------------------

async function getJson(url) {
  const resp = await fetch(url, { cache: "no-cache" });
  if (!resp.ok) throw new Error(`${url}: HTTP ${resp.status}`);
  return resp.json();
}

(async function init() {
  let summary;
  try {
    summary = await getJson("data/crash-summary.json");
  } catch (err) {
    els.snapshotStatus.textContent =
      "Snapshot unavailable. Run python3 pipeline/snapshot.py to generate data/crash-summary.json.";
    return;
  }
  renderInsights(summary);
  renderTrend(summary);
  renderModeShare(summary);
  renderSnapshotStatus(summary);

  // Recommendations + countermeasures are independent; degrade gracefully.
  const [library, recs] = await Promise.all([
    getJson("data/countermeasures.json").catch(() => null),
    getJson("data/recommendations.json").catch(() => null),
  ]);
  if (library) renderCountermeasures(library);
  else els.countermeasures.textContent = "Countermeasure library unavailable.";
  if (recs) renderRecommendations(recs, library);
  else els.recommendations.textContent = "Recommendations unavailable.";
})();
