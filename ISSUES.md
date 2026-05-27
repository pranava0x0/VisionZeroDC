# Issues Log

_Last updated: 2026-05-27_

---

## Open Issues

None currently known from the latest local verification pass.

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
