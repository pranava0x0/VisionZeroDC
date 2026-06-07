const CRASH_LAYER =
  "https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Public_Safety_WebMercator/MapServer/24/query";
const CRASH_DETAILS_TABLE =
  "https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Public_Safety_WebMercator/MapServer/25/query";

const CRASH_OUT_FIELDS = [
  "OBJECTID",
  "CRIMEID",
  "REPORTDATE",
  "ADDRESS",
  "LATITUDE",
  "LONGITUDE",
  "WARD",
  "FATAL_BICYCLIST",
  "FATAL_DRIVER",
  "FATAL_PEDESTRIAN",
  "FATALPASSENGER",
  "FATALOTHER",
  "MAJORINJURIES_BICYCLIST",
  "MAJORINJURIES_DRIVER",
  "MAJORINJURIES_PEDESTRIAN",
  "MAJORINJURIESPASSENGER",
  "MAJORINJURIESOTHER",
  "MINORINJURIES_BICYCLIST",
  "MINORINJURIES_DRIVER",
  "MINORINJURIES_PEDESTRIAN",
  "MINORINJURIESPASSENGER",
  "MINORINJURIESOTHER",
  "TOTAL_VEHICLES",
  "TOTAL_BICYCLES",
  "TOTAL_PEDESTRIANS",
  "SPEEDING_INVOLVED",
  "NEARESTINTSTREETNAME",
].join(",");

const DETAIL_OUT_FIELDS = [
  "CRIMEID",
  "PERSONTYPE",
  "AGE",
  "FATAL",
  "MAJORINJURY",
  "MINORINJURY",
  "INVEHICLETYPE",
  "TICKETISSUED",
  "IMPAIRED",
  "SPEEDING",
].join(",");

const VIOLATION_SOURCES = {
  "2026-01": {
    label: "January 2026",
    url: "https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Violations_Moving_2026/MapServer/0/query",
  },
  "2026-02": {
    label: "February 2026",
    url: "https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Violations_Moving_2026/MapServer/1/query",
  },
  "2025-12": {
    label: "December 2025",
    url: "https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Violations_Moving_2025/MapServer/11/query",
  },
  "2025-11": {
    label: "November 2025",
    url: "https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Violations_Moving_2025/MapServer/10/query",
  },
  "2025-10": {
    label: "October 2025",
    url: "https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Violations_Moving_2025/MapServer/9/query",
  },
};

const VIOLATION_FIELDS = [
  "OBJECTID",
  "LOCATION",
  "ISSUE_DATE",
  "ISSUING_AGENCY_NAME",
  "VIOLATION_CODE",
  "VIOLATION_PROCESS_DESC",
  "FINE_AMOUNT",
  "LATITUDE",
  "LONGITUDE",
].join(",");

const CRASH_PAGE_SIZE = 1000;
const CRASH_DRAW_LIMIT = 5000;
const VIOLATION_PAGE_SIZE = 2000;
const VIOLATION_DRAW_LIMIT = 5000;
const HOTSPOT_QUERY_LIMIT = 160;
const HOTSPOT_DISPLAY_LIMIT = 8;
const DC_BOUNDS = [
  [38.78, -77.13],
  [38.995, -76.91],
];

// Pure crash logic lives in src/crash-logic.js (loaded before this script) so
// it can be unit-tested in Node. See tests/crash-logic.test.mjs.
const {
  FILTER_DEFAULTS,
  FILTER_OPTIONS,
  crashStats,
  severityFor,
  cleanLocationName,
  triageScore,
  parseHotspot,
  formatRate,
  decodeFilters,
  parseView,
  encodeState,
} = window.CrashLogic;

const els = {
  dateRange: document.querySelector("#date-range"),
  severity: document.querySelector("#severity-filter"),
  mode: document.querySelector("#mode-filter"),
  violationsToggle: document.querySelector("#violations-toggle"),
  violationsSource: document.querySelector("#violations-source"),
  refresh: document.querySelector("#refresh-map"),
  mapShell: document.querySelector(".map-shell"),
  notice: document.querySelector("#map-notice"),
  status: document.querySelector("#run-status"),
  visible: document.querySelector("#kpi-visible"),
  total: document.querySelector("#kpi-total"),
  fatal: document.querySelector("#kpi-fatal"),
  major: document.querySelector("#kpi-major"),
  updated: document.querySelector("#kpi-updated"),
  hotspotNote: document.querySelector("#hotspot-note"),
  locationHotspots: document.querySelector("#location-hotspots"),
  wardHotspots: document.querySelector("#ward-hotspots"),
  detailTitle: document.querySelector("#detail-title"),
  docketStamp: document.querySelector("#docket-stamp"),
  detailBody: document.querySelector("#detail-body"),
  wardRatesNote: document.querySelector("#ward-rates-note"),
  wardRatesSort: document.querySelector("#ward-rates-sort"),
  wardRatesBody: document.querySelector("#ward-rates-body"),
  wardRatesCaveat: document.querySelector("#ward-rates-caveat"),
  ksiToggle: document.querySelector("#ksi-toggle"),
};

