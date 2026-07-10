# MAPS_PLAN.md — Maps & Visuals Overhaul

> Written 2026-07-09. Companion to PLAN.md (next-phase plan): this document **supersedes
> PLAN.md Workstream B2** ("map-page work") with a fuller diagnosis and design, and slots
> into the same milestone sequence. PLAN.md B1 (perf baseline) still runs first; B3/B4
> (non-map pages, responsive sweep) are unchanged.
> Audience: the implementing agent/model. Read CLAUDE.md and DESIGN.md before starting.

---

## Diagnosis — what's actually wrong (verified in-browser 2026-07-09)

The site has **two full interactive maps that answer the same reader question two different
ways, and neither one reads well**.

### 1. The crash map is a blob

`map.html` draws up to 5,000 individual circle markers at citywide zoom. With the default
filter (2024–present, all severities) that's 5,000 of ~47,000 matching records, dominated
by minor/property-damage crashes in gold and gray. The result: DC renders as one solid
point-soup blob, and the 12 fatal crashes in view — the story — are invisible inside it.
The KPI strip says "5,000 crashes drawn", which is a cap artifact, not information.

The initial viewport is also wrong twice over: the map frames the whole metro area
(Bethesda to Bowie — DC occupies ~a third of the canvas), and on desktop the map itself
sits below the fold behind masthead + toolbar + KPI strip, violating DESIGN.md's "first
viewport shows at least part of the map/table."

### 2. The hotspots map fights its own basemap

`hotspots.html` uses raw OpenStreetMap tiles — busy, colorful, with red/orange highway
casings that impersonate the severity palette. The 4px corridor polylines are nearly
invisible at the default extent; only the numbered rank badges carry signal. Meanwhile
`map.html` uses calm Carto light-gray tiles. Two pages, two basemaps, two visual
languages for the same severity semantics. DESIGN.md says the map should feel like "an
embedded investigative graphic"; neither map currently does.

### 3. The two pages duplicate each other's job

- `map.html` has a **"Hot spots in view"** panel (severity-weighted top locations + ward
  totals) — a name collision with the **Hotspots** page, which ranks *different* things
  (HIN corridors) by a *different* method (baked 25 m join vs. live grouped query).
- `index.html` carries a third copy of the corridor ranking (teaser cards).
- Ward statistics appear on the crash map (two panels) and again on the ANC page.
- A reader cannot tell what distinguishes "Hotspots" from "Hot spots in view", and
  nothing connects them: clicking a corridor on hotspots.html cannot show you its
  crashes; finding a cluster on map.html cannot tell you it's on a ranked corridor.

The BACKLOG's own upgrade trigger — "the point layer becomes visually unreadable at
citywide zoom" — has fired.

---

## Central thesis

**One map, one severity language; every other surface is a ranked view that deep-links
into it.**

The product's north star (CLAUDE.md) is a funnel: *crash cluster → supporting records →
defensible recommendation, without losing the source trail*. Today that funnel is
chopped across three pages that each independently re-answer "where is harm?" The fix is
not more map features — it's structure:

1. **The crash map becomes the site's single interactive map** (the "Atlas"). It gains
   the HIN corridor layer and a severity-first default rendering, so the citywide view
   shows the *pattern* (corridors + KSI), and zooming in reveals *records*.
2. **The Hotspots page keeps its unique value and loses its duplicate map.** Its real
   asset is the ranked corridor evidence cards, recommended fixes, and the full sortable
   HIN table — an advocacy artifact, not a map. Rows and cards deep-link into the Atlas
   (URL state already exists in `app.js`). Rename it **Corridors** to kill the name
   collision.
3. **Grain stays explicit.** Corridors, grouped intersections, and individual records
   are different levels of the same map, each labeled with its grain and method — which
   *satisfies* the CLAUDE.md geospatial rule rather than fighting it.

This is the reader journey the site promises: see the corridor → see its crashes → open
a case file → read the recommended fix → carry the evidence to an ANC meeting.

---

## Options considered

### Information architecture

