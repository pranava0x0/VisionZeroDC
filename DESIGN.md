# DESIGN.md - DC Vehicle Safety

> Visual, UX, accessibility, and editorial presentation system for the DC Vehicle Safety dashboard.
> Companion files: [CLAUDE.md](CLAUDE.md) covers project intent and data rules; [AGENTS.md](AGENTS.md) covers agent workflow.

---

## Product Posture

This is a public-record safety atlas with the posture of a Washington Post-style civic data investigation: direct, text-forward, sourced, restrained, and built for scrutiny. The product identity, voice, and editorial promise are the anchor; they do not change with the visual skin.

The influence is newsroom design values, not brand imitation. Borrow the useful ones: high-contrast type, disciplined grids, dense but readable information, clear source trails, and calm authority. Do not lapse into a marketing or promotional voice. Separate observed facts, modeled estimates, and policy judgments; surface missingness; keep every number traceable to a primary source.

The first screen should still be the tool itself: map/table, filters, key metrics, and selected evidence. Do not build a marketing landing page. Think "interactive local accountability desk", not campaign site and not SaaS analytics console.

---

## Visual Theme — Sidewalk-inspired skin (current)

The **posture above is fixed**; the *visual theme* below is a narrower implementation layer — currently a Sidewalk-Labs-inspired skin — that can be re-themed without touching product identity, information priorities, the editorial promise, or the data/severity semantics. Treat it as a polish experiment, not a redefinition of the project. If it ever fights the restrained civic-data posture (e.g. reads as a brand campaign), the posture wins.

The skin is reconstructed from the archived `sidewalklabs.com` (Wayback Machine, 2020) — values, not assets. Do not copy their logo, proprietary fonts (the site used **Circular Pro** for headings/UI and **Freight Text Pro** for body; the print "Yellow Book" used Beatrice and Neue Droschke), page furniture, or marketing copy; the type is approximated with web-safe stacks. What it borrows: a single signature yellow used with discipline, heavy geometric-sans headlines over serif body, warm near-black ink on a light canvas, a buttery cream tint for emphasis blocks, soft rounding, and generous whitespace.

---

## Visual Identity