const state = {
  crashAbort: null,
  violationsAbort: null,
  loadingCrashes: false,
  drawnCrashes: [],
  hotspots: {
    locations: [],
    wards: [],
  },
  summary: null,
};

// --- Shareable URL state (filters + map view) -----------------------------
// Filters and map bounds are mirrored into the query string so a view can be
// linked and restored. Defaults are omitted to keep shared URLs short.

function applyUrlState() {
  const f = decodeFilters(location.search);
  els.dateRange.value = f.date;
  els.severity.value = f.sev;
  els.mode.value = f.mode;
  if (f.vmonth && els.violationsSource.querySelector(`option[value="${CSS.escape(f.vmonth)}"]`)) {
    els.violationsSource.value = f.vmonth;
  }
  if (f.violOn) {
    els.violationsToggle.checked = true;
    document.body.classList.add("violations-visible");
  }
  if (f.ksiOn && els.ksiToggle) els.ksiToggle.checked = true;
}

let urlWriteTimer = null;
function writeUrlState() {
  clearTimeout(urlWriteTimer);
  urlWriteTimer = setTimeout(() => {
    const center = map.getCenter();
    const qs = encodeState({
      date: els.dateRange.value,
      sev: els.severity.value,
      mode: els.mode.value,
      violOn: els.violationsToggle.checked,
      vmonth: els.violationsSource.value,
      ksiOn: els.ksiToggle ? els.ksiToggle.checked : false,
      lat: center.lat,
      lng: center.lng,
      zoom: map.getZoom(),
    });
    history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
  }, 300);
}

applyUrlState();
const initialView = parseView(location.search);

const canvasRenderer = L.canvas({ tolerance: 10 });

const map = L.map("map", {
  renderer: canvasRenderer,
  zoomControl: true,
  maxBounds: DC_BOUNDS,
  maxBoundsViscosity: 0.65,
});
if (initialView) {
  map.setView(initialView.center, initialView.zoom);
} else {
  map.fitBounds(DC_BOUNDS);
}

function settleMapSize() {
  map.invalidateSize();
  if (initialView) {
    map.setView(initialView.center, initialView.zoom, { animate: false });
  } else {
    map.fitBounds(DC_BOUNDS);
  }
}

requestAnimationFrame(settleMapSize);
setTimeout(settleMapSize, 250);

let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => map.invalidateSize(), 150);
});

L.tileLayer("https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
}).addTo(map);

