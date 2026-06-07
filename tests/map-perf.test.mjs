/**
 * Performance-guard tests for src/crash-logic.js.
 *
 * The crash map redraws are expensive: every reload runs a count query, a
 * hotspot query, and re-adds up to thousands of canvas markers. Two guards keep
 * that from happening more than necessary:
 *
 *   1. marker popups use { autoPan: false } so clicking a circle never nudges
 *      the map (a nudge would fire `moveend` -> a full reload). That is a
 *      Leaflet option exercised in the browser, not here.
 *   2. `viewUnchanged()` lets a settled `moveend` SKIP the reload ONLY when the
 *      view is genuinely unchanged (a no-op settle). A reload also refreshes
 *      every "current view" summary (KPIs, hotspots, ward/map notes, the
 *      violations overlay), so skipping a *changed* view would leave that UI
 *      stale — these tests pin the guard to no-op settles so it never does.
 *
 * Run: node --test
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const C = require("../src/crash-logic.js");

// A DC-ish loaded extent and the zoom it was loaded at.
const LOADED = { west: -77.12, south: 38.79, east: -76.91, north: 38.99 };
const ZOOM = 13;

// Build viewUnchanged() options, defaulting to "view unchanged since load".
const opts = (over = {}) => ({
  loadedBounds: LOADED,
  loadedZoom: ZOOM,
  currentBounds: LOADED,
  currentZoom: ZOOM,
  ...over,
});

// --- boundsApproxEqual ---------------------------------------------------

test("boundsApproxEqual: identical bounds are equal", () => {
  assert.equal(C.boundsApproxEqual(LOADED, { ...LOADED }), true);
});

test("boundsApproxEqual: sub-epsilon float jitter still counts as equal", () => {
  const jittered = {
    west: LOADED.west + 1e-9,
    south: LOADED.south - 1e-9,
    east: LOADED.east + 1e-9,
    north: LOADED.north - 1e-9,
  };
  assert.equal(C.boundsApproxEqual(LOADED, jittered), true);
});

test("boundsApproxEqual: a real difference (any edge) is not equal", () => {
  assert.equal(C.boundsApproxEqual(LOADED, { ...LOADED, west: -77.10 }), false);
  assert.equal(C.boundsApproxEqual(LOADED, { ...LOADED, north: 38.98 }), false);
});

test("boundsApproxEqual: epsilon is configurable", () => {
  const off = { ...LOADED, west: LOADED.west + 0.001 };
  assert.equal(C.boundsApproxEqual(LOADED, off, 1e-7), false);
  assert.equal(C.boundsApproxEqual(LOADED, off, 0.01), true);
});

test("boundsApproxEqual: null inputs are never equal", () => {
  assert.equal(C.boundsApproxEqual(null, LOADED), false);
  assert.equal(C.boundsApproxEqual(LOADED, null), false);
  assert.equal(C.boundsApproxEqual(undefined, undefined), false);
});

// --- viewUnchanged (the reload-skip decision) ----------------------------

test("viewUnchanged: skips reload on a no-op settle (same view, same zoom)", () => {
  assert.equal(C.viewUnchanged(opts()), true);
});

test("viewUnchanged: tolerates sub-epsilon jitter from an animated settle", () => {
  const jittered = { ...LOADED, east: LOADED.east + 1e-9 };
  assert.equal(C.viewUnchanged(opts({ currentBounds: jittered })), true);
});

test("viewUnchanged: forces a reload before anything has loaded (null bounds)", () => {
  assert.equal(C.viewUnchanged(opts({ loadedBounds: null })), false);
  assert.equal(C.viewUnchanged({}), false);
});

test("viewUnchanged: forces a reload on any zoom change (in or out)", () => {
  assert.equal(C.viewUnchanged(opts({ currentZoom: ZOOM + 1 })), false); // zoom in
  assert.equal(C.viewUnchanged(opts({ currentZoom: ZOOM - 1 })), false); // zoom out
});

test("viewUnchanged: forces a reload on a real pan", () => {
  const width = LOADED.east - LOADED.west;
  const panned = {
    west: LOADED.west + width / 2,
    east: LOADED.east + width / 2,
    south: LOADED.south,
    north: LOADED.north,
  };
  assert.equal(C.viewUnchanged(opts({ currentBounds: panned })), false);
});

test("viewUnchanged: a smaller view inside the loaded extent still reloads", () => {
  // The view CHANGED, so KPIs/hotspots/notes/violations must refresh — the
  // guard must NOT treat 'contained' as covered.
  const inside = { west: -77.05, south: 38.85, east: -76.98, north: 38.93 };
  assert.equal(C.viewUnchanged(opts({ currentBounds: inside })), false);
});
