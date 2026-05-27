# UAT Baseline - DC Vehicle Safety

_Created: 2026-05-27_
_Last run: 2026-05-27_

## Project Info

- **Stack**: Static HTML/CSS/JS with Leaflet.
- **Dev server**: `python3 -m http.server 8050` -> `http://localhost:8050`
- **Entry point**: `index.html`
- **Main logic**: `app.js`
- **Styles**: `style.css`
- **Known supporting docs**: `CLAUDE.md`, `DESIGN.md`, `BACKLOG.md`, `ISSUES.md`

## Key UI Sections

- Masthead and source line.
- Filter toolbar: date range, severity, mode, moving violations toggle, violations month, refresh.
- KPI strip: crashes drawn, matching current view, fatal crashes, major injury crashes, latest report date.
- Leaflet crash map.
- Right rail / stacked mobile panel: policy focus hotspots, selected crash details, official sources, layer notes.

## Critical Flows

Run these every UAT pass:

1. **Initial map load**: Open the app, wait for Open Data DC queries, confirm KPIs update and the map draws crash points.
2. **Filter update**: Change date, severity, and mode filters; confirm KPI totals, map points, and hotspot rows update.
3. **Hotspot drilldown**: Click a top hotspot row; confirm the map zooms/highlights the hotspot and shows ward context.
4. **Crash detail drilldown**: Select a crash point; confirm the Selected record panel changes and related Crash Details rows load.
5. **Moving violations context**: Enable the overlay, change month, and confirm the month selector appears and the map notice updates.
6. **Responsive smoke test**: Check mobile, tablet, and desktop for horizontal overflow, usable controls, and readable evidence panels.
7. **Keyboard smoke test**: Tab through skip link, filters, overlay toggle, refresh, map controls, and source links.

## Sections And Last Tested

| Section | Last Tested | Notes |
| --- | --- | --- |
| App shell / initial load | 2026-05-27 | Passed local smoke; Leaflet CSS SRI and favicon issues resolved. |
| Filter toolbar | 2026-05-27 | Passed normal and rapid filter changes. |
| KPI strip | 2026-05-27 | Updates after queries; horizontal scrolling on narrow phones is intentional. |
| Crash map | 2026-05-27 | Draws points; nearest-crash click fallback opened an incident file in desktop, tablet, and mobile smoke tests. |
| Hotspot ranking | 2026-05-27 | Loads ward-aware ranking rows and map popup on row click. |
| Moving violations overlay | 2026-05-27 | Toggle and month selector worked in tested runs. |
| Responsive layout | 2026-05-27 | No page-level horizontal overflow or undersized visible controls at tested desktop, tablet, and mobile sizes. |
| Keyboard navigation | 2026-05-27 | Basic tab order reached core controls and map controls. |

## Known Stable Areas

- Responsive layout at tested mobile/tablet/desktop sizes.
- Hotspot ranking with ward context.
- Moving violations toggle and month change.
- Rapid filter changes eventually settle and do not leave the UI permanently loading.

## Known Flaky / Unstable Areas

- Live DC ArcGIS latency can make the first load feel slow, especially on broad citywide filters.

## Exploration Notes

- Keep testing with real DC ArcGIS endpoints because latency and pagination are part of the UX.
- Add targeted tests for crash detail loading once direct point selection is improved or table-driven selection exists.
- Future UAT should include a full-page screenshot after the detail panel loads on mobile.