const crashLayer = L.layerGroup().addTo(map);
const violationLayer = L.layerGroup().addTo(map);
const hotspotLayer = L.layerGroup().addTo(map);

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function formatDate(ms) {
  if (!ms) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ms));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function quoteSql(value) {
  return String(value).replace(/'/g, "''");
}

function colorForSeverity(severity) {
  if (severity === "fatal") return css("--severity-fatal");
  if (severity === "major") return css("--severity-major");
  if (severity === "minor") return css("--severity-minor");
  return css("--severity-property");
}

function radiusForSeverity(severity) {
  if (severity === "fatal") return 8;
  if (severity === "major") return 6;
  if (severity === "minor") return 4;
  return 3;
}

function baseWhere() {
  const clauses = [];
  const range = els.dateRange.value;
  if (range !== "all") {
    clauses.push(`REPORTDATE >= DATE '${range}-01-01'`);
  }

  if (els.severity.value === "fatal") {
    clauses.push("(FATAL_BICYCLIST + FATAL_DRIVER + FATAL_PEDESTRIAN + FATALPASSENGER + FATALOTHER) > 0");
  } else if (els.severity.value === "major") {
    clauses.push(
      "((FATAL_BICYCLIST + FATAL_DRIVER + FATAL_PEDESTRIAN + FATALPASSENGER + FATALOTHER) > 0 OR (MAJORINJURIES_BICYCLIST + MAJORINJURIES_DRIVER + MAJORINJURIES_PEDESTRIAN + MAJORINJURIESPASSENGER + MAJORINJURIESOTHER) > 0)"
    );
  } else if (els.severity.value === "injury") {
    clauses.push(
      "((FATAL_BICYCLIST + FATAL_DRIVER + FATAL_PEDESTRIAN + FATALPASSENGER + FATALOTHER + MAJORINJURIES_BICYCLIST + MAJORINJURIES_DRIVER + MAJORINJURIES_PEDESTRIAN + MAJORINJURIESPASSENGER + MAJORINJURIESOTHER + MINORINJURIES_BICYCLIST + MINORINJURIES_DRIVER + MINORINJURIES_PEDESTRIAN + MINORINJURIESPASSENGER + MINORINJURIESOTHER) > 0)"
    );
  }

  if (els.mode.value === "pedestrian") {
    clauses.push("TOTAL_PEDESTRIANS > 0");
  } else if (els.mode.value === "bicycle") {
    clauses.push("TOTAL_BICYCLES > 0");
  } else if (els.mode.value === "speeding") {
    clauses.push("SPEEDING_INVOLVED > 0");
  }

  // C1 — KSI-only: restrict to crashes with a death or major (serious) injury.
  if (els.ksiToggle && els.ksiToggle.checked) {
    clauses.push(
      "((FATAL_BICYCLIST + FATAL_DRIVER + FATAL_PEDESTRIAN + FATALPASSENGER + FATALOTHER) > 0 OR (MAJORINJURIES_BICYCLIST + MAJORINJURIES_DRIVER + MAJORINJURIES_PEDESTRIAN + MAJORINJURIESPASSENGER + MAJORINJURIESOTHER) > 0)"
    );
  }

  return clauses.length ? clauses.join(" AND ") : "1=1";
}

function boundsParams(params) {
  const bounds = map.getBounds();
  const west = bounds.getWest();
  const south = bounds.getSouth();
  const east = bounds.getEast();
  const north = bounds.getNorth();
  params.set("geometry", `${west},${south},${east},${north}`);
  params.set("geometryType", "esriGeometryEnvelope");
  params.set("inSR", "4326");
  params.set("spatialRel", "esriSpatialRelIntersects");
}

function hotspotStatistics() {
  return JSON.stringify([
    { statisticType: "count", onStatisticField: "OBJECTID", outStatisticFieldName: "CRASH_COUNT" },
    {
      statisticType: "sum",
      onStatisticField: "FATAL_BICYCLIST + FATAL_DRIVER + FATAL_PEDESTRIAN + FATALPASSENGER + FATALOTHER",
      outStatisticFieldName: "FATAL_COUNT",
    },
    {
      statisticType: "sum",
      onStatisticField:
        "MAJORINJURIES_BICYCLIST + MAJORINJURIES_DRIVER + MAJORINJURIES_PEDESTRIAN + MAJORINJURIESPASSENGER + MAJORINJURIESOTHER",
      outStatisticFieldName: "MAJOR_COUNT",
    },
    {
      statisticType: "sum",
      onStatisticField:
        "MINORINJURIES_BICYCLIST + MINORINJURIES_DRIVER + MINORINJURIES_PEDESTRIAN + MINORINJURIESPASSENGER + MINORINJURIESOTHER",
      outStatisticFieldName: "MINOR_COUNT",
    },
    { statisticType: "sum", onStatisticField: "TOTAL_PEDESTRIANS", outStatisticFieldName: "PEDESTRIAN_COUNT" },
    { statisticType: "sum", onStatisticField: "TOTAL_BICYCLES", outStatisticFieldName: "BICYCLE_COUNT" },
    { statisticType: "sum", onStatisticField: "SPEEDING_INVOLVED", outStatisticFieldName: "SPEEDING_COUNT" },
    { statisticType: "avg", onStatisticField: "LATITUDE", outStatisticFieldName: "AVG_LATITUDE" },
    { statisticType: "avg", onStatisticField: "LONGITUDE", outStatisticFieldName: "AVG_LONGITUDE" },
  ]);
}

function scopedWhere(where, extraClause) {
  return extraClause ? `(${where}) AND (${extraClause})` : where;
}

async function queryJson(url, params, signal) {
  const response = await fetch(`${url}?${params.toString()}`, { signal });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  const json = await response.json();
  if (json.error) throw new Error(json.error.message || "ArcGIS query error");
  return json;
}

async function loadCrashCount(where, signal) {
  const params = new URLSearchParams({
    where,
    returnCountOnly: "true",
    f: "json",
  });
  boundsParams(params);
  const json = await queryJson(CRASH_LAYER, params, signal);
  return json.count || 0;
}

async function loadCrashPage(where, offset, signal) {
  const params = new URLSearchParams({
    where,
    outFields: CRASH_OUT_FIELDS,
    returnGeometry: "true",
    outSR: "4326",
    orderByFields: "OBJECTID",
    resultOffset: String(offset),
    resultRecordCount: String(CRASH_PAGE_SIZE),
    f: "geojson",
  });
  boundsParams(params);
  const response = await fetch(`${CRASH_LAYER}?${params.toString()}`, { signal });
  if (!response.ok) throw new Error(`Crash request failed: ${response.status}`);
  const json = await response.json();
  if (json.error) throw new Error(json.error.message || "Crash query error");
  return json.features || [];
}

async function loadGroupedHotspots(where, groupByFields, extraWhere, signal) {
  const params = new URLSearchParams({
    where: scopedWhere(where, extraWhere),
    outStatistics: hotspotStatistics(),
    groupByFieldsForStatistics: groupByFields,
    orderByFields: "CRASH_COUNT DESC",
    resultRecordCount: String(HOTSPOT_QUERY_LIMIT),
    returnGeometry: "false",
    f: "json",
  });
  boundsParams(params);
  const json = await queryJson(CRASH_LAYER, params, signal);
  return json.features || [];
}

function renderHotspotLoading() {
  state.hotspots = { locations: [], wards: [] };
  els.hotspotNote.textContent = "Ranking locations and wards from the current map filters...";
  els.locationHotspots.innerHTML = "<li>Loading location statistics...</li>";
  els.wardHotspots.innerHTML = "<li>Loading ward statistics...</li>";
}

function hotspotMeta(item) {
  const severe = item.fatalities + item.major;
  const vulnerable = item.pedestrians + item.bicycles;
  const parts = [
    `${formatNumber(item.crashes)} crashes`,
    `${formatNumber(severe)} fatal/major injuries`,
    `${formatNumber(vulnerable)} walking/biking involved`,
    `${formatNumber(Math.round(item.score))} score`,
  ];
  if (item.kind !== "ward") parts.unshift(item.ward);
  return parts.join(" | ");
}

function hotspotListItem(item, index, kind) {
  return `
    <li>
      <button class="hotspot-button" type="button" data-hotspot-kind="${kind}" data-hotspot-index="${index}">
        <span class="hotspot-rank">${index + 1}</span>
        <span class="hotspot-title">${escapeHtml(item.location)}</span>
        <span class="hotspot-meta">${escapeHtml(hotspotMeta(item))}</span>
      </button>
    </li>
  `;
}

function renderHotspotList(element, items, kind) {
  if (!items.length) {
    element.innerHTML = "<li>No grouped crash statistics returned for this view.</li>";
    return;
  }
  element.innerHTML = items.map((item, index) => hotspotListItem(item, index, kind)).join("");
}

function renderHotspots(locations, wards, total) {
  state.hotspots = { locations, wards };
  els.hotspotNote.innerHTML = `
    Severity-weighted triage ranking from all ${escapeHtml(formatNumber(total))} matching crash records in the current map view.
    Score weights crashes, fatal/major injuries, vulnerable road users, and speeding flags; it is a screening aid, not an official DDOT ranking.
  `;
  renderHotspotList(els.locationHotspots, locations, "locations");
  renderHotspotList(els.wardHotspots, wards, "wards");
}

async function loadHotspots(where, total, signal) {
  const validWard = "WARD IS NOT NULL AND WARD <> 'Null'";
  const validAddress = "ADDRESS IS NOT NULL AND ADDRESS <> 'Route not found'";

  try {
    const [locationRows, wardRows] = await Promise.all([
      loadGroupedHotspots(where, "ADDRESS,WARD", `${validWard} AND ${validAddress}`, signal),
      loadGroupedHotspots(where, "WARD", validWard, signal),
    ]);

    const locations = locationRows
      .map((feature) => parseHotspot(feature, "location"))
      .filter((item) => item.location && Number.isFinite(item.lat) && Number.isFinite(item.lon))
      .sort((a, b) => b.score - a.score || b.crashes - a.crashes)
      .slice(0, HOTSPOT_DISPLAY_LIMIT);
    const wards = wardRows
      .map((feature) => parseHotspot(feature, "ward"))
      .filter((item) => item.ward !== "Ward not available" && Number.isFinite(item.lat) && Number.isFinite(item.lon))
      .sort((a, b) => b.score - a.score || b.crashes - a.crashes)
      .slice(0, HOTSPOT_DISPLAY_LIMIT);

    renderHotspots(locations, wards, total);
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error(error);
      els.hotspotNote.textContent = `Could not load hotspot statistics: ${error.message}`;
      els.locationHotspots.innerHTML = "<li>Hotspot query failed.</li>";
      els.wardHotspots.innerHTML = "<li>Ward query failed.</li>";
    }
  }
}

