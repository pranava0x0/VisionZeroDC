# Issues Log — PR #5 Review Comments

_Last updated: 2026-06-08_

---

## Critical Issues (Must Fix Before Merge)

### [PR5-001] Spatial Error: New York Avenue NE has wrong coordinates
- **Severity**: critical
- **File**: data/hotspots.geojson (corridor_001)
- **Status**: open
- **Description**: Coordinates [-77.0318, 38.9055] to [-77.0280, 38.9265] point to 14th Street NW, not New York Avenue NE. Correct location: Mt Vernon Square (-77.02) to Bladensburg Road (-76.97).
- **Impact**: Hotspot map displays corridor in wrong DC quadrant
- **Complexity**: low

### [PR5-002] Data Quality: Corridor 1 & 2 have identical metrics (statistically improbable)
- **Severity**: critical
- **File**: data/hotspots.geojson, data/recommendations.json
- **Status**: open
- **Description**: Both New York Ave NE and South Capitol St show 427 injuries, 2 fatalities, 429 KSI. Mode breakdowns don't sum: NYA (45+20+60+22=147), SCS (50+15+55+20=140), both vs claimed 429 KSI.
- **Impact**: Data integrity compromised; contradicts editorial promise ("every claim links to primary source")
- **Fix Required**: Verify Open Data DC primary source; input correct, differentiated statistics
- **Complexity**: medium (requires data research)

### [PR5-003] UX Regression: Solutions tab carousel hides content on desktop
- **Severity**: high
- **File**: index.html, style.css (.section-carousel)
- **Status**: open
- **Description**: Carousel pattern (tabs hide sections) applied to both desktop AND mobile. Desktop has room for vertical layout. Also: labels are informal ("Recs", "Orgs", "Methods").
- **Fix Required**: Apply carousel ONLY @media (max-width: 640px). Desktop: vertical layout of all sections. Full label names: "Recommendations", "Organizations", "Countermeasure Library".
- **Complexity**: low

### [PR5-004] Accessibility Violation: Navigation touch targets < 44px WCAG minimum
- **Severity**: high
- **File**: style.css (.site-nav .nav-links a)
- **Status**: open
- **Description**: min-height: 40px (should be 44px). Font-size clamped to 0.75rem/12px (hard to read). Violates WCAG and DESIGN.md.
- **Fix Required**: Restore 44px minimum. Use mobile hamburger menu pattern instead of forcing single-line nav.
- **Complexity**: medium

### [PR5-005] CSS Layout Bug: Mobile toggles visible on desktop
- **Severity**: high
- **File**: style.css (.cm-toggle, .org-toggle)
- **Status**: open
- **Description**: "Show all" buttons visible on desktop as sticky containers (wrong). Missing CSS rule to hide on desktop.
- **Fix Required**: Add display: none for .cm-toggle, .org-toggle @media (min-width: 641px)
- **Complexity**: low

---

## High-Priority Issues (Should Fix)

### [PR5-006] Navigation Alignment Regression: Brand centered instead of left
- **Severity**: medium
- **File**: style.css (.site-nav)
- **Status**: open
- **Description**: Lost standard header hierarchy (brand left, links right). Brand now centered.
- **Fix Required**: Restore justify-content: space-between OR margin-left: auto pattern
- **Complexity**: low

### [PR5-007] Hard-coded Design Tokens: Colors in JS instead of CSS variables
- **Severity**: medium
- **File**: hotspots.js, style.css
- **Status**: open
- **Description**: Hex colors (#ba3535, #ff5a00, #9c7a16) hard-coded. Violates DESIGN.md (colors must live in :root, JS reads from variables).
- **Fix Required**: Use only CSS custom properties. JS retrieves via getComputedStyle().
- **Complexity**: low

### [PR5-008] Unhandled JS Exception: selectCorridor() doesn't guard map failure
- **Severity**: medium
- **File**: hotspots.js
- **Status**: open
- **Description**: Clicking corridor card throws error if Leaflet CDN fails. No guard check before map.fitBounds().
- **Fix Required**: Add if (!map || typeof L === 'undefined') return; at start of selectCorridor()
- **Complexity**: low

---

## Medium-Priority Issues

### [PR5-009] Architecture Violation: Inline CSS in hotspots.html
- **Severity**: medium
- **File**: hotspots.html (200+ lines <style>)
- **Status**: open
- **Description**: CSS fragmentation. Should consolidate to central style.css.
- **Fix Required**: Migrate to style.css under /* High-Injury Corridors Page */ section
- **Complexity**: medium

---

## Low-Priority Issues

### [PR5-010] Documentation Bloat: 6 redundant markdown files
- **Severity**: low
- **File**: Root directory
- **Status**: open
- **Description**: ~2,500 lines of redundant docs (PHASE_1_1_HOTSPOT_WIREFRAMES.md, IMPLEMENTATION_ROADMAP.md, ACTION_PLAN_30_DAYS.md, NEXT_STEPS_SUMMARY.md, SESSION_SUMMARY_2026-06-07.md, WORK_COMPLETED_2026-06-07.md).
- **Fix Required**: Consolidate into single ROADMAP.md. Delete 6 intermediate files.
- **Complexity**: low

