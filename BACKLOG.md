# BACKLOG.md - DC Vehicle Safety

> Future options for when the crash map, hotspot analysis, or policy recommendation views become too complex for the current static prototype.

---

## ✅ COMPLETED: Phase 2 — ANC Toolkit, Hotspot Teaser & Source Audit (2026-06-08)

**Context:** Shipped the Phase 2 **[PRIORITY] Option D** (community-led intervention prioritization) and **Option A** (hotspot teaser), plus finished the editorial source audit (DATA-AUDIT-001 residuals) and closed the last UAT issue.

- **Option D — ANC Safety Brief (`anc.html` + `anc.js`).** Ward selector drives a per-ward crash snapshot (crash-summary.json), the high-injury corridors intersecting the ward (hotspots.geojson), and ward-scoped + citywide recommendations (recommendations.json). Generates an **editable, source-grounded resolution draft** with copy / open-in-email (mailto, un-sent) / print actions — the static-site form of a feedback loop (resident → commissioners → DDOT). Deep-linkable via `#ward-N`. Added "For ANCs" to nav across all pages. The draft carries the preliminary/ward-grain caveats into every figure.
- **Option A — Hotspot teaser on the home tab (`index.html` + `landing.js`).** Top two corridors preview as cards linking to hotspots.html, with the GeoJSON verification caveat surfaced in a note.
- **Source audit finish (DATA-AUDIT-001).** Removed the fabricated 41%/59% crossing-guard figures and replaced with the verified DDOT figure (214 posts / 135 schools, 2025-26); re-sourced the ward-population denominator off Wikipedia onto an honest DC OP / DC Health Matters compilation anchored to the verified 2020 Census total (689,545); updated recommendations, llms.txt/llms-full.txt, and HOTSPOTS_AND_POLICIES.md. Residual: reconfirm per-ward population against DC OP per-ward tables; compute real per-corridor counts via HIN spatial join.
- **UAT-006 closed.** Tab labels (Home / Data / Fixes) verified non-clipped at 375px.
- **Tests:** all 44 node tests + 11 python tests pass; `anc.html` added to the html-integrity SRI guard list.

**Still open from the Phase 2 menu:** Option B (deep-dive co-design with Bread for the City), Option C (before/after intervention projection map layer).

---

## ✅ COMPLETED: Phase 1 — Hotspots Map & Community Research (2026-06-07)

**Context:** Implemented Phase 1 ideas in chunks with design feedback. Completed hotspot map structure and expanded community/policy research.

**Phase 1.1 — Hotspot Verification & Interactive Map (Complete)**
- Built GeoJSON FeatureCollection with 5 priority corridors (New York Ave NE, South Capitol St, Georgia Ave NW, East Capitol St, Southern Ave SE)
- Each corridor includes: rank, severity (injuries/fatalities/KSI), mode breakdown, recommended interventions with effect sizes, equity notes, confidence level
- Interactive Leaflet map with polyline visualization, color-coded by severity rank
- Sidebar corridor cards with minimal profiles (rank, name, location, injuries/deaths, top 2 fixes, priority badge)
- Responsive layout: side-by-side desktop, stacked mobile with horizontal scroll
- Error handling for CDN/data loading; production-ready (preview CDN limitation only)
- **Files:** `hotspots.html`, `hotspots.js`, `data/hotspots.geojson`

**Phase 1.2 — Community Organizations & Policy Expansion (Complete)**
- 14 community organizations catalogued across 4 tiers:
  - Tier 1: DC Families for Safe Streets, WABA, Bread for the City
  - Tier 2: Walk DC, Seniors Age Well, Georgetown Transportation, Transportation Choices Coalition
  - Tier 3: Black Lives Matter DC, School PTOs, ANCs, DCBAC
  - Tier 4: Georgetown University, Howard University, Results for America
- 14 new policy/infrastructure ideas:
  - Speed & Design (5): Speed-limit harmonization, truck routing curfews, adaptive signals, curb narrowing, modal-priority zones
  - Enforcement (3): Graduated repeat-speeding penalties, community intersection reporting app, enforcement strike teams
  - Equity & Access (3): Subsidized transit in high-crash areas, community safety jobs, $500K Transportation Justice Fund
  - Education (3): Driver-ed integration, employer safety pledges, Vision Zero Champions ambassador program