function zoomToHotspot(item) {
  if (!item || !Number.isFinite(item.lat) || !Number.isFinite(item.lon)) return;

  const isWard = item.kind === "ward";
  const radius = isWard ? 1800 : 260;
  const zoom = isWard ? 13 : 16;
  hotspotLayer.clearLayers();

  const focus = L.circle([item.lat, item.lon], {
    radius,
    color: css("--accent"),
    fillColor: css("--accent"),
    fillOpacity: isWard ? 0.06 : 0.08,
    opacity: 0.9,
    weight: 2,
  });

  focus.bindPopup(`
    <strong class="popup-title">${escapeHtml(item.location)}</strong>
    <div>${escapeHtml(item.ward)}</div>
    <div>${formatNumber(item.crashes)} crashes; ${formatNumber(item.fatalities + item.major)} fatal/major injuries</div>
  `);
  focus.addTo(hotspotLayer);
  map.setView([item.lat, item.lon], zoom);
  focus.openPopup();
  if (els.mapShell && window.matchMedia("(max-width: 960px)").matches) {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    els.mapShell.scrollIntoView({ behavior, block: "start" });
  }
}

function setNotice(message) {
  els.notice.textContent = message;
  els.status.textContent = message;
}

function addCrashFeature(feature) {
  const props = feature.properties || {};
  const coords = feature.geometry && feature.geometry.coordinates;
  if (!coords || coords.length < 2) return null;

  const severity = severityFor(props);
  const stats = crashStats(props);
  const marker = L.circleMarker([coords[1], coords[0]], {
    radius: radiusForSeverity(severity),
    color: colorForSeverity(severity),
    fillColor: colorForSeverity(severity),
    fillOpacity: severity === "property" ? 0.38 : 0.72,
    opacity: 0.86,
    weight: severity === "fatal" ? 2 : 1,
  });

  const title = props.ADDRESS || props.NEARESTINTSTREETNAME || "Crash location";
  marker.bindPopup(`
    <strong class="popup-title">${escapeHtml(title)}</strong>
    <div>${escapeHtml(formatDate(props.REPORTDATE))}</div>
    <div>${escapeHtml(props.WARD || "Ward not available")}</div>
    <div>${stats.fatalities} fatal / ${stats.major} major / ${stats.minor} minor injuries</div>
  `);
  marker.on("click", () => selectCrash(props));
  marker.addTo(crashLayer);
  state.drawnCrashes.push({
    latlng: L.latLng(coords[1], coords[0]),
    props,
  });
  return { severity, reportDate: props.REPORTDATE || 0 };
}

