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
 *   2. `isViewCovered()` decides whether a settled `moveend` can SKIP the reload
 *      because the view is already fully drawn. That decision is pure and is
 *      what these tests pin down — so a future refactor can't silently make the
 *      map refetch on every pan again.
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

// Build isViewCovered() options, defaulting to "view unchanged since load".
const opts = (over = {}) => ({
  loadedBounds: LOADED,
  loadedZoom: ZOOM,
  currentBounds: LOADED,
  currentZoom: ZOOM,
  ...over,
});

// --- boundsContains ------------------------------------------------------

test("boundsContains: identical bounds are contained", () => {
  assert.equal(C.boundsContains(LOADED, { ...LOADED }), true);
});

test("boundsContains: a strictly smaller inner box is contained", () => {
  const inner = { west: -77.05, south: 38.85, east: -76.98, north: 38.93 };
  assert.equal(C.boundsContains(LOADED, inner), true);
});

test("boundsContains: touching the edge still counts as contained", () => {
  const edge = { ...LOADED, east: LOADED.east }; // shares the east edge exactly
  assert.equal(C.boundsContains(LOADED, edge), true);
});

test("boundsContains: a box past any single edge is not contained", () => {
  assert.equal(C.boundsContains(LOADED, { ...LOADED, west: -77.20 }), false); // off west
  assert.equal(C.boundsContains(LOADED, { ...LOADED, east: -76.80 }), false); // off east
  assert.equal(C.boundsContains(LOADED, { ...LOADED, south: 38.70 }), false); // off south
  assert.equal(C.boundsContains(LOADED, { ...LOADED, north: 39.10 }), false); // off north
});

test("boundsContains: null inputs are never contained", () => {
  assert.equal(C.boundsContains(null, LOADED), false);
  assert.equal(C.boundsContains(LOADED, null), false);
  assert.equal(C.boundsContains(undefined, undefined), false);
});

// --- isViewCovered (the reload-skip decision) ----------------------------

test("isViewCovered: skips reload when the view is unchanged at the same zoom", () => {
  assert.equal(C.isViewCovered(opts()), true);
});

test("isViewCovered: skips reload when panned to a view inside the loaded extent", () => {
  // e.g. zoomed in within an already-loaded extent.
  const inside = { west: -77.05, south: 38.85, east: -76.98, north: 38.93 };
  assert.equal(C.isViewCovered(opts({ currentBounds: inside })), true);
});

test("isViewCovered: forces a reload when nothing complete has loaded (null bounds)", () => {
  // loadedBounds is null after a TRUNCATED load (e.g. dense citywide view), so
  // panning keeps refetching to draw fuller data.
  assert.equal(C.isViewCovered(opts({ loadedBounds: null })), false);
  assert.equal(C.isViewCovered({}), false);
});

test("isViewCovered: forces a reload on any zoom change (in or out)", () => {
  assert.equal(C.isViewCovered(opts({ currentZoom: ZOOM + 1 })), false); // zoom in
  assert.equal(C.isViewCovered(opts({ currentZoom: ZOOM - 1 })), false); // zoom out
});

test("isViewCovered: forces a reload when the view moves outside the loaded extent", () => {
  const outside = { west: -77.30, south: 38.85, east: -77.18, north: 38.93 };
  assert.equal(C.isViewCovered(opts({ currentBounds: outside })), false);
});

test("isViewCovered: a same-zoom pan to a same-size shifted view reloads", () => {
  // Real pans shift a same-size box, so it leaves the loaded extent and must
  // reload. (Identical-bounds moveends — popup autopans, momentum settles — are
  // the case the guard actually saves.)
  const width = LOADED.east - LOADED.west;
  const shifted = {
    west: LOADED.west + width / 2,
    east: LOADED.east + width / 2,
    south: LOADED.south,
    north: LOADED.north,
  };
  assert.equal(C.isViewCovered(opts({ currentBounds: shifted })), false);
});