- 3-year implementation sequencing (Year 1 quick wins → Year 2 medium lift → Year 3+ sustained)
- $3.85M/year funding strategy (DDOT $2M, city capital $1M, FHWA $500K, philanthropy $250K, community dev $100K)
- Messaging templates by audience (Council, community, advocates, business)
- Vision Zero Oversight Board mechanism with monthly public meetings
- **Files:** `COMMUNITY_ORGS_EXPANDED.md`

**Phase 1.3 — Navigation Spacing Refinement (Complete)**
- Increased nav padding: 12px → 18px (vertical breathing room)
- Increased nav gap: 16px → 24px (item separation)
- Increased nav-links gap: 6px → 12px
- Increased link padding: 8px 16px → 10px 18px
- Added white-space: nowrap to prevent nav-brand wrapping
- Added flex-shrink: 0 to prevent brand compression
- **Files:** `style.css`

**Next Steps — Priority Order:**
1. **[PRIORITY] Option D:** Community-led intervention prioritization (ANC presentations + feedback loop)
2. **Option A:** Hotspot teaser carousel on home page (top 2 corridors preview)
3. **Option B:** Deep-dive co-design with Bread for the City (1 corridor + 2–3 interventions)
4. **Option C:** Map comparison layer (before/after intervention projection)

---

## ✅ COMPLETED: PR #4 Review Feedback Integration (2026-06-08)

**Context:** PR #4 merged successfully, but contained three critical gaps identified in review comments that were not addressed before declaring work complete.

**Issues Found and Fixed:**

1. **Accessibility Regression** — Tab buttons missing ARIA roles
   - Added `role="tablist"` to navigation container
   - Added `role="tab"` to each tab button
   - Added `aria-controls="tab-{name}"` to link buttons to their panels
   - Impact: Screen readers now properly announce tab structure and controlled regions

