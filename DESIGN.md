# DESIGN.md - DC Vehicle Safety

> Visual, UX, accessibility, and editorial presentation system for the DC Vehicle Safety dashboard.
> Companion files: [CLAUDE.md](CLAUDE.md) covers project intent and data rules; [AGENTS.md](AGENTS.md) covers agent workflow.

---

## Product Posture

This is a public-record safety atlas with the posture of a Washington Post-style civic data investigation: direct, text-forward, sourced, restrained, and built for scrutiny.

The influence is newsroom design, not brand imitation. Do not copy The Washington Post masthead, proprietary fonts, logos, exact page furniture, or article templates. Borrow the useful design values: high-contrast type, disciplined grids, strong rule lines, dense but readable information, clear source trails, and calm authority.

The first screen should still be the tool itself: map/table, filters, key metrics, and selected evidence. Do not build a marketing landing page. Think "interactive local accountability desk", not campaign site and not SaaS analytics console.

---

## Visual Identity

The visual system should feel like a metro desk data story: black ink, white paper, thin gray rules, a serious serif headline voice, compact sans UI, and sparse red/blue accents.

Use red only for fatalities, severe warnings, urgent states, or editorial alerting. Use blue for links, selected states, and navigational affordances. Use neutral grays for most chrome. Avoid a one-note danger palette.

### Color Tokens

All colors live as CSS custom properties on `:root`, with optional `[data-theme="dark"]` overrides if dark mode is added. JS reads colors from CSS variables. Do not duplicate hex values in JS.

```css
:root {
  --bg: #f7f7f2;
  --paper: #ffffff;
  --surface: #ffffff;
  --surface-2: #f1f1ed;
  --rule: #111111;
  --border: #d7d7d2;
  --border-soft: #ebebe6;
  --text: #111111;
  --text-muted: #5f5f5a;
  --text-soft: #767670;

  --link: #1955a6;
  --link-hover: #123f7c;
  --accent: #b00020;
  --accent-soft: #f8e8e8;

  --severity-fatal: #9f1d20;
  --severity-major: #c94a27;
  --severity-minor: #b98718;
  --severity-property: #737373;

  --mode-walking: #4b2e83;
  --mode-biking: #0b6b50;
  --mode-driving: #5f6872;
  --mode-transit: #1955a6;

  --policy-engineering: #1955a6;
  --policy-speed: #9c6b12;
  --policy-enforcement: #6d4aa2;
  --policy-maintenance: #2f6f44;
  --policy-data: #5d6975;
}
```

Rules:

- Keep most screens black, white, and gray. Color appears when it carries meaning.
- Separate severity colors from mode colors and policy colors.
- Fatality red is not the link color, focus color, or generic CTA color.
- Use neutral, brand-adjacent colors for agencies and third parties. Do not imply official endorsement.

---

## Typography

The typography should evoke a serious newspaper without shipping proprietary or fetched fonts. Use system stacks only unless a future implementation has a documented reason to add a font.

```css
--font-serif: Georgia, "Times New Roman", Times, serif;
--font-sans: Arial, Helvetica, -apple-system, BlinkMacSystemFont,
             "Segoe UI", system-ui, sans-serif;
--font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
```

### Type Roles

| Role | Family | Treatment |
| --- | --- | --- |
| Masthead / product name | serif | bold, compact, black, never decorative script |
| Page headline | serif | large, tight line-height, no negative letter-spacing below mobile-safe sizes |
| Section head | serif | medium, separated by a black rule |
| Deck / summary | serif or sans | slightly larger body, muted, source-aware |
| Body / annotations | sans | compact, legible, no marketing tone |
| Controls / labels | sans | small, uppercase only where useful |
| Dates / IDs / metrics | mono | tabular numerals |

Rules:

- Use tabular numerals for every metric, table number, date, rate, and axis label.
- Avoid oversized hero type inside tool panels. Hero-scale serif belongs to article headers and major section openers.
- Uppercase labels may use modest positive tracking; prose uses `letter-spacing: 0`.
- Do not center long prose. Newsroom copy is left-aligned.

