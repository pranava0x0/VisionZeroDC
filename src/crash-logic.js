/**
 * Pure, DOM-free crash logic shared by the frontend (app.js) and unit tests.
 *
 * Loaded in the browser via <script src="src/crash-logic.js"> (exposes the
 * global `CrashLogic`) and in Node via require() for tests. Keep this file free
 * of DOM, Leaflet, and network access so it stays testable and reusable.
 *
 * The triage-score weights here MUST stay in sync with pipeline/snapshot.py
 * (W_FATAL etc.) and README.md "Hotspot Method". tests/ guard against drift.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api; // Node / tests
  } else {
    root.CrashLogic = api; // browser global
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // --- Filter vocabulary (single source of truth for URL + UI) ------------
  const FILTER_DEFAULTS = { date: "2024", sev: "all", mode: "all" };
  const FILTER_OPTIONS = {
    date: ["2024", "2025", "2026", "all"],
    sev: ["all", "fatal", "major", "injury"],
    mode: ["all", "pedestrian", "bicycle", "speeding"],
  };

  // --- Triage score weights (mirror pipeline/snapshot.py) -----------------
  const TRIAGE_WEIGHTS = {
    crash: 1,
    fatal: 40,
    major: 12,
    minor: 2,
    pedestrian: 2,
    bicycle: 2,
    speeding: 1,
  };

  // --- Crash-record severity math -----------------------------------------
  function num(props, key) {
    return Number((props && props[key]) || 0);
  }

  function crashStats(props) {
    const fatalities =
      num(props, "FATAL_BICYCLIST") +
      num(props, "FATAL_DRIVER") +
      num(props, "FATAL_PEDESTRIAN") +
      num(props, "FATALPASSENGER") +
      num(props, "FATALOTHER");
    const major =
      num(props, "MAJORINJURIES_BICYCLIST") +
      num(props, "MAJORINJURIES_DRIVER") +
      num(props, "MAJORINJURIES_PEDESTRIAN") +
      num(props, "MAJORINJURIESPASSENGER") +
      num(props, "MAJORINJURIESOTHER");
    const minor =
      num(props, "MINORINJURIES_BICYCLIST") +
      num(props, "MINORINJURIES_DRIVER") +
      num(props, "MINORINJURIES_PEDESTRIAN") +
      num(props, "MINORINJURIESPASSENGER") +
      num(props, "MINORINJURIESOTHER");
    return { fatalities, major, minor };
  }

  function severityFor(props) {
    const stats = crashStats(props);
    if (stats.fatalities > 0) return "fatal";
    if (stats.major > 0) return "major";
    if (stats.minor > 0) return "minor";
    return "property";
  }

  // --- Grouped hotspot statistics -----------------------------------------
  function attrNumber(attrs, key) {
    return Number((attrs && (attrs[key] ?? attrs[key.toUpperCase()])) ?? 0);
  }

  function cleanLocationName(value) {
    return String(value || "Location not available")
      .replace(/\s*WASHINGTON,?\s*$/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function triageScore(attrs) {
    const w = TRIAGE_WEIGHTS;
    return (
      attrNumber(attrs, "CRASH_COUNT") * w.crash +
      attrNumber(attrs, "FATAL_COUNT") * w.fatal +
      attrNumber(attrs, "MAJOR_COUNT") * w.major +
      attrNumber(attrs, "MINOR_COUNT") * w.minor +
      attrNumber(attrs, "PEDESTRIAN_COUNT") * w.pedestrian +
      attrNumber(attrs, "BICYCLE_COUNT") * w.bicycle +
      attrNumber(attrs, "SPEEDING_COUNT") * w.speeding
    );
  }

  function parseHotspot(feature, kind) {
    const attrs = (feature && feature.attributes) || {};
    const location =
      kind === "ward"
        ? attrs.WARD || "Ward not available"
        : cleanLocationName(attrs.ADDRESS);
    return {
      kind,
      location,
      ward: attrs.WARD || "Ward not available",
      crashes: attrNumber(attrs, "CRASH_COUNT"),
      fatalities: attrNumber(attrs, "FATAL_COUNT"),
      major: attrNumber(attrs, "MAJOR_COUNT"),
      minor: attrNumber(attrs, "MINOR_COUNT"),
      pedestrians: attrNumber(attrs, "PEDESTRIAN_COUNT"),
      bicycles: attrNumber(attrs, "BICYCLE_COUNT"),
      speeding: attrNumber(attrs, "SPEEDING_COUNT"),
      lat: attrNumber(attrs, "AVG_LATITUDE"),
      lon: attrNumber(attrs, "AVG_LONGITUDE"),
      score: triageScore(attrs),
    };
  }

  // --- Map reload guard (performance) -------------------------------------
  // A crash reload is expensive: a count query, a hotspot query, and redrawing
  // up to thousands of canvas markers. When the settled map view is already
  // fully covered by the last *complete* load (same zoom, and the view sits
  // inside the loaded extent), the reload is skipped. Bounds are plain
  // {west, south, east, north} objects so this stays Leaflet-free and testable.
  function boundsContains(outer, inner) {
    if (!outer || !inner) return false;
    return (
      inner.west >= outer.west &&
      inner.east <= outer.east &&
      inner.south >= outer.south &&
      inner.north <= outer.north
    );
  }

  // Returns true when the current view needs no reload (already drawn).
  // loadedBounds is null after a truncated load, which forces a reload so
  // smaller/denser views can fetch fuller data.
  function isViewCovered({ loadedBounds, loadedZoom, currentBounds, currentZoom } = {}) {
    if (!loadedBounds) return false;
    if (currentZoom !== loadedZoom) return false;
    return boundsContains(loadedBounds, currentBounds);
  }

  // --- Display helpers -----------------------------------------------------
  function formatRate(value) {
    if (value === null || value === undefined) return "n/a";
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: value >= 100 ? 0 : 1,
    }).format(value);
  }

  // --- Shareable URL state (pure encode/decode) ---------------------------
  function decodeFilters(search) {
    const p = new URLSearchParams(search || "");
    const pick = (key) => {
      const v = p.get(key);
      return v && FILTER_OPTIONS[key].includes(v) ? v : FILTER_DEFAULTS[key];
    };
    return {
      date: pick("date"),
      sev: pick("sev"),
      mode: pick("mode"),
      violOn: p.get("viol") === "1",
      vmonth: p.get("vmonth") || null,
      ksiOn: p.get("ksi") === "1",
    };
  }

  function parseView(search) {
    const p = new URLSearchParams(search || "");
    const center = p.get("c");
    const zoom = p.get("z");
    if (!center || !zoom) return null;
    const parts = center.split(",").map(Number);
    const z = Number(zoom);
    if (parts.length !== 2 || !parts.every(Number.isFinite) || !Number.isFinite(z)) {
      return null;
    }
    return { center: [parts[0], parts[1]], zoom: z };
  }

  function encodeState(s) {
    const p = new URLSearchParams();
    if (s.date && s.date !== FILTER_DEFAULTS.date) p.set("date", s.date);
    if (s.sev && s.sev !== FILTER_DEFAULTS.sev) p.set("sev", s.sev);
    if (s.mode && s.mode !== FILTER_DEFAULTS.mode) p.set("mode", s.mode);
    if (s.violOn) {
      p.set("viol", "1");
      if (s.vmonth) p.set("vmonth", s.vmonth);
    }
    if (s.ksiOn) p.set("ksi", "1");
    if (Number.isFinite(s.lat) && Number.isFinite(s.lng)) {
      p.set("c", `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`);
    }
    if (Number.isFinite(s.zoom)) p.set("z", String(s.zoom));
    return p.toString();
  }

  return {
    FILTER_DEFAULTS,
    FILTER_OPTIONS,
    TRIAGE_WEIGHTS,
    num,
    crashStats,
    severityFor,
    attrNumber,
    cleanLocationName,
    triageScore,
    parseHotspot,
    boundsContains,
    isViewCovered,
    formatRate,
    decodeFilters,
    parseView,
    encodeState,
  };
});