2. **Deep-Linking Broken** — Tabs not syncing with URL hash
   - Refactored tab switching into reusable `switchToTab(tabName)` function
   - Added `window.history.replaceState()` to update URL hash on tab click
   - Added `hashchange` event listener for browser back/forward navigation
   - Validates hash on page load and navigates to correct tab
   - Impact: Users can bookmark/share tab-specific URLs (#home, #analysis, #solutions)

3. **Data Provenance Missing** — Static JSON without source documentation
   - Added `_provenance` metadata block to `data/organizations.json`
   - Documents: source title, description, methodology, capture date, limitations
   - Follows CLAUDE.md data principles on source attribution
   - Impact: Dataset now has full audit trail per project standards

4. **UX Regression** — Tabs scrolled out of view when clicked
   - Removed `scrollIntoView()` from tab switching logic
   - Tabs now remain in view as content changes
   - Impact: Better UX; users see navigation context at all times

**Key Learning:** PR review comments must be read completely and addressed before work is declared done. "Merged" is not the same as "complete." Updated AGENTS.md with guidance on handling PR feedback systematically.

**Files Changed:**
- `index.html`: Added ARIA attributes
- `landing.js`: Refactored tab switching, added hash-sync logic
- `data/organizations.json`: Added provenance metadata
- `AGENTS.md`: Added PR review feedback section

---

## ✅ COMPLETED: Mobile Scrolling Optimization (2026-06-07)

**Issue:** [UAT-004] Page height 8164px required 10+ screen scrolls on mobile, violating DESIGN.md progressive-disclosure guidance.

**Solution Implemented:**
- Show 2 organizations on mobile with "SHOW ALL 10 ORGANIZATIONS" button
- CSS media query `@media (max-width: 640px)` hides organizations 3+ by default
- JavaScript toggle button: `setupOrgToggle()` creates and manages the "Show all / Show fewer" button
- Tablet (768px+) and desktop show all 10 organizations without toggle (2-column grid on tablet)

**Results:**
- ✅ Mobile page height dramatically reduced (previously 8164px, now ~2400px with 2 orgs)
- ✅ Countermeasures section now accessible on mobile without excessive scrolling
- ✅ All 10 organizations still accessible via single click toggle
- ✅ No JS errors; graceful CSS fallback if JS fails
- ✅ Tested and verified on mobile (375px), tablet (768px)

**Files Changed:**
- `landing.js`: Added `setupOrgToggle()` function (30 lines), modified `renderOrganizations()` to call it
- `style.css`: Added `.org-toggle` button styling, `.orgs-grid:not(.orgs-expanded) .org-card:nth-child(n + 3) { display: none }`

**Follow-ups:**
- Countermeasures library already has similar pagination pattern (show 3 + toggle on mobile)
- Tab scroll-to-top behavior verified working
- Section labels already hidden (`.section-label { display: none }` completed in prior commit)

---

## When To Upgrade

Consider moving an item from this backlog into active work when one of these starts happening:

- The map feels slow with normal filters or while panning.
- The point layer becomes visually unreadable at citywide zoom.
- Users need to compare wards, corridors, or intersections side by side.
- A recommendation needs multiple denominators, data joins, or repeatable methodology.
- The app needs saved analyses, permalinks, exports, or scheduled refreshes.
- The current browser-only ArcGIS queries make the UI brittle or hard to test.

---

## Visualization Complexity Options

### 1. Add Point Clustering

**Use when:** citywide crash dots are too dense to inspect.

**Approach:** cluster nearby crash points by zoom level, then expand into individual records at neighborhood/intersection scale.

**Good for:** fast overview, familiar map behavior, lower visual clutter.

**Tradeoff:** clusters can hide severe crashes unless severity-aware styling is added.

### 2. Add Heatmap / Density Layer

**Use when:** users need to see broad crash concentration patterns before drilling into records.

**Approach:** add a heatmap toggle using crash severity or weighted KSI values.

**Good for:** quick "where is harm concentrated?" exploration.

**Tradeoff:** heatmaps are not precise policy evidence; pair with table rankings and source records.

### 3. Add Hexbin Or Grid Aggregation

**Use when:** points and heatmaps both feel too noisy.

**Approach:** aggregate crashes into fixed hexes or grid cells with counts, KSI, vulnerable-user involvement, and speeding flags.

**Good for:** regional analysis, side-by-side comparisons, stable visual units.

**Tradeoff:** grid boundaries are artificial; intersections and corridors still need separate analysis.

### 4. Add Corridor-Level Views

**Use when:** hotspot rows start identifying roads more often than intersections.

**Approach:** group crashes by named corridor, road segment, or DDOT project geography.

**Good for:** policy recommendations like road diets, signal timing, bus/bike lane changes, speed management, and capital planning.

**Tradeoff:** requires a clean street centerline join and careful segment definitions.

### 5. Add Small Multiples

**Use when:** a single map has too many toggles.

**Approach:** show small maps by severity, travel mode, ward, time period, or intervention type.

**Good for:** comparing patterns without hiding logic behind filters.

**Tradeoff:** needs a careful layout so mobile does not become unusable.

### 6. Add Map/Table Split View

**Use when:** users need ranked evidence more than freeform map exploration.

**Approach:** create a sortable table for intersections, corridors, wards, and crash records, with map selection synchronized to table rows.

**Good for:** policy triage, auditability, source review, exporting lists.

**Tradeoff:** tables need pagination or virtualization once rows grow.

---

## Data And Performance Options

### 1. Precompute Local JSON Summaries

**Use when:** live ArcGIS grouped queries slow down or become fragile.

**Approach:** add a script that snapshots raw crash data and writes compact summary JSON for the frontend.

**Good for:** speed, reproducibility, versioned methodology.

**Tradeoff:** requires a refresh workflow and stale-data labels.

### 2. Use DuckDB For Local Analysis

**Use when:** analysis gets more complex but still fits local/static deployment.

**Approach:** store snapshots as Parquet/CSV and generate summaries with DuckDB scripts.

**Good for:** fast joins, repeatable ranking tables, easy data checks.

**Tradeoff:** still not a full production API.

### 3. Add PostGIS Backend

**Use when:** spatial joins, buffering, corridors, and ward/ANC overlays become core product features.

**Approach:** load crash, ward, street, project, traffic-volume, and violation data into Postgres/PostGIS.

**Good for:** serious geospatial analysis and reusable API endpoints.

**Tradeoff:** more infrastructure and deployment complexity.

### 4. Move Heavy Map Rendering To Vector Tiles

**Use when:** point rendering becomes the bottleneck even after filtering.

**Approach:** generate vector tiles for crashes, clusters, or aggregate cells.

**Good for:** smooth pan/zoom with large geospatial datasets.

**Tradeoff:** more build tooling and tile schema design.

### 5. Consider Deck.gl For Advanced Layers

**Use when:** the project needs high-performance WebGL layers like hexagons, arcs, animated time, or large point clouds.

**Approach:** keep the current civic-newsroom UI, but render heavy analytical layers in Deck.gl.

**Good for:** performant complex visualizations.

**Tradeoff:** more frontend complexity; only worth it if Leaflet/canvas is no longer enough.

---

## Policy Analysis Options

### 1. Add Exposure Denominators

**Use when:** ward or corridor comparisons become important.

**Potential denominators:** population, road miles, traffic volume, trips, bike counts, pedestrian counts, school enrollment, bus stops, or land area.

**Outcome:** move from "most crashes" toward "highest risk relative to exposure."

### 2. Add Intervention Taxonomy

**Use when:** hotspot output should suggest policy actions.

**Categories:** speed management, signal timing, protected bike/ped infrastructure, crossing improvements, curb management, enforcement, maintenance, legislation, budget, data quality.

**Outcome:** recommendation cards become consistent and reviewable.

### 3. Add Evidence Cards

**Use when:** ranked hotspots need policy recommendations.

**Card fields:** location, ward, grain, trigger metric, source rows, possible intervention, mechanism, confidence, equity check, caveats.

**Outcome:** recommendations remain auditable instead of becoming opaque scores.

### 4. Add Before/After Evaluation

**Use when:** DC projects or policies can be tied to dates and locations.

**Approach:** compare pre/post crash patterns with visible caveats about regression to the mean, exposure changes, and enforcement/reporting shifts.

**Outcome:** the tool can evaluate interventions, not just identify problems.

---

## UX Options

### 1. Add View Tabs

**Tabs:** Map, Hotspots, Wards, Corridors, Records, Methodology.

**Use when:** one screen starts carrying too many responsibilities.

### 2. Add Saved Filter URLs

**Use when:** users need to share a ward, hotspot, date range, or severity filter.

**Approach:** synchronize filters and map bounds to URL parameters.

### 3. Add Export Buttons

**Use when:** analysts need to move hotspot lists into memos, testimony, or spreadsheets.

**Formats:** CSV, GeoJSON, PNG, printable evidence card.

### 4. Add Methodology Drawer

**Use when:** scoring and ranking logic becomes too long for inline notes.

**Approach:** keep short caveats in the UI and link to a detailed methodology panel.

---

## First Likely Next Steps

1. ~~Add URL-synced filters and map bounds.~~ Done 2026-06-07: filters + map center/zoom mirror to the query string (`app.js` URL-state module).
2. Add a sortable hotspot table below the map for mobile and tablet. _Partially addressed: a ward crash-rate table now exists; intersection/corridor row tables still pending._
3. ~~Add a local data snapshot script for reproducible crash and ward summaries.~~ Done 2026-06-07: `pipeline/snapshot.py` -> `data/crash-summary.json`, with `tests/test_snapshot.py`.
4. ~~Add denominators for ward comparisons before making any ward risk claims.~~ Done 2026-06-07: ward population + computed land area, surfaced as per-100k and per-sq-mi rates with an explicit "per-area is preferred" caveat. Road-mileage / VMT / trip denominators still open.
5. Add evidence-card templates for policy recommendations.

### Newly Surfaced Follow-ups (2026-06-07)

- Add road-centerline mileage and/or VMT per ward as stronger exposure denominators (population is near-flat across DC wards by design).
- Let severity/mode filters drive the ward-rate table (currently date-window only; would need per-severity/mode baked slices or a live query).
- ~~Add a stale-snapshot label in the UI.~~ Done 2026-06-08: the landing footer shows "Snapshot captured …" and flags it stale past 45 days. _Still open: a scheduled/documented refresh cadence (e.g. a CI job running `pipeline/snapshot.py`)._
- Extend the snapshot to intersection/corridor grain to back a sortable evidence table (ties into item 2 and item 5).
- Site is now two pages (`index.html` landing + `map.html`) with shared nav and a shared pure-logic module (`src/crash-logic.js`). B4 (recommendation → evidence-trail deep links) is effectively shipped via card `map_link`s.

---

## Hotspots Map Navigation & Clarity

> User feedback (2026-06-07): the hotspots map was "hard to navigate" with "too much zoom/panning." First pass shipped; remaining ideas parked here.

**Shipped 2026-06-07 (`hotspots.html`, `hotspots.js`):**
- **Calm selection** — selecting a corridor no longer re-zooms. It highlights the polyline + numbered badge + sidebar card, and only *pans* (never zooms) when the corridor is off-screen. The map holds a stable all-corridors overview. This was the direct fix for "too much zoom/panning."
- **Numbered rank badges** on the map so each corridor is identifiable without clicking.
- **Headline summary strip** above the map (corridors, total KSI, deaths, crashes, wards) so the key insight is visible before any interaction.
- **Color legend** (rank → severity tier) pinned to the map.
- **"Fit all corridors" button** to restore the overview after manual zoom; deferred `fitBounds` + `invalidateSize()` so the initial frame can't over-zoom from a container-size race.

**Parked ideas (not yet built):**
1. **Optional "focus" toggle** — a per-corridor "zoom to this" affordance for users who *do* want to drill in, kept separate from the default calm click so it's opt-in.
2. **Sortable corridor table** under the map (sort by KSI, deaths, ward) — better than the map for scanning/ranking, and the accessible fallback when the map can't load. Ties into "First Likely Next Steps" item 2.
3. **Crash-map deep link per corridor** — "see the underlying crashes" jumps to `map.html` filtered to that corridor's extent (reuse the URL-state module).
4. **Mode/severity glanceability** — show the ped/cyclist/driver/passenger KSI split on the card or as a small bar, so the "who is being hurt here" insight doesn't require opening the full analysis doc.
5. **Keyboard navigation** — arrow keys to move between corridors; cards are focusable and announce selection (a11y).
6. **Reduce summary vertical cost on mobile** — the wrapped summary stacks to several rows on 375px (overlaps the UAT-004 scrolling concern); consider a 2-up compact layout or a collapsible strip.

---

## Hotspots Map Hardening & Resilience

> Surfaced by the BUG-010 fix (2026-06-07): a fabricated Leaflet SRI hash silently broke the hotspots map ("L is not defined"). The map renders the GeoJSON blind, so both the dependency-load path and the data path deserve guards. Regression tests landed in `tests/html-integrity.test.mjs` and `tests/hotspots-data.test.mjs`; these are the product-level follow-ups.

### 1. Graceful CDN / dependency-failure fallback

**Use when:** Leaflet (or its tiles) fails to load — bad SRI, CDN outage, offline, blocked unpkg.

**Approach:** when `typeof L === 'undefined'` after load, swap the map pane for an inline message and keep the sidebar fully usable (it already renders independently). Optionally render a static corridor list/SVG so the page degrades to content rather than a red error string.

**Good for:** resilience; the page stays informative even when the map can't draw.

**Tradeoff:** a little extra fallback UI to maintain; doesn't fix the underlying load failure, only the experience.

### 2. Self-host or pin-and-verify Leaflet

**Use when:** we want to remove the single-point-of-failure on unpkg and the hand-managed SRI hash.

**Approach:** vendor `leaflet.js`/`leaflet.css` into the repo (served from `docs/`/static), or add a tiny `npm`/CI step that recomputes and verifies SRI hashes against the pinned version so a wrong hash can never ship. Document the exact `openssl` recipe used at fix time.

**Good for:** reproducibility, offline dev, supply-chain control (aligns with CLAUDE.md security rules).

**Tradeoff:** vendored assets add repo weight and a manual bump step on version upgrades.

### 3. Corridor profile / detail panel

**Use when:** the sidebar card's "top 2 fixes" isn't enough — users want the full evidence trail per corridor.

**Approach:** on select, expand a detail view with the full intervention list (effect sizes), mode breakdown (ped/cyclist/driver/passenger KSI), equity notes, confidence + confidence_note, and a deep link into `map.html` filtered to that corridor's extent.

**Good for:** turning a hotspot into a defensible, sourced recommendation without leaving the page (the project's "north star").

**Tradeoff:** more layout work and another responsive breakpoint to maintain.

### 4. Intersection-grain hotspots from the live snapshot

**Use when:** the 5 hand-built corridors should be reproducible from data rather than authored once.

**Approach:** extend `pipeline/snapshot.py` to emit corridor/intersection KSI rollups and generate `hotspots.geojson` (or a sibling) from canonical crash records, carrying `source_url`/`captured_at` provenance. Ties into "Newly Surfaced Follow-ups" intersection-grain item.

**Good for:** freshness, provenance, removing the "verification in progress" caveat in the file's metadata.

**Tradeoff:** needs a clean street-centerline join and segment definitions (same dependency as "Add Corridor-Level Views").

### 5. Data-quality CI gate

**Use when:** we want bad map data to fail the build, not the browser.

**Approach:** run `node --test` (now including the hotspots-data + html-integrity suites) in CI on every push; block merge on failure. Add `mode_breakdown`-sums and DC-bounds checks as the canonical validators for any future generated GeoJSON.

**Good for:** catching coordinate-quadrant errors (PR5-001 class) and SRI mismatches (BUG-010 class) before they reach `main`.

**Tradeoff:** requires standing up CI (none configured yet); a documented refresh cadence overlaps with the snapshot-refresh follow-up above.

---

## Landing Page & Policy Recommendations (peer-city research, 2026-06-07)

Researched how leading programs present crash data and turn it into recommendations: NYC (Vision Zero View), San Francisco, Seattle, Portland, Los Angeles, Chicago, London (TfL), Hoboken/Jersey City NJ, plus FHWA systemic-safety guidance and DC's own DDOT camera study. Sources listed at the end of this section.

### Cross-city lessons (the framing to build toward)

- **The High Injury Network (HIN) is the universal organizing idea, and one sentence carries it.** SF: 12% of streets = 68% of severe/fatal crashes; LA: 6% of streets = 70% of walking/biking KSI; Portland: 8% of streets = 67% of deadly crashes. DC already publishes an HIN, so this is directly replicable — and it reframes harm as a small, *fixable* set of segments rather than "dangerous neighborhoods" (which CLAUDE.md forbids).
- **Lead with one headline number plus a % change vs. a stated baseline.** NYC opens with deaths/injuries vs. the pre-Vision-Zero baseline. DC's honest hook: it set 2024 as a zero-deaths target and instead deaths rose to a multi-year high — that gap is the headline.
- **KSI focus + crash typing is the methodology backbone.** Mature programs analyze Killed-or-Seriously-Injured crashes and classify by type/mode, which is what connects a cluster to a *specific* countermeasure.
- **Interventions are a named vocabulary with cited effect sizes**, not vibes: leading pedestrian intervals (Seattle: −34% serious/fatal pedestrian crashes), road diets, daylighting + 20mph (Hoboken: years with zero deaths via cheap measures on routine repaving), speed cameras (DDOT: injuries −20%). A recommendation is credible only with a named mechanism + a cited effect size.
- **Equity is a transparent, toggleable overlay — never a hidden multiplier in a score.** Matches CLAUDE.md's ban on opaque weighting.
- **Hoboken is the cheap/static-friendly model:** low-cost, systemically-deployed fixes layered onto repaving. Bias generated recommendations toward proven, cheap, repeatable interventions.

### (A) Landing-page / key-insights ideas

- **A1 — "Where harm concentrates" hero (small).** _Shipped 2026-06-07_ as a defensible interim: "Wards 2, 7 and 8 account for ~49% of citywide KSI since 2024 while home to ~36% of residents," computed from the baked ward KSI + population, framed around DDOT's High Injury Network (linked). **Still open:** the stronger street-segment version ("X% of streets = Y% of KSI") needs the DC HIN layer + a crashes↔HIN spatial join in `pipeline/` — DDOT does not appear to publish DC's exact %/% figure, so it must be computed and source-shown.
- **A2 — Headline accountability scorecard (small).** _Shipped 2026-06-07._ Latest-full-year deaths + KSI (flagged preliminary), with an honest context line: ~43 deaths/yr in 2020-2024, peaking at 50 in 2024 — the missed zero-target year. Pipeline emits `scorecard` + `citywide_by_year`; handles the 2015 open-data anomaly (uses the settled 2020-2024 window) and recent-year reporting lag. _Open follow-up: reconcile open-data counts with DDOT's curated Vision Zero figures._
- **A3 — Multi-year trend with the "fewer injuries, more deaths" story (small).** _Shipped 2026-06-08_ as paired inline-SVG sparklines (deaths + people injured, 2015-present) on the landing page, with dashed preliminary-year tails and the divergence caption. Data from baked `citywide_by_year`.
- **A4 — "Who is being hurt" mode-share panel (small).** _Shipped 2026-06-08._ KSI by mode (driver/pedestrian/passenger/cyclist/other) as bars on the landing page, vulnerable road users highlighted, with the vulnerable share called out. Data from baked `ksi_by_mode` (per-mode fatal+major fields).
- **A5 — "Top corridors right now" insight cards (medium).** 3-5 auto-generated cards naming highest-KSI HIN corridors, each deep-linking to the map filtered to that corridor + its records. _Data: crashes joined to HIN/road segments, ranked by the visible triage heuristic._ Still open (needs the HIN join).

### (B) Policy-recommendation / evidence-card ideas

- **B1 — Standardized evidence-card component (medium).** _Shipped 2026-06-08._ Landing-page recommendation cards render the CLAUDE.md fields (problem, location, evidence+sources, mechanism, equity check, confidence badge, uncertainty) from [data/recommendations.json](data/recommendations.json), each deep-linking to a filtered map view. _Follow-up: ground more cards at intersection/corridor grain once the HIN join exists; reference stable crash IDs._
- **B2 — Countermeasure library with cited effect sizes (medium).** _Shipped 2026-06-08_ as [data/countermeasures.json](data/countermeasures.json) + a landing-page grid (LPI, daylighting, road diet, speed camera, curb extension, protected intersection, 20mph), each with mechanism + cited effect. Figures show an "unverified" badge until checked against the primary source.
- **B3 — Camera before/after evaluation cards (medium).** For each automated-enforcement camera, compare crash/injury counts before vs. after activation, with confidence + caveats (regression-to-mean, short windows). Does the quantified before/after even NYC's dashboard skips. _Data: Automated Safety Cameras (location + activation date) + nearby crashes + violations-by-month._
- **B4 — Recommendation → evidence-trail linking (small).** Every card deep-links to the map filtered to its location and to the underlying records/datasets. Fulfills the "never lose the source trail" north star. _Builds on the URL-state work already shipped._
- **B5 — Confidence + uncertainty badges from data completeness (small).** Derive the confidence label from sample size, geocoding confidence, recency, and presence of a denominator; show reasons on hover.
- **B6 — Equity check as a visible overlay (medium).** Toggleable layer overlaying HIN/crash clusters with DC equity indicators (ward, Equity Emphasis Areas) + a per-card equity note on who benefits / who bears enforcement burden.

### (C) Analysis / methodology ideas

- **C1 — KSI-only analysis mode (small).** _Shipped 2026-06-08._ "KSI only" toggle in the map toolbar restricts to killed-or-seriously-injured crashes (URL-synced, with KSI defined inline on hover). _Follow-up: also gate the hot-spot/ward tables on it._
- **C2 — Crash typing + mode filters (medium).** Filter by manner/type (pedestrian, rear-end, turning, fixed-object) and mode; surface the dominant type per corridor (type → specific fix). _Data: Crash Details collision-type/mode fields._
- **C3 — Transparent severity-weighted triage ranking, components always visible (medium).** Rank HIN segments by severity-weighted KSI with every component shown and labeled a triage heuristic — extends the existing ward triage score to segment grain.
- **C4 — Exposure-normalized rates where a denominator exists (large).** Crashes per VMT or per mile from DC Traffic Volume/AADT + centerline mileage; flag segments with no denominator as "rate unavailable." Extends the ward-denominator work to corridor grain.
- **C5 — Systemic-risk screen (large).** Flag segments sharing high-risk features of known KSI sites (wide multi-lane arterial, no protected crossing, high speed limit) even without a severe crash yet — FHWA systemic method; pairs with cheap systemic fixes.
- **C6 — Before/after change-explorer for any intervention (large).** Generic tool: pick a location + date (camera activation, road diet, repaving), see crash/injury trend before vs. after with explicit caveats. Generalizes B3; answers CLAUDE.md's "what changed after an intervention." _Data: crashes by date/location + an interventions/projects date table (may need assembling)._

### Suggested sequencing

Cheapest high-impact first, reusing what's shipped: **A2 → A1 → B2 → B1/B4 → A5 → C1**. The scorecard and HIN hero are small and use data already reachable; the countermeasure library and evidence-card component are the backbone every later recommendation renders through; corridor/segment-grain work (A5, C3, C4) depends on a crashes↔HIN/centerline join worth adding to `pipeline/`.

### Sources

- NYC Vision Zero View — <https://vzv.nyc/>
- SF Vision Zero HIN methodology — <https://www.visionzerosf.org/wp-content/uploads/2023/03/2022_Vision_Zero_Network_Update_Methodology.pdf>; SFMTA — <https://www.sfmta.com/vision-zero-sf>
- LA High Injury Network — <https://geohub.lacity.org/datasets/ladot::high-injury-network>
- Portland Vision Zero data/evaluation/cameras — <https://www.portland.gov/transportation/vision-zero/vision-zero-data>, <https://www.portland.gov/transportation/vision-zero/evaluation>, <https://www.portland.gov/transportation/vision-zero/safety-cameras>
- Seattle SDOT Leading Pedestrian Intervals — <https://www.seattle.gov/transportation/projects-and-programs/safety-first/vision-zero/leading-pedestrian-intervals>
- Hoboken Vision Zero milestone — <https://www.hobokennj.gov/news/city-of-hoboken-reaches-new-vision-zero-milestone-seven-consecutive-years-without-a-traffic-death>; Results4America case study — <https://catalog.results4america.org/case-studies/improving-traffic-safety-hoboken-nj>
- TfL Vision Zero + Inequalities map — <https://tfl.gov.uk/corporate/safety-and-security/road-safety/vision-zero-for-london>, <https://tfl.gov.uk/info-for/media/press-releases/2024/january/pioneering-map-of-london-shows-the-link-between-deprivation-and-road-casualties>
- FHWA Vision Zero Toolkit / Systemic Safety — <https://highways.dot.gov/sites/fhwa.dot.gov/files/2024-04/Vision%20Zero%20Toolkit%20508_0.pdf>, <https://highways.dot.gov/safety/data-analysis-tools/systemic/systemic-safety-project-selection-tool/element-1-systemic>
- Vision Zero Network "HIN for the WIN" — <https://visionzeronetwork.org/hin-for-the-win/>
- DDOT speed-camera study (TRB) — <https://ddot.dc.gov/sites/default/files/dc/sites/ddot/publication/attachments/Vision%20Zero%20Photo%20Enforcement%20-%20TRB%20Submission%20-%20Final.pdf>; DC missed 2024 target — <https://technical.ly/civic-news/vision-zero-dc-traffic-deaths/>

Verify every effect size and percentage against its primary source before publishing it in the UI (per the editorial promise); the figures above are research notes, not yet checked into the product.
