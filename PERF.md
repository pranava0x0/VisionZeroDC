# PERF.md — Performance baseline & budget (Workstream B)

> Started 2026-07-09 as the deliverable for PLAN.md Milestone M1.
> The goal is measurement, not vibes: an honest baseline, a stated budget per
> page, and a responsive-defect log. Field Lighthouse scores are captured
> separately (see "How to capture Lighthouse" below); this file records what was
> measured in-repo and via the local responsive sweep.

---

## What was measured in this pass

- **Static asset weight** (bytes on disk, uncompressed — GitHub Pages serves these
  gzipped/brotli, so wire size is smaller).
- **Responsive sweep** at 375 px (mobile), 768 px (tablet), 1280 px (desktop)
  against a local `python3 -m http.server` instance, checking every page for
  page-level horizontal overflow and per-element viewport escapes.

Lighthouse lab scores (LCP/TBT/CLS) require the live Pages URL and a headless
Chrome run; the method is documented below so the numbers are reproducible and
comparable over time. They are intentionally **not** guessed here.

---

## Asset-weight baseline (2026-07-09)

Per-page transferred bytes ≈ the HTML + its CSS + its JS + the JSON it fetches.
`style.css` (56 KB) is shared and cached across all pages after first load.

| Page | HTML | Page JS | Data fetched | Notes |
| --- | --- | --- | --- | --- |
| index.html | 8.3 KB | landing.js 22 KB | crash-summary 29 KB, ward-denominators 3 KB | Inline-SVG sparklines, no map |
| map.html | 10 KB | app.js 35 KB | live ArcGIS queries + baked JSON | Leaflet from CDN; live crash fetches dominate |
| hotspots.html | 16 KB | hotspots.js 17 KB | hotspots.geojson 53 KB, hin-corridors 133 KB | Largest baked payload (corridor table + map) |
| anc.html | 5.6 KB | anc.js 10 KB | crash-summary, ward data | Print-oriented brief |
| laws.html | 4.3 KB | laws.js 11 KB | legislation 10 KB, bills 7 KB, pitch-targets 14 KB | 3 JSON files, all small |

Shared: `style.css` 55.6 KB (one download, then cached), Leaflet JS/CSS from CDN
with SRI (map pages only).

**Largest single baked file:** `data/hin-corridors.json` at 133 KB — the plan's
soft ceiling. It stays under budget but is the first candidate to split or
decimate if the corridor set grows.

### Budget (targets to hold, verify against field Lighthouse)

| Page class | LCP (mobile) target | Transferred budget | Rationale |
| --- | --- | --- | --- |
| index / laws / anc | < 2.5 s | < 150 KB first load (ex-shared CSS) | No map; should be near-instant |
| hotspots | < 3.0 s | < 250 KB baked | Corridor table + map earns more bytes |
| map | own honest budget | live ArcGIS-bound | LCP gated by upstream ArcGIS latency, not our bytes |

---

## Responsive sweep (2026-07-09)

Method: local server, viewport set to each width, then per-page checks for
`documentElement.scrollWidth > clientWidth` (page-level overflow) and any element
whose right edge escapes the viewport.

| Page | 375 px | 768 px | 1280 px | Defects |
| --- | --- | --- | --- | --- |
| index.html | ✅ no overflow | ✅ | ✅ | none |
| map.html | ✅ no overflow | ✅ | ✅ | none (Leaflet internals clipped by `.leaflet-container{overflow:hidden}`) |
| hotspots.html | ✅ no overflow | ✅ | ✅ | none (map tiles/markers extend past viewport but are clipped, not page-scrolling) |
| anc.html | ✅ no overflow | ✅ | ✅ | none |
| laws.html | ✅ no overflow | ✅ | ✅ | none — new lineage/bills/pitch sections wrap correctly; card heads switch to grid < 720 px |

No page-level horizontal-scroll defects found at any width. The new laws.html
policy surfaces (lineage list, bills grid, pitch cards, calendar) were verified to
wrap and reflow at all three widths, with computed styles confirmed via DOM
inspection (accent tokens, monospace numerals, badge styling all applied).

Note on tooling: the preview screenshot layer in this environment returned blank
captures (text not painted into the JPEG); verification therefore used DOM
inspection of computed styles and bounding boxes, which the preview guidance calls
out as more reliable than screenshots for confirming rendered CSS. Console was
error-free on every page.

---

## Known perf characteristics (carried from prior phases)

- No build step; no bundler. Files are served as authored (`.nojekyll`).
- Leaflet loaded from CDN with Subresource Integrity; `map-perf.test.mjs` guards
  reload-skip logic so no-op map settles don't refetch.
- Baked JSON is pre-decimated (polylines) and each file is ≤ 133 KB.
- Inline-SVG sparklines on non-map pages — effectively zero image/font weight.

---

## Open perf work (deferred to M7 / Workstream B2–B3)

Guided by this baseline; not done in this pass:

- **map.html markers:** verify per-crash marker counts at citywide zoom; adopt
  `preferCanvas` / a viewport feature cap ("N more — zoom in") if counts are high.
  Decimation is dependency-free and preferred over a clustering plugin unless the
  plugin clearly earns its bundle cost.
- **Viewport-scoped fetches:** confirm ArcGIS queries are bbox-bounded and
  debounced on `moveend` on hotspots.html as well as map.html.
- **Lazy map init:** defer Leaflet/tile load until the map container nears the
  viewport on pages where the map isn't primary content.
- **Preconnect hints:** add `preconnect` for the tile host and the DC ArcGIS host.
- **Field Lighthouse:** capture the real LCP/TBT/CLS table (below) and fill the
  budget column with measured before/after numbers.

---

## How to capture Lighthouse (reproducible)

Run against the live Pages URL (not localhost — tiles and ArcGIS differ), mobile
and desktop presets, for all five pages. Record LCP, TBT, CLS, and total
transferred bytes into a dated table under a new "Field Lighthouse" section here.
Prefer extending the existing pure-logic `map-perf.test.mjs` pattern for anything
CI-checkable rather than adding a heavy Lighthouse-CI dependency (cost-conscious
rule). Re-run after each M7 change to show before/after.