async function loadCrashes() {
  if (state.crashAbort) state.crashAbort.abort();
  state.crashAbort = new AbortController();
  const { signal } = state.crashAbort;
  state.loadingCrashes = true;
  crashLayer.clearLayers();
  state.drawnCrashes = [];

  const where = baseWhere();
  setNotice("Loading crash records from Open Data DC...");
  els.visible.textContent = "-";
  els.total.textContent = "-";
  els.fatal.textContent = "-";
  els.major.textContent = "-";
  els.updated.textContent = "-";
  renderHotspotLoading();

  try {
    const total = await loadCrashCount(where, signal);
    els.total.textContent = formatNumber(total);
    loadHotspots(where, total, signal);
    const drawTarget = Math.min(total, CRASH_DRAW_LIMIT);
    const summaries = [];
    let loaded = 0;

    while (loaded < drawTarget) {
      const page = await loadCrashPage(where, loaded, signal);
      if (!page.length) break;
      for (const feature of page) {
        const summary = addCrashFeature(feature);
        if (summary) summaries.push(summary);
      }
      loaded += page.length;
      els.visible.textContent = formatNumber(summaries.length);
      setNotice(`Loaded ${formatNumber(Math.min(loaded, drawTarget))} of ${formatNumber(total)} matching crashes in the current map view.`);
      if (page.length < CRASH_PAGE_SIZE) break;
    }

    const fatalCount = summaries.filter((item) => item.severity === "fatal").length;
    const majorCount = summaries.filter((item) => item.severity === "major").length;
    const latest = summaries.reduce((max, item) => Math.max(max, item.reportDate), 0);

    els.visible.textContent = formatNumber(summaries.length);
    els.fatal.textContent = formatNumber(fatalCount);
    els.major.textContent = formatNumber(majorCount);
    els.updated.textContent = latest ? formatDate(latest) : "N/A";

    if (total > summaries.length) {
      setNotice(
        `Showing ${formatNumber(summaries.length)} of ${formatNumber(total)} matching crashes in this view. Zoom in, change filters, or use a shorter date range to draw every matching point.`
      );
    } else {
      setNotice(`Showing all ${formatNumber(summaries.length)} matching crashes in this view.`);
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error(error);
      setNotice(`Could not load crash data: ${error.message}`);
    }
  } finally {
    state.loadingCrashes = false;
  }
}