The theme is built on three moves: **a light warm-neutral canvas, warm near-black ink (`#262626`), and one signature yellow (`#ffcf2b`).** Headlines are large and heavy in a **geometric sans**; body prose is set in a **serif** (approximating the site's Circular Pro headings + Freight Text Pro body). Supporting accents (deep-blue link, brick-red urgency, mode and severity hues) are a flat palette used only when they carry meaning. Surfaces are lightly rounded; the buttery cream `#fdf5d1` and the yellow do the section-marking that hairline rules used to do — but the information hierarchy and source-first discipline of the posture are unchanged.

The yellow is the theme accent, used with restraint: the top-of-page brand bar, the active navigation pill, label ticks, the highlight behind a key phrase, the underline under a KPI number, primary-button hover, and selected filter controls. It is a wayfinding and emphasis color, never a severity or status color.

Use red only for fatalities, severe warnings, urgent states, or editorial alerting. Use blue for links, selected text states, and navigational affordances. Keep most of the canvas paper, ink, and yellow; let the flat accent palette appear only where it encodes data.

### Color Tokens

All colors live as CSS custom properties on `:root`, with optional `[data-theme="dark"]` overrides if dark mode is added. JS reads colors from CSS variables (`--severity-*`, `--accent`, `--link` are consumed by `app.js`/`landing.js`). Do not duplicate hex values in JS, and do not rename a token JS reads without updating both.

Values below are drawn from the archived `sidewalklabs.com` stylesheet (Wayback Machine, 2020 snapshot): canvas `#f7f7f7`, ink `#262626`, grays `#505050`/`#737373`, signature yellow `#ffcf2b`, buttery cream tint `#fdf5d1`, deep blue `#122e94`, brick red `#ba3535`, and a section-accent family (purple `#6a2db3`, green `#17b368`, orange `#ff5a00`).

```css
:root {
  /* Paper & ink — Sidewalk's real values */
  --bg: #f7f7f5;       /* light-gray canvas (Sidewalk #f7f7f7) */
  --paper: #ffffff;
  --surface: #ffffff;
  --surface-2: #f1f1ee;
  --rule: #262626;     /* warm near-black ink */
  --border: #e6e3da;
  --border-soft: #efece4;
  --text: #262626;
  --text-muted: #505050;
  --text-soft: #737373;

  /* Signature Sidewalk yellow + buttery cream tint */
  --brand: #ffcf2b;
  --brand-strong: #f5b400;
  --brand-soft: #fdf5d1;
  --on-brand: #262626; /* text on yellow stays near-black */

  /* Links & urgent accent (Sidewalk deep blue + brick red) */
  --link: #122e94;
  --link-hover: #0c1f63;
  --accent: #ba3535;
  --accent-soft: #f7e3e3;

  /* Severity — flat, AA on white */
  --severity-fatal: #ba3535;
  --severity-major: #ff5a00;
  --severity-minor: #9c7a16;
  --severity-property: #737373;

  /* Travel mode — Sidewalk's section-accent family */
  --mode-walking: #6a2db3;
  --mode-biking: #17b368;
  --mode-driving: #505050;
  --mode-transit: #122e94;

  /* Shape — pills + restrained rounding (Sidewalk used 100px + 8px) */
  --radius: 10px;     /* cards, panels */
  --radius-sm: 8px;   /* controls, small chips */
  --radius-pill: 999px; /* buttons, nav, pills, badges */
}
```

Rules:

- The canvas stays paper + ink + yellow. The flat accent palette (severity, mode, link, urgent red) appears only when it encodes meaning.
- Yellow is for brand, emphasis, and wayfinding only — never for severity, confidence, or status.
- Text on yellow is always `--on-brand` (near-black); never white-on-yellow or yellow text on white (fails contrast).
- Separate severity colors from mode colors. Keep severity distinct from the brand yellow (`--severity-minor` is a deep gold, not the canary brand).
- Fatality red is not the link color, focus color, or generic CTA color.
- Use neutral, brand-adjacent colors for agencies and third parties. Do not imply official endorsement.

---

## Typography

The signature Sidewalk pairing is **geometric-sans headlines + serif body.** Headlines, the wordmark, big figures, and controls use a geometric sans (Sidewalk's Circular Pro, approximated with an Avenir/Futura system stack) at heavy weight; running prose is set in a serif (their Freight Text Pro, approximated with Georgia); mono carries IDs, metrics, and uppercase eyebrow labels. Ship system stacks only unless a future implementation documents a reason to add a web font.

```css
--font-display: "Avenir Next", Avenir, Futura, "Century Gothic",
                "Helvetica Neue", Helvetica, Arial, sans-serif; /* ≈ Circular Pro */
--font-sans: "Avenir Next", Avenir, "Helvetica Neue", Helvetica, Arial, sans-serif;
--font-serif: Georgia, "Times New Roman", Times, serif;        /* ≈ Freight Text Pro */
--font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
```

`body` is set in `--font-serif`; `button`/`select`/`input` are reset to `--font-sans` so controls stay geometric. Headings and figures opt into `--font-display`.

### Type Roles

| Role | Family | Treatment |
| --- | --- | --- |
| Product name / wordmark | display | bold, paired with the yellow brand square |
| Page headline | display | large (clamp to ~3.6rem), `font-weight: 800`, tight `letter-spacing: -0.025em`, line-height ~1.0 |
| Section head | display | bold, ~2rem, tight tracking; emphasis comes from a yellow tick/highlight, not a rule |
| Big figure / KPI number | display | heavy, tight, with a yellow underline highlight |
| Lead statement / deck | display or serif | larger, calmer; display for short leads, serif for decks |
| Body / annotations / prose | serif | legible, editorial, no marketing tone |
| Controls / buttons | sans | geometric, small |
| Eyebrow labels / metrics / IDs | mono | uppercase with **wide positive tracking** for labels; tabular numerals for metrics |

Rules:

- Use tabular numerals for every metric, table number, date, rate, and axis label.
- Display headlines carry negative tracking (`-0.02em` to `-0.03em`); uppercase mono eyebrow labels carry **wide positive tracking** (~`0.08em`+), echoing Sidewalk's label style. Serif prose uses `letter-spacing: 0`.
- Emphasis is a **yellow highlight or tick**, not italic or a heavy black rule. Avoid faux-newspaper italics and decorative script.
- For icon glyphs in CSS `content` (arrows, carets), use unicode escapes (`content: "\25BE"`), not raw characters. A static host that serves CSS without `charset=utf-8` will otherwise mojibake them; escapes are ASCII and encoding-proof.
- Avoid oversized hero type inside tool panels. Display-scale type belongs to the masthead and major section openers.
- Do not center long prose; copy is left-aligned.

---

## Layout

Use a calm, airy grid: soft rounded cards separated by whitespace, generous padding, and strong type hierarchy. Where the old system divided sections with black hairline rules, this one uses space and a thin soft border. A 6px yellow brand bar sits at the top of the page. The map/table remains the primary surface.

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

- Divide sections with whitespace and soft borders, not heavy black rules. Reserve the yellow brand bar for the top of the page.
- The map/table gets priority over explanatory copy.
- Keep filters close to the data they affect.
- Use soft rounded cards: `--radius` (14px) for cards and panels, `--radius-sm` (8px) for controls, `--radius-pill` for buttons and badges. Borders are 1px in `--border` on paper.
- Generous internal padding (24-32px on cards and bands); let cards breathe with 20px+ gaps.
- Avoid cards inside cards. One card depth per surface.
- Hover lift on interactive cards is allowed and on-brand (a soft shadow, `0 6px 22px rgba(26,26,26,0.08)`), but keep it subtle and respect `prefers-reduced-motion`.
- Use stable dimensions for toolbars, map containers, KPI strips, and tables so loading text or hover states do not shift layout.
- Long tables get pagination or virtualization. Do not render tens of thousands of rows into the DOM.
- Large point layers need clustering, decimation, canvas rendering, or lazy-loading.

---

## Components

### Top Nav

- Clean header on the paper/`--bg` canvas with a thin bottom border — not a dark bar.
- Wordmark in display bold, preceded by the small yellow brand square.
- Links are quiet pills: muted by default, `--surface-2` on hover, **yellow pill** for the current page.

### Masthead

- 6px yellow brand bar across the top; product title in big bold display; a compact source/update line below.
- Apply the yellow highlight (`.mark`) behind a key phrase in the headline when it earns emphasis.
- Eyebrow labels use the uppercase mono `.section-label` with a yellow tick square.
- No oversized hero intro on the tool screen beyond the headline + deck.

### Buttons and Controls

- Buttons are **pill-shaped** (`--radius-pill`).
- Primary action: near-black fill, white text; **yellow fill on hover** with near-black text.
- Secondary action: white/paper fill, `--border`, near-black text.
- Filter selects render as inline **yellow-tinted controls** (`--brand-soft` fill, `--brand-strong` underline) inside the plain-language sentence filter — no faux-newspaper italics.
- Destructive/urgent action: red only when the action is actually destructive or safety-critical.
- Segmented controls for map/table/timeline modes; checkboxes for multi-select; sliders or numeric inputs for thresholds.
- Visible `:focus-visible` ring on every interactive element.
- Minimum touch target: 44px.

### KPI Strip

KPIs read like a confident stat row, not a dashboard scorecard wall.

- Fatal crashes
- Major injuries
- Pedestrian/bicycle involvement
- KSI rate when denominator exists
- High Injury Network share
- latest source capture date

Style:

- Large bold display number with a **yellow underline highlight** (`box-shadow: inset 0 -0.28em 0 var(--brand)` on an inline-block).
- Small uppercase mono label, optionally with a severity/mode swatch.
- One-line source/date note.
- Cells separated by soft borders, not a heavy double rule.

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

### Editorial Voice

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
- **Cap total scroll with progressive disclosure.** A long single column is the main mobile failure mode. On phones, long detail modules (e.g. recommendation cards) collapse to a heading + one-line lead behind a `Details` toggle, expanding in place; the same content stays fully open on desktop. Implement with native `<details>` so it is keyboard- and screen-reader-accessible, and force the body visible on desktop so content never depends on JS.
- **Condense long card stacks.** Lists longer than ~3 items (e.g. the countermeasure library) show the first few with a "Show all N" toggle on phones; show all on desktop.
- **Offer a sticky in-page jump-nav** on phones for multi-section pages (e.g. Toll · Trends · Fixes · Library) so readers can jump instead of scroll. Give anchored sections `scroll-margin-top` to clear the sticky bar.
- **Lead with the primary content when a multi-section panel stacks.** When a side rail drops below the map on phones, reorder so the most relevant section (e.g. the selected crash's case file) comes first, and collapse the reference sections (hot spots, ward rates, sources) into accordions. Keep them expanded in the desktop rail.
- **Make mobile collapse deterministic.** Don't rely on the native closed-`<details>` hide (it's inconsistent when the `<summary>` is restyled); explicitly `display: none` the collapsed body in the mobile media query, and force it visible on desktop. Drive the open/closed state from a `matchMedia` listener.
- Tighten section/card padding on phones; desktop-generous spacing multiplies into excess scroll on a 375px column.
- Test at 375px width before declaring UI work done, and check the total page height in screens — two or three is healthy, eight or nine means a section needs disclosure or condensing.

---

## What This Interface Does Not Do

- No Sidewalk Labs logo, brand copy, proprietary fonts (Circular Pro, Freight Text Pro, Beatrice, Neue Droschke), or exact visual clone. Homage to the style, not the mark.
- No yellow used for severity, status, or confidence — yellow is brand and emphasis only.
- No white-on-yellow or yellow-on-white text (contrast failures).
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
