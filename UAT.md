# UAT Baseline — Vision Zero DC Safety Dashboard

_Created: 2026-05-27_
_Last run: 2026-06-08 (ANC Safety Brief, hotspot teaser, source audit)_

## Project Info
- **Stack**: Static HTML/CSS/JavaScript (vanilla, no framework)
- **Dev server**: `python3 -m http.server 8051` → `http://localhost:8051`
- **Pages**: `index.html` (three-tab safety overview + hotspot teaser; `landing.js`), `map.html` (crash map; `app.js`), `hotspots.html` (high-injury corridors; `hotspots.js`), `anc.html` (ANC Safety Brief; `anc.js` + `src/anc-logic.js`)
- **Styles**: `style.css` with Sidewalk Labs–inspired design tokens
- **Data**: baked JSON (`data/crash-summary.json`, `data/countermeasures.json`, `data/recommendations.json`, `data/organizations.json`)
- **Supporting docs**: `CLAUDE.md` (editorial promise, data principles), `DESIGN.md` (visual system), `BACKLOG.md`, `ISSUES.md`

## Key UI Sections
- **Masthead**: Headline "Making DC streets safer — and what works" with editorial seal
- **Tab navigation**: Three main tabs with active indicator (yellow underline)
  - Home: Toll and concentration metrics
  - What the data supports: Trends and mode breakdown
  - How to fix it: Recommendations, organizations, countermeasures
- **Dynamic sections**: Load data from JSON files (graceful fallback if unavailable)
  - Organizations: 10 DC advocacy/government groups with focus areas and initiatives
  - Recommendations: Evidence-backed policy suggestions with confidence levels
  - Countermeasures: Proven interventions with effectiveness data

## Critical Flows

1. **Tab Switching**: Click each tab → verify correct content displays, no overlap from other tabs, yellow underline follows selection
2. **Organizations Loading**: Scroll to "Who's working on this" section → verify all 10 organizations render, focus tags styled correctly, links functional
3. **Mobile Responsiveness**: Resize to 375px, test all three tabs, verify no horizontal overflow, recommendations use "Details" disclosure pattern
4. **Tab Scroll-to-Top** (added 2026-06-07): Scroll down in one tab, click another tab → page should scroll to top of new content

## Sections & Last Tested

| Section | Last Tested | Status | Notes |
| --- | --- | --- | --- |
| Home tab | 2026-06-07 | ✅ Stable | Toll (22 deaths, 326 KSI) and concentration cards display |
| Analysis tab | 2026-06-07 | ✅ Stable | Trend chart (2015–2026) and mode bar chart render correctly |
| Solutions tab | 2026-06-07 | ✅ Stable | Recommendations cards display with confidence badges |
| Organizations | 2026-06-07 | ✅ Stable | All 10 cards render; scroll-heavy on mobile (4000–6000px) |
| Countermeasures | 2026-06-07 | ⚠️ Unreachable | Library exists at page bottom but requires excessive scrolling |
| Tab navigation | 2026-06-07 | ⚠️ Functional | Switching works; scroll-to-top code present but untested on tablet |
| Mobile layout | 2026-06-07 | ✅ Responsive | Adapts well, but page height 8164px violates progressive-disclosure guidance |

## Known Stable Areas
- Tab switching state management and content isolation
- Organization data loading and card rendering (10 groups)
- Responsive grid layouts (desktop 2–3 cols, tablet 2 cols, mobile 1 col)
- Focus tag styling (yellow backgrounds, dark text)
- External link functionality on org cards
- Recommendation "Details" disclosure on mobile (good UX pattern)

## Known Unstable / Problem Areas

### [UAT-004] Excessive scrolling — Page height 8164px
- **Severity**: HIGH
- **Root cause**: Organizations section displays all 10 full-width cards, stacked 4000–6000px on mobile
- **Impact**: Countermeasures section effectively unreachable; poor mobile UX
- **Status**: In [BACKLOG.md] — needs progressive disclosure (show 2–3 orgs + "Show all" button)