function detailRows(rows) {
  if (!rows.length) return "<p>No related Crash Details rows returned for this CRASHID.</p>";
  const body = rows
    .map((row) => {
      const a = row.attributes || {};
      const injury = a.FATAL === "Y" ? "Fatal" : a.MAJORINJURY === "Y" ? "Major" : a.MINORINJURY === "Y" ? "Minor" : "-";
      return `
        <tr>
          <td>${escapeHtml(a.PERSONTYPE || "-")}</td>
          <td>${escapeHtml(a.INVEHICLETYPE || "-")}</td>
          <td>${escapeHtml(injury)}</td>
          <td>${escapeHtml(a.TICKETISSUED || "-")}</td>
          <td>${escapeHtml(a.SPEEDING || "-")}</td>
        </tr>
      `;
    })
    .join("");
  return `
    <table class="details-table">
      <thead>
        <tr>
          <th>Person</th>
          <th>Vehicle / mode</th>
          <th>Injury</th>
          <th>Ticket</th>
          <th>Speed</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

async function selectCrash(props) {
  const stats = crashStats(props);
  const severity = severityFor(props);
  const crashId = props.CRIMEID;
  
  els.detailTitle.textContent = props.ADDRESS || props.NEARESTINTSTREETNAME || "Crash location";
  
  // Update docket stamp
  els.docketStamp.className = `docket-stamp ${severity}`;
  let stampText = "PROPERTY DAMAGE";
  if (severity === "fatal") stampText = "FATAL COLLISION";
  else if (severity === "major") stampText = "MAJOR INJURY";
  else if (severity === "minor") stampText = "MINOR INJURY";
  els.docketStamp.textContent = stampText;

  els.detailBody.innerHTML = `
    <div class="docket-status-pills">
      ${props.SPEEDING_INVOLVED > 0 ? '<span class="status-pill speeding">speeding involved</span>' : ""}
      ${props.TOTAL_PEDESTRIANS > 0 ? '<span class="status-pill ped-involved">pedestrian involved</span>' : ""}
      ${props.TOTAL_BICYCLES > 0 ? '<span class="status-pill bike-involved">cyclist involved</span>' : ""}
    </div>
    <div class="docket-details">
      <div class="docket-row"><span class="label">CRASHID</span><span class="value">${escapeHtml(crashId || "Not available")}</span></div>
      <div class="docket-row"><span class="label">Date</span><span class="value">${escapeHtml(formatDate(props.REPORTDATE))}</span></div>
      <div class="docket-row"><span class="label">Ward</span><span class="value">${escapeHtml(props.WARD || "Not available")}</span></div>
      <div class="docket-row"><span class="label">Nearest Street</span><span class="value">${escapeHtml(props.NEARESTINTSTREETNAME || "Not available")}</span></div>
      <div class="docket-row"><span class="label">Fatalities</span><span class="value">${stats.fatalities}</span></div>
      <div class="docket-row"><span class="label">Major Injuries</span><span class="value">${stats.major}</span></div>
      <div class="docket-row"><span class="label">Minor Injuries</span><span class="value">${stats.minor}</span></div>
      <div class="docket-row"><span class="label">Vehicles</span><span class="value">${escapeHtml(props.TOTAL_VEHICLES ?? "Not available")}</span></div>
      <div class="docket-row"><span class="label">People Walking</span><span class="value">${escapeHtml(props.TOTAL_PEDESTRIANS ?? "Not available")}</span></div>
      <div class="docket-row"><span class="label">Bicycles</span><span class="value">${escapeHtml(props.TOTAL_BICYCLES ?? "Not available")}</span></div>
    </div>
    <div class="docket-details-separator"></div>
    <div id="docket-details-rows-section">
      <p class="docket-loader">Loading related Crash Details rows...</p>
    </div>
  `;

  if (!crashId) return;

  const params = new URLSearchParams({
    where: `CRIMEID='${quoteSql(crashId)}'`,
    outFields: DETAIL_OUT_FIELDS,
    orderByFields: "OBJECTID",
    f: "json",
  });

  try {
    const json = await queryJson(CRASH_DETAILS_TABLE, params);
    const rowsSection = document.getElementById("docket-details-rows-section");
    if (rowsSection) {
      rowsSection.innerHTML = `<h3 class="section-label">Crash Details Rows</h3>${detailRows(json.features || [])}`;
    }
  } catch (error) {
    console.error(error);
    const rowsSection = document.getElementById("docket-details-rows-section");
    if (rowsSection) {
      rowsSection.innerHTML = `<p class="docket-error">Could not load Crash Details rows: ${escapeHtml(error.message)}</p>`;
    }
  }
}

function violationWhere() {
  const bounds = map.getBounds();
  return [
    "LATITUDE IS NOT NULL",
    "LONGITUDE IS NOT NULL",
    `LATITUDE >= ${bounds.getSouth()}`,
    `LATITUDE <= ${bounds.getNorth()}`,
    `LONGITUDE >= ${bounds.getWest()}`,
    `LONGITUDE <= ${bounds.getEast()}`,
  ].join(" AND ");
}

async function loadViolations() {
  if (state.violationsAbort) state.violationsAbort.abort();
  violationLayer.clearLayers();

  if (!els.violationsToggle.checked) return;

  state.violationsAbort = new AbortController();
  const { signal } = state.violationsAbort;
  const source = VIOLATION_SOURCES[els.violationsSource.value];
  if (!source) return;

  setNotice(`Loading moving violations for ${source.label} in the current map view...`);
  try {
    let loaded = 0;
    while (loaded < VIOLATION_DRAW_LIMIT) {
      const params = new URLSearchParams({
        where: violationWhere(),
        outFields: VIOLATION_FIELDS,
        orderByFields: "OBJECTID",
        resultOffset: String(loaded),
        resultRecordCount: String(VIOLATION_PAGE_SIZE),
        f: "json",
      });
      const json = await queryJson(source.url, params, signal);
      const rows = json.features || [];
      if (!rows.length) break;
      for (const row of rows) addViolation(row.attributes || {});
      loaded += rows.length;
      if (rows.length < VIOLATION_PAGE_SIZE) break;
    }
    setNotice(`Added ${formatNumber(Math.min(loaded, VIOLATION_DRAW_LIMIT))} moving violations for ${source.label} as context.`);
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error(error);
      setNotice(`Could not load moving violations: ${error.message}`);
    }
  }
}

function addViolation(attrs) {
  if (!attrs.LATITUDE || !attrs.LONGITUDE) return;
  const marker = L.circleMarker([attrs.LATITUDE, attrs.LONGITUDE], {
    radius: 2,
    color: css("--link"),
    fillColor: css("--link"),
    fillOpacity: 0.28,
    opacity: 0.5,
    weight: 1,
  });
  marker.bindPopup(`
    <strong class="popup-title">${escapeHtml(attrs.VIOLATION_PROCESS_DESC || "Moving violation")}</strong>
    <div>${escapeHtml(formatDate(attrs.ISSUE_DATE))}</div>
    <div>${escapeHtml(attrs.LOCATION || "Location not available")}</div>
    <div>${escapeHtml(attrs.VIOLATION_CODE || "")} ${attrs.FINE_AMOUNT ? `- $${escapeHtml(attrs.FINE_AMOUNT)}` : ""}</div>
  `);
  marker.addTo(violationLayer);
}

function handleHotspotClick(event) {
  const button = event.target.closest("[data-hotspot-kind]");
  if (!button) return;

  const kind = button.dataset.hotspotKind;
  const index = Number(button.dataset.hotspotIndex);
  const item = state.hotspots[kind] && state.hotspots[kind][index];
  zoomToHotspot(item);
}

function selectNearestCrash(event) {
  if (!state.drawnCrashes.length) return;

  const maxDistance = window.matchMedia("(pointer: coarse)").matches ? 28 : 18;
  let nearest = null;
  let nearestDistance = Infinity;

  for (const crash of state.drawnCrashes) {
    const point = map.latLngToContainerPoint(crash.latlng);
    const distance = point.distanceTo(event.containerPoint);
    if (distance < nearestDistance) {
      nearest = crash;
      nearestDistance = distance;
    }
  }

  if (nearest && nearestDistance <= maxDistance) {
    selectCrash(nearest.props);
  }
}

// --- Ward crash rates from the baked snapshot (exposure denominators) ------

function renderWardRates() {
  const summary = state.summary;
  if (!summary) return;
  const win = summary.windows[els.dateRange.value];
  if (!win) return;

  const sortField = els.wardRatesSort.value;
  const rows = win.wards
    .filter((r) => r.ward.startsWith("Ward "))
    .slice()
    .sort((a, b) => (b[sortField] ?? -1) - (a[sortField] ?? -1));

  const lead = (field) => (field === sortField ? " lead" : "");
  els.wardRatesBody.innerHTML = rows
    .map(
      (r) => `<tr>
        <td>${escapeHtml(r.ward)}</td>
        <td class="num${lead("crashes")}">${formatNumber(r.crashes)}</td>
        <td class="num${lead("crashes_per_sq_mi")}">${formatRate(r.crashes_per_sq_mi)}</td>
        <td class="num${lead("crashes_per_100k")}">${formatRate(r.crashes_per_100k)}</td>
      </tr>`
    )
    .join("");

  const captured = summary.captured_at
    ? formatDate(Date.parse(summary.captured_at))
    : "an unknown date";
  els.wardRatesNote.textContent =
    `Baked snapshot for ${win.label}. The date filter applies here; severity and mode filters do not (this table covers all severities and modes).`;
  els.wardRatesCaveat.textContent =
    "Per-area is the more meaningful ward comparison: DC wards are drawn toward equal population, " +
    "so per-capita rates vary little and are easily skewed by commuter-heavy wards. Population is a " +
    `2022 estimate; land area is computed from official ward polygons. Snapshot captured ${captured}.`;
}

async function loadWardRates() {
  if (state.summary) {
    renderWardRates();
    return;
  }
  try {
    const resp = await fetch("data/crash-summary.json", { cache: "no-cache" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    state.summary = await resp.json();
  } catch (err) {
    els.wardRatesNote.textContent =
      "Ward rate snapshot unavailable. Run python3 pipeline/snapshot.py to generate data/crash-summary.json.";
    els.wardRatesBody.innerHTML = '<tr><td colspan="4">No snapshot loaded.</td></tr>';
    return;
  }
  renderWardRates();
}

function refreshAll() {
  writeUrlState();
  renderWardRates();
  loadCrashes();
  loadViolations();
}

let moveTimer = null;
map.on("moveend", () => {
  clearTimeout(moveTimer);
  moveTimer = setTimeout(refreshAll, 250);
});
map.on("click", selectNearestCrash);

els.refresh.addEventListener("click", refreshAll);
els.dateRange.addEventListener("change", refreshAll);
els.severity.addEventListener("change", refreshAll);
els.mode.addEventListener("change", refreshAll);
els.locationHotspots.addEventListener("click", handleHotspotClick);
els.wardHotspots.addEventListener("click", handleHotspotClick);
els.wardRatesSort.addEventListener("change", renderWardRates);
if (els.ksiToggle) els.ksiToggle.addEventListener("change", refreshAll);
els.violationsToggle.addEventListener("change", () => {
  document.body.classList.toggle("violations-visible", els.violationsToggle.checked);
  writeUrlState();
  loadViolations();
});
els.violationsSource.addEventListener("change", () => {
  writeUrlState();
  loadViolations();
});

loadWardRates();
refreshAll();
