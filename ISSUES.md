# Issues Log

_Last updated: 2026-06-08_

---

## Open Issues

### [DATA-AUDIT-001] Site-wide link & claim audit — dead links and unverified figures
- **Severity**: high (editorial integrity)
- **Page/Section**: `index.html` data (recommendations, organizations), `hotspots.html`
- **Discovered**: 2026-06-08
- **Status**: resolved
- **Method**: Extracted every external URL from `index.html`, `map.html`, `hotspots.html`, the site JS, and `data/*.json`, then HTTP-checked each (browser UA to distinguish bot-blocks from real 404s). Read every claim/source pair in `recommendations.json`, `countermeasures.json`, `organizations.json` and cross-checked against `crash-summary.json` provenance.
- **Findings & fixes**:
  - **Dead link** `www.hobokennj.gov/departments/traffic-safety-unit` (404) backed a garbled claim ("cuts school-zone crashes by 10–15 mph speed reduction" — nonsensical units). Reworded to a defensible school-zone-package claim; re-sourced to the FHWA Vision Zero Toolkit. (`recommendations.json` rec-school-zone-safety)
  - **Dead link** `ddot.dc.gov/publication/adaptive-signal-control-plan` (404) backed a fabricated stat ("pedestrian detection achieves 93% accuracy"). Removed the fabricated evidence item; kept the FHWA-sourced, honestly-hedged adaptive-signal claim. (`recommendations.json` rec-adaptive-signals-and-detection)
  - **Internal inconsistency**: rec-protected-intersections claimed "New York Avenue NE … 427 injuries and 2 fatalities" while `hotspots.geojson` says 438/3. Both are unverified; reworded to a "preliminary corridor screen" framing rather than asserting a precise count as an Open Data DC fact.
  - **Unverified precise figures** ("~41% of schools have crossing guards" / "59% gap") had only a homepage link. **Resolved 2026-06-08**: removed the unsourced percentages entirely and replaced them with the verified DDOT figure (214 crossing-guard posts across 135 schools for 2025-26, per the DDOT School Crossing Guard Program page), noting per-ward coverage is not published; recommendation confidence lowered high→medium since the local gap magnitude is now honestly unquantified. Updated in `recommendations.json`, `HOTSPOTS_AND_POLICIES.md`.
  - **Organization with placeholder URL**: "Ward 8 Bike Alliance & Conservation Groups" reused the Safe Streets Coalition URL. Verified the **Ward 8 Bike Alliance** is real (founder Marvin Brown, Congress Heights; Transportation Equity Platform cosponsor); corrected name, description, and URL (`waba.org/network/`). (`organizations.json`)
  - **Corridor figures provenance**: surfaced the GeoJSON's existing "verification in progress" caveat in the `hotspots.html` footer so per-corridor counts are presented as a preliminary screen, not settled facts.
- **Verified-real (no change needed)**: DCTEN (`ggwash.org/dcten`, 403 = bot-block), FHWA toolkit & TfL (403 bot-blocks), all other org/source URLs (200). `crash-summary.json` headline numbers have solid provenance (`pipeline/snapshot.py`, live ArcGIS query URLs, honest caveats). `countermeasures.json` already carries a "research-grade until verified" note.
- **Ward-population denominator (2026-06-08, partial)**: removed the bare Wikipedia citation and re-sourced the denominator honestly — values are now labeled ~2022 ward-level estimates on the 2022 ward boundaries (boundary-consistent with crash ward assignment), compiled via a secondary compilation of DC OP / DC Health Matters figures and anchored to the **verified 2020 U.S. Census total of 689,545** (redistricting balanced each ward toward ~86,193, ±5%; both confirmed against DC Office of Planning). The exact 2020-decennial count per *new* (2022) ward was not cheaply extractable from DC OP (PDF/map tables) within budget, and the readily-available 2020 figures are tabulated to the *old* (2012) boundaries, which would bias Wards 7/8 rates — so the boundary-consistent estimates were retained with transparent provenance rather than substituted. Updated `ward-denominators.json`, `crash-summary.json` (metadata only; population values and computed rates unchanged), `recommendations.json`, `llms-full.txt`, `HOTSPOTS_AND_POLICIES.md`.
- **Still open**: reconfirm each per-ward population value against the DC Office of Planning per-ward tables (or substitute the 2020-Census-on-2022-boundaries decennial counts) to fully retire the secondary-compilation provenance; compute real per-corridor crash counts via an intersection/HIN spatial join (see BACKLOG.md).