### [UAT-005] Tab scroll-to-top inconsistent
- **Severity**: LOW
- **Observed**: Code exists (`panel?.scrollIntoView()`) but behavior untested on tablet
- **Recommendation**: Verify smooth scroll fires reliably across viewports

### [UAT-006] Tab label cutoff on narrow phones
- **Severity**: LOW
- **Issue**: "How to fix it" text may be partially cut off at 375px width
- **Options**: Abbreviate to "Fixes" or make tabs horizontally scrollable

## Exploration Notes

### What to Test Each Run (2026-06-07 baseline)
1. Verify all 10 organizations load: `document.querySelectorAll('.org-card').length === 10`
2. Scroll entire "How to fix it" tab on mobile (375px) — measure time, note pain points
3. Check browser console for JS errors
4. Tab switching from different scroll positions — does scroll-to-top work?
5. Mobile recommendations: Verify "Details" toggle expands/collapses without errors
6. Organization card descriptions: Check for text truncation (none observed in 2026-06-07 run)

### Recent Changes (2026-06-07)
- Added 4 new organizations: Coalition for Smarter Growth, Sierra Club DC, Capital Trails Coalition, ONSE
- Fixed heading: "What the data supports" → "Recommended interventions" (removed tab-name conflict)
- Tested all three tabs on desktop, tablet (768px), mobile (375px)
- Identified scrolling as primary UX issue (page height 8164px)

---

## Next UAT Focus
- [ ] Test tab scroll-to-top on tablet with rapid clicks
- [ ] Implement organizations disclosure on mobile (show 2–3 + "Show all")
- [ ] Measure page height reduction after disclosure implementation
- [ ] Verify countermeasures section becomes accessible
- [ ] Test deep linking / URL fragments to sections

---

## UAT Run — 2026-06-08 (ANC Safety Brief, hotspot teaser, source audit)

**Environment:** local static server, Claude preview browser. Viewports: desktop + mobile (375px). Method: scripted DOM/interaction checks + screenshots + console-error sweep on every page.

**Scope:** new `anc.html` page, new home-tab hotspot teaser, and a regression sweep of `index.html` / `map.html` / `hotspots.html` after the shared nav gained a "For ANCs" link.

**Flows tested**
- **Hotspot teaser (home tab):** top 2 corridors render with rank/priority/severity/top-fix, link to `hotspots.html`, and a preliminary-screen caveat note. Verified desktop + mobile (cards stack at ≤720px). No console errors.
- **ANC Safety Brief:** ward `<select>` drives the brief; deep-link `#ward-N` pre-selects; selecting a ward updates the hash. Verified Ward 7 (3 corridors, ward + citywide recs), Ward 8 (2 corridors), and Ward 3 (no-corridor empty state + citywide-only recs). Resolution draft generates with the editorial caveat baked in; `mailto:` href is well-formed (`subject` + `body`); Copy falls back to manual select in a non-secure context; Print button present. Pure logic now lives in `src/anc-logic.js` (14 unit tests).
- **Cross-page nav:** "For ANCs" link present and resolving on all four pages.
- **Regression:** `map.html` and `hotspots.html` still load Leaflet, tiles, and content (hotspots sidebar = 5 corridors) with no console errors.
- **Responsiveness:** no horizontal overflow at 375px on the new page; corridor/rec grids collapse to one column.

**Findings**
- **[UAT-007] (fixed)** — the "Open in email" action was a styled `<a>` (~37.5px tall), under the 44px touch-target minimum that the global `button, select` rule gives the other actions. Fixed by giving `.anc-btn` `display:inline-flex` + `min-height:44px` so the anchor variant meets the target too.
- **By design** — the Copy button uses the async Clipboard API with a "press Cmd/Ctrl+C" fallback; the API is unavailable in non-secure/headless contexts, so the fallback path is the one exercised in preview. Working as intended.

**Result:** all four pages pass; 58 node tests + 11 python tests green.