| Option | Verdict |
| --- | --- |
| **A. Full merge** — one mega-page with every layer and table | Rejected: buries the corridor evidence cards and HIN table, which need a calm, printable, sortable page of their own. |
| **B. Status-quo polish** — keep both maps, just restyle | Rejected: styling can't fix the name collision, the three-way duplication, or the broken funnel. Cheapest, but spends effort without resolving the actual complaint. |
| **C. One interactive map + one ranked evidence page (chosen)** | The Atlas absorbs the corridor *layer*; Corridors keeps the *ranking* and deep-links in. Kills duplication while preserving both pages' distinct jobs. Middle cost. |

Within option C, whether Corridors keeps a small **locator map** (tiny, non-interactive,
just "where are these 8 lines") is a taste call — default to *no map at all* first;
add the locator only if the page feels ungrounded without it.

### Citywide point rendering (the blob fix)

Evaluated against the BACKLOG "Visualization Complexity Options" list:

| Option | Verdict |
| --- | --- |
| Marker-clustering plugin | Rejected: new dependency (must earn bundle cost per CLAUDE.md), and count-based clusters hide severity — 500 fender-benders outrank 3 deaths. |
| Heatmap layer | Rejected: reads as a modeled surface without visible counts — "invented certainty" under the editorial promise, and another dependency. |
| Hexbin/grid aggregation | Deferred: honest and stable, but needs binning code + artificial boundaries; revisit if grouped intersections prove insufficient. |
| **Zoom-dependent grouped intersections (chosen)** | At citywide zoom, render the *grouped-by-intersection* statistics (the ArcGIS `groupBy` query `loadGroupedHotspots()` already runs for the side panel) as graduated circles, labeled as grouped statistics. At neighborhood zoom, switch to individual records. Dependency-free, reuses an existing query, and carries its grain label. |
| Vector tiles / deck.gl / framework | Rejected: massively out of scale for ≤132 KB baked files and a static host. |

### Severity emphasis

Two levers, both taken:

- **KSI-first default.** The citywide default should answer "where are people being
  killed and seriously injured?", not "where are all 47k police reports?" Either default
  the KSI toggle ON at low zoom, or (chosen) make the low-zoom aggregate circles
  severity-weighted with the components visible on hover/click, labeled as a triage
  heuristic per CLAUDE.md.
- **Fatal crashes always drawn individually**, on top, with a distinct ring symbol, at
  every zoom — 12 fatals must never disappear inside an aggregate. (Check small-count
  privacy rule: fatal crash locations are already public record at point grain on DDOT's
  own dashboard, so point display is fine; no narrative detail beyond the existing case
  file.)

---

## The plan

Each milestone is a separate PR with tests. Sequencing assumes PLAN.md M1 (Lighthouse
baseline, PERF.md) lands first so before/after is measurable.

### V1 — One visual language (cheap, high-impact, no behavior change)

- **One basemap:** Carto light on both map pages (hotspots keeps it only until V3
  removes its map). Add `preconnect` hints for tile + ArcGIS hosts.
- **One style module:** new `src/map-style.js` (Node-testable, per repo pattern) as the
  single source for severity colors (read from CSS tokens), marker radii, corridor
  weight/color ramp, and the legend builder. Both pages consume it; delete the
  per-page duplicates (`getColorByRank`, inline rank-color CSS, `colorForSeverity`,
  `radiusForSeverity` stay but move).
- **Corridor lines readable:** weight scaled by KSI (not three rank buckets), with a
  white casing/halo so lines read on any basemap; keep the numbered badges.
- **Legend on the crash map** (it has none) using the shared builder.
- **Fix the frame:** initial view = DC bounds fit (not metro), `maxBounds` clamped with
  sane `minZoom`; compact the masthead/toolbar rhythm on `map.html` so the map is
  visible in the first desktop and mobile viewport (DESIGN.md rule).
- **Honest counts:** KPI strip reads "showing 5,000 of 47,396 — zoom in for the rest"
  instead of "5,000 crashes drawn".