---

## Layout

Use a newsroom grid: narrow rule lines, clear columns, dense modules, and strong hierarchy. The map/table remains the primary surface.

Mobile-first breakpoints:

| Width | Shape |
| --- | --- |
| `< 640px` | single column, slim masthead, sticky tools, horizontal KPI strip, bottom-sheet details |
| `640-1023px` | two-column modules where useful, compact map/table controls |
| `>= 1024px` | primary map/table with a right-side evidence rail and article-like source modules |

Preferred desktop shell:

```text
masthead: product name, section label, source/update status
toolbar: search, filters, view tabs, export/share controls
summary: compact KPI strip with source/date line
main: map or table, filling most of the viewport
right rail: selected location, source records, recommendation rationale
methodology/footer: source list, refresh date, caveats
```

Rules:

- Use horizontal rules to divide sections; avoid floating decorative containers.
- The map/table gets priority over explanatory copy.
- Keep filters close to the data they affect.
- Use article modules, not bubbly cards. Borders are 1px rules; radii are 0-4px unless a control needs affordance.
- Avoid cards inside cards.
- Use stable dimensions for toolbars, map containers, KPI strips, and tables so loading text or hover states do not shift layout.
- Long tables get pagination or virtualization. Do not render tens of thousands of rows into the DOM.
- Large point layers need clustering, decimation, canvas rendering, or lazy-loading.

---

## Components

### Masthead

- Thin top rule, product title, and a compact source/update line.
- Product name is plain text, not an imitation newspaper logo.
- Navigation is quiet: small sans labels, black by default, blue on hover/focus.
- No oversized hero intro on the tool screen.

### Buttons and Controls

- Controls should look like newsroom utility controls, not app-store CTAs.
- Primary action: black or blue fill, white text.
- Secondary action: white fill, gray border, black text.
- Destructive/urgent action: red only when the action is actually destructive or safety-critical.
- Icon buttons for toolbar actions when a familiar icon exists.
- Segmented controls for map/table/timeline modes.
- Checkboxes for multi-select categories.
- Sliders or numeric inputs for threshold filters.
- Visible focus rings on every interactive element.
- Minimum touch target: 44px.

### KPI Strip

KPIs read like a newspaper stat row, not a dashboard scorecard wall.

- Fatal crashes
- Major injuries
- Pedestrian/bicycle involvement
- KSI rate when denominator exists
- High Injury Network share
- latest source capture date

Style:

- Large serif or mono number.
- Small uppercase label.
- One-line source/date note.
- Thin top or bottom rule.

Use raw count and rate together when possible. Do not imply a trend from one snapshot.

### Map

- The map should feel like an embedded investigative graphic.
- Markers encode one primary meaning at a time: severity, mode, recommendation, or project status.
- Legend must match the active encoding.
- Selection opens an evidence rail rather than a modal that hides the map.
- Mobile selection uses a bottom sheet.
- Never rely on color alone; marker shape, icon, stroke, or label should reinforce meaning where feasible.
- Do not use CSS filters on map panes to implement theme switching.

### Table

- Tables are first-class, like a published data appendix.
- Support sorting, filtering, and source drill-down.
- Use sticky headers for dense tables.
- Header rows use small sans labels and strong bottom rules.
- Render "Not available" / "Not geocoded" / "No denominator" explicitly.
- Numeric columns align with tabular numerals.
- Every row should have a path back to the source record.

### Evidence and Recommendation Modules

Recommendation modules should read like an editor's evidence box, not a generated answer blob.

Each module shows:

- headline
- location scope
- intervention type
- confidence
- evidence count
- rationale in one short paragraph
- top supporting facts
- source links
- uncertainty / caveats

Do not show only "recommended" or "not recommended". The rationale is the product.

### Hotspot Ranking