### [BUG-010] Hotspots map fails to load — invalid Leaflet SRI hash
- **Severity**: high
- **Page/Section**: `hotspots.html` / High-Injury Corridors map
- **Discovered**: 2026-06-07
- **Status**: resolved
- **Resolution**: 2026-06-07
- **Description**: The hotspots map never rendered. The sidebar cards loaded, but the map area showed `Error loading map: L is not defined`. The `<script>` tag for Leaflet 1.9.4 in `hotspots.html` carried a fabricated `integrity` (SRI) hash (`sha256-nMMmRyWjMoJJV9vvKKH8qP8KqJhxxMJC5K9BqwhYBwg=`). The browser computed a different hash for the fetched file, failed the integrity check, and refused to execute `leaflet.js`, so `L` was undefined when `initMap()` ran. `map.html` already used the correct hash; only `hotspots.html` was affected.
- **Steps to Reproduce**:
  1. Open `hotspots.html` via a local static server.
  2. Observe the sidebar loads but the map shows `Error loading map: L is not defined`.
  3. Console shows `ReferenceError: L is not defined` at `initMap`.
- **Fix**: Replaced the integrity attribute with the correct subresource hash `sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=` (verified via `curl ... | openssl dgst -sha256 -binary | openssl base64`). Local browser verification confirms Leaflet loads, all 5 corridor polylines render over OpenStreetMap tiles, and corridor selection (card click → map pan/highlight) works.
- **Regression tests**: `tests/html-integrity.test.mjs` — asserts every remote subresource pins SRI + crossorigin, that a given CDN URL uses the same hash across all HTML files (the direct BUG-010 catch), and that Leaflet pins its known-good published hashes. Also added `tests/hotspots-data.test.mjs` to validate the GeoJSON the map renders (schema, `ksi == injuries + fatalities`, DC-bounds coordinate check that also regresses PR5-001). Verified the consistency test fails when the bad hash is reintroduced. Run with `node --test`.

### [UAT-004] Excessive page scrolling requires content truncation/disclosure
- **Severity**: high
- **Page/Section**: All tabs (Home, Analysis, Solutions)
- **Discovered**: 2026-06-07
- **Status**: resolved
- **Resolution**: 2026-06-07 (continued)
- **Description**: 
  - Mobile: Page height 8164px required 10+ screen scrolls to reach countermeasures section
  - Tablet: Similar scrolling burden with long vertical content stack
  - This violated DESIGN.md guidance on progressive disclosure
- **Fixes Applied (2026-06-07)**:
  1. ✓ Reduced organizations from full display to truncated toggle on mobile
  2. ✓ Reduced countermeasures truncation
  3. ✓ Updated JavaScript setup functions to match CSS limits
- **Verification**: Mobile UAT (375px) shows page height now 4074px (50% reduction). Countermeasures section accessible without excessive scrolling. Significant improvement in mobile UX.

### [UAT-005] Tab switching does not always scroll to top of new content
- **Severity**: low
- **Page/Section**: Tabs navigation
- **Discovered**: 2026-06-07
- **Status**: resolved
- **Resolution**: 2026-06-07 (continued)
- **Description**: Clicking a tab on tablet/mobile does not guarantee scroll to top of the new tab's content. User may be confused whether click registered if content appears off-screen below.
- **Verification**: Tested on mobile (375px): scrolled deep into Fixes tab recommendations, clicked Home tab, page smoothly scrolled to top. Behavior confirmed working correctly.