- Acceptance: both maps use identical severity encoding; screenshot check at
  375/768/1280; `map-perf.test.mjs` still green; new unit tests for the style module.

### V2 — Severity-first rendering (the blob fix)

- Zoom threshold Z (pick empirically, ~14): below Z, draw grouped-intersection
  graduated circles from the existing `groupBy` query + individually-drawn fatal (and
  optionally all-KSI) markers on top; at/above Z, draw individual records as today.
- Aggregate circles carry grain + method on click ("grouped statistics from N records
  at this intersection — triage heuristic, components: …"), reusing the existing
  hotspot-panel scoring copy.
- The "Hot spots in view" side panel is now redundant with the visible aggregation —
  **rename to "In this view"** and demote to a collapsed disclosure, or remove entirely
  if the aggregate layer + ward rates cover it. (Decide at implementation; removal
  preferred if nothing unique remains.)
- Acceptance: citywide view shows a readable pattern, not a blob; fatal crashes
  identifiable at every zoom; marker count at citywide zoom drops from ~5,000 to
  hundreds; no new dependencies; grain labels render.

### V3 — The funnel: corridor layer + Corridors page + deep links

- **Atlas gains the corridor layer** (baked `hotspots.geojson` + `hin-corridors.json`,
  already ≤132 KB): toggleable, on by default at citywide zoom. Corridor click opens
  the evidence rail with the corridor card (KSI, modes, top fixes — same content as
  today's hotspot cards) plus a **"show crashes on this corridor"** action that applies
  the corridor's extent/filter. Preserve the calm-navigation rule: selecting pans only
  if off-screen, never re-zooms (see `hotspots.js` header comment — do not re-add
  fitBounds-on-select).
- **Hotspots page → "Corridors":** keeps summary strip, ranked evidence cards, and the
  full 77-row sortable table; **its Leaflet map, tile dependency, and duplicate
  interaction code are removed**. Cards and table rows deep-link into the Atlas
  (`map.html?…` — extend the existing URL-state module with a `corridor` param).
  Nav label and page title change; `hotspots.html` keeps its filename (GitHub Pages has
  no redirects — update nav + internal links; add a `<link rel="canonical">` note only
  if the page is ever renamed on disk).
- **Index teaser cards** deep-link to the same Atlas states instead of `hotspots.html`
  generically.
- Acceptance: a user can go corridor card → highlighted corridor + its crashes → case
  file without dead ends; `hotspots.js` shrinks to card/table logic; Leaflet loads on
  exactly one page; existing hotspots-data tests still pass, new tests for the
  `corridor` URL param and the corridor-filter logic.

### V4 — Verify + measure

- Re-run the PLAN.md B1 Lighthouse pass; record before/after in PERF.md (map.html
  transferred bytes should drop on hotspots.html by the whole Leaflet+tiles budget).
- Responsive sweep at 375/768/1280 for both changed pages (dovetails with PLAN.md B4);
  defects to ISSUES.md; regression assertions into `html-integrity.test.mjs` where
  statically expressible.
- Update `llms.txt` / `llms-full.txt` page descriptions (Corridors rename, Atlas layer).

---

## Guardrails (standing rules, restated for this work)

- No new runtime dependencies without a written case (clustering/heatmap plugins are
  explicitly rejected above).
- Every aggregate or weighted display is labeled a triage heuristic with components
  visible (CLAUDE.md geospatial discipline).
- Grain labels everywhere: corridor / intersection-group / record.
- Small counts: aggregation thresholds must not enable re-identification; fatal points
  show no narrative detail beyond the existing public case file.
- Severity colors come from CSS tokens only; JS reads them, never duplicates hex
  (DESIGN.md rule).
- Calm navigation: pan-don't-zoom on selection, stable overview, no map churn.
- Each milestone lands with tests and a local 375/768/1280 verification pass.

## Explicitly out of scope

Vector tiles, WebGL renderers, any frontend framework, dark mode for map tiles, a
composite "danger score", and merging the ANC/laws pages — none of these are needed to
fix what's wrong.