Hotspot rows are evidence leads, not final conclusions.

- Show the location name, ward, crash count, fatal/major injury count, and score components close together.
- Label the geographic grain: intersection/address, corridor, ward, grid cell, ANC, or project area.
- Let each ranked row jump back to the map.
- Keep ward context visible even when the primary view is an intersection or corridor.
- Do not use raw ward rank as a risk claim unless exposure denominators are present.

---

## Editorial Presentation

### Source Lines

Every chart, KPI, recommendation, and table detail needs visible source context:

- Source: agency or dataset
- Captured: YYYY-MM-DD
- Updated by source: when available
- Link: source record or catalog page

Source lines should be compact but visible. Treat them like bylines or footnotes, not hidden metadata.

### Labels

Use user-facing labels:

- "Fatal crashes", not `fatal_count`.
- "People walking", not `pedestrian`.
- "No denominator", not `null`.
- "As of 2026-05-27", not "current" unless the source actually promises real-time data.

### Policy Language

Use mechanism-first labels:

- "Reduce turning conflicts"
- "Lower operating speeds"
- "Shorten crossing distance"
- "Improve visibility"
- "Protect bike lane continuity"
- "Repair missing or damaged infrastructure"

Avoid vague labels:

- "Make safer"
- "Improve awareness"
- "Fix traffic"
- "High-risk area" without explaining the risk basis.

### Newsroom Voice

- Short, declarative headlines.
- Decks explain the finding, not the product feature.
- Captions state what the reader is seeing and why it matters.
- Distinguish observed facts from analysis and recommendations.
- Avoid advocacy slogans in UI labels; the evidence should carry the force.

---

## Accessibility

Baseline requirements:

| Concern | Requirement |
| --- | --- |
| Landmarks | semantic `header`, `nav`, `main`, `aside`, `footer` |
| Skip link | first focusable element |
| Focus | `:focus-visible` ring on every control |
| Color contrast | at least WCAG AA for text/background pairs |
| Motion | respect `prefers-reduced-motion` |
| Live updates | announce result counts/filter changes with `aria-live="polite"` |
| Forms | grouped filters use `fieldset` and `legend` |
| Maps | selected feature details are accessible outside the map canvas |
| Touch | interactive targets at least 44px |

No chart or map may rely on hover-only information.

---

## Performance Constraints

Design choices that affect speed:

- System fonts only by default.
- No backdrop blur on map overlays.
- No large SVG marker forests for high-volume point layers.
- Lazy-load non-default layers.
- Paginate or virtualize large tables.
- Preload critical JSON if using a static site.
- Keep first paint small; defer expensive analysis panels until needed.
- Use responsive images only if real imagery is added.

Performance is part of credibility. A civic safety tool that freezes on a phone has failed its audience.

---

## Mobile Rules

- The first mobile viewport should show the product name, key filter/search affordance, and at least part of the map/table.
- KPI strips scroll horizontally rather than stacking into a wall of cards.
- Detail panels use bottom sheets.
- Filters can collapse, but active filters must remain visible and reversible.
- Avoid sideways-scrolling data tables. Use stacked row cards or detail disclosures when columns cannot fit.
- Test at 375px width before declaring UI work done.

---

## What This Interface Does Not Do

- No Washington Post logo, masthead copy, proprietary font, or exact visual clone.
- No decorative gradient orbs or purely atmospheric backgrounds.
- No generic SaaS card wall where the map/table should be.
- No hidden source trail.
- No red-only fear palette.
- No dark, blurred, stock-like imagery.
- No landing page as the default first screen.
- No "trust me" AI summaries without source-backed evidence cards.
- No horizontal table overflow on phone as the only mobile strategy.

---

## When To Revisit This File

Update this document when:

- the stack changes,
- a real design system lands in code,
- the intervention taxonomy changes,
- the map encoding changes,
- the project adds dark mode,
- a UAT session finds a recurring usability problem,
- a data limitation requires a new public-facing caveat pattern.