### [UAT-006] Mobile tab labels may be cut off on smallest devices
- **Severity**: low
- **Page/Section**: Tab button navigation
- **Discovered**: 2026-06-07
- **Status**: resolved
- **Resolution**: 2026-06-08 — tab labels were shortened to "Home / Data / Fixes" (fix (c) from the suggested options). Verified at 375px via the browser preview: no tab is clipped (each button's `scrollWidth` ≤ its rendered width) and the `.tabs-nav` does not overflow (scrollWidth == clientWidth == 375). Screenshot confirms all three labels render fully.

### [UAT-007] ANC "Open in email" action below the 44px touch target
- **Severity**: low (accessibility)
- **Page/Section**: `anc.html` — resolution draft actions
- **Discovered**: 2026-06-08 (UAT of the new ANC Safety Brief)
- **Status**: resolved
- **Description**: The draft actions row mixes `<button>` (Copy, Print) and an `<a>` ("Open in email", a `mailto:` link). The global `button, select { min-height: 44px }` rule gave the buttons a compliant touch target, but the anchor rendered at ~37.5px tall, under the WCAG 44px minimum used across the site.
- **Fix**: `.anc-btn` now uses `display: inline-flex; align-items: center; justify-content: center; min-height: 44px;` so every action — button or anchor — meets the touch-target minimum. Confirmed the served stylesheet carries the rule.

---

## Resolved Issues

### [UAT-001] Leaflet CSS is blocked by an invalid Subresource Integrity hash
- **Severity**: high
- **Page/Section**: App shell / external assets
- **Discovered**: 2026-05-27
- **Resolved**: 2026-05-27
- **Status**: resolved
- **Description**: Browser console reports that `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css` is blocked because the `integrity` hash in `index.html` does not match the downloaded stylesheet. The local fallback Leaflet CSS keeps the map usable in current tests, but the app is still shipping a blocked external stylesheet and could lose expected Leaflet styling if the fallback is incomplete.
- **Screenshots**: `uat-screenshots/2026-05-27_desktop_initial.png`, `uat-screenshots/2026-05-27_tablet_initial.png`, `uat-screenshots/2026-05-27_mobile_initial.png`
- **Steps to Reproduce**:
  1. Open `http://localhost:8050/index.html`.
  2. Open the browser console.
  3. Observe the invalid digest error for the Leaflet CSS file.
- **Fix**: Updated the Leaflet CSS SRI hash in `index.html`; local browser verification no longer reports the blocked stylesheet.

### [UAT-002] Missing favicon creates a 404 console error
- **Severity**: low
- **Page/Section**: App shell / browser metadata
- **Discovered**: 2026-05-27
- **Resolved**: 2026-05-27
- **Status**: resolved
- **Description**: Browser requests `/favicon.ico`, but the static server returns `404 File not found`. This does not block app usage, but it adds avoidable console noise during UAT and can obscure more meaningful asset failures.
- **Screenshots**: `uat-screenshots/2026-05-27_desktop_initial.png`
- **Steps to Reproduce**:
  1. Open `http://localhost:8050/index.html`.
  2. Open the browser console or network panel.
  3. Observe the `404 File not found` response for `/favicon.ico`.
- **Fix**: Added a data-URI SVG favicon link in `index.html`; local browser verification no longer reports the favicon 404.

### [UAT-003] Dense crash points are difficult to select directly on the map
- **Severity**: low
- **Page/Section**: Crash map interaction / Selected record panel
- **Discovered**: 2026-05-27
- **Resolved**: 2026-05-27
- **Status**: resolved
- **Description**: In the dense downtown crash layer, repeated clicks on visually dense point clusters did not update the Selected record panel from `Pick a crash`. Hotspot row selection worked, but individual crash inspection by direct map click is hard because the canvas-rendered points are small and overlap heavily.
- **Screenshots**: `uat-screenshots/2026-05-27_desktop_crash_click_attempt.png`
- **Steps to Reproduce**:
  1. Open `http://localhost:8050/index.html` on desktop with default filters.
  2. Wait for crash points to draw.
  3. Click several dense point clusters around downtown DC.
  4. Observe whether the Selected record panel changes from `Pick a crash`.
- **Fix**: Added a nearest-drawn-crash click fallback on the map and increased Canvas renderer tolerance so clicks near dense points can update the selected incident file.

---

## UAT Run Notes

### 2026-05-27
- **Duration**: 5m09s combined timed browser UAT.
- **Environment**: Local static server at `http://localhost:8050`, Playwright using system Google Chrome.
- **Viewports tested**: desktop `1440x900`, desktop `1280x800`, tablet `768x1024`, mobile `390x844`, mobile `360x740`.
- **Flows tested**: initial load, date filter, severity filter, mode filter, moving violations toggle, violations month change, hotspot row click, crash point click attempt, keyboard tab order, mobile detail scrolling, rapid filter changes, repeated tablet filter loops.
- **Passed areas**: responsive layout had no page-level horizontal overflow in tested viewports; visible controls met 44px touch-target checks; hotspot ranking loaded with ward context; moving violations overlay and month selector worked; rapid filter changes settled without a permanent loading state.
