# PLAN.md — Next Phase: Novel Findings, Performance, Deployment, Coalition Power

> Written 2026-07-09. This is the implementation plan for the next phase of Vision Zero DC.
> Audience: the implementing agent/model. Read CLAUDE.md (editorial promise, data principles,
> token discipline) and AGENTS.md before starting any workstream. BACKLOG.md holds the
> peer-city research and the shipped-phase history this plan builds on.

---

## North Star for This Phase

The site already shows *where harm is* (map, corridors, wards) and *what the law promises*
(law tracker). The next phase's differentiator is **accountability joins nobody else has
published**: connecting harm to warnings, promises, enforcement, and delivery — and then
packaging those findings so Pranava can put them in front of the specific people who can act.

Four workstreams, in priority order:

- **A. Novel data findings** — analyses not available on any existing DC dashboard.
- **B. Visualization performance** — fast on mobile/tablet/desktop, measured not vibes.
- **C. Deployment evaluation** — a decision, not a migration (unless triggered).
- **D. Policy, bills, and coalitions** — turn findings into pitchable proposals with named recipients.

Everything here obeys the standing rules: every number links to a primary source; unverified
figures carry a badge; small counts get aggregated; no composite scores without visible
components; research is bounded (seed query first, state a budget, fail fast).

---

## Workstream A — Critical Data Nobody Else Has Surfaced

The existing dashboards (DDOT's own, ours, peer cities) show crash *outcomes*. The open
niches are joins between outcomes and the **paper trail around them**. Ranked by
novelty × feasibility × advocacy power:

### A1. "The District Was Warned" — 311 traffic-safety requests vs. subsequent crashes  ⭐ highest value

**Claim to test:** locations where residents filed Traffic Safety Investigation (TSA/TSI)
service requests through 311, the request was closed or left pending, and a KSI crash later
happened nearby. No public DC tool connects these.

- **Data:** Open Data DC 311 City Service Requests (annual datasets; filter
  `SERVICECODE`/`SERVICETYPEID` for DDOT traffic-safety categories — verify exact codes
  against the current-year schema first). DDOT also has a "Traffic Safety Inputs" /
  Traffic Safety Investigations dataset on Open Data DC — discover the current ID via the
  catalog search API rather than hardcoding.
- **Method:** geocode-join requests to crashes (reuse the 25 m point-to-segment /
  point-to-point grid index from `pipeline/hotspots.py`). Output per-location records:
  request date, request status/resolution, first subsequent crash, subsequent KSI count.
  Aggregate to corridor and ward grain for display; keep location-level detail in the JSON
  with small-count care (no victim detail, no re-identification).
- **Output:** `pipeline/warnings.py` → `data/warnings.json`; a section on hotspots.html or a
  new page: "Requests filed → what happened after." Every row links the 311 request ID and
  the crash records.
- **Caveats to bake in:** a closed request ≠ a refused fix (some closures are installs);
  distinguish resolution categories; correlation framing only — "a crash later occurred near
  a location residents flagged," never "DDOT caused this."
- **Acceptance:** fixture-based tests for the join; provenance block; caveat text renders;
  citywide headline number ("X KSI crashes since 2022 occurred within 25 m of a
  previously-filed traffic-safety request") computed and source-shown.

### A2. Per-camera before/after evaluation (BACKLOG B3, now prioritized)

**Claim to test:** what actually changed around each automated-enforcement camera after
activation. DDOT published one aggregate study; nobody publishes per-camera cards.

- **Data:** Open Data DC Automated Safety Cameras (locations; check for
  activation/install date field — if absent, first month with violations in the
  violations-by-month dataset is a defensible proxy, labeled as such), camera Violation
  Count By Month, crashes within a radius (200–400 ft; state the choice).
- **Method:** for each camera with ≥12 months pre and post data: crash/KSI counts before
  vs. after, plus the violations-per-month decay curve (deterrence signal). Flag
  regression-to-mean and short-window caveats on every card; suppress cards with tiny
  counts instead of showing noisy percentages.
- **Output:** `pipeline/cameras.py` → `data/camera-evaluations.json`; camera layer/cards on
  the map or a compact table page. This also feeds D: the camera-revenue-to-safety-fund
  campaign needs exactly this evidence.
- **Acceptance:** per-camera provenance; a "method + caveats" panel; tests covering the
  before/after window math and the small-count suppression rule.

### A3. Enforcement–harm mismatch map

**Claim to test:** moving-violation enforcement concentrates where it's easy, not where
people die. Compare the spatial distribution of moving violations (already partially wired
into the map) against KSI density, at corridor grain.

- **Data:** already-integrated moving violations MapServers + `data/hin-corridors.json`.
- **Method:** per HIN corridor: violations issued within the same 25 m buffer vs. KSI count.
  Rank the divergence both ways (high-harm/low-enforcement and the reverse). Components
  always visible; label as a triage heuristic.
- **Output:** two columns added to the existing sortable corridor table + a short findings
  note. Cheap — mostly reuses the spatial join.
- **Equity check (required):** enforcement burden by ward must be shown alongside, per the
  CLAUDE.md rule against enforcement-default recommendations.

### A4. Fatal-crash memo delivery audit

**Claim to test:** DDOT writes a follow-up memo after fatal crashes
(<https://dcvisionzero.github.io/Crash-Injury-Dashboard/memo/>). Do the recommended fixes
get installed? Nobody tracks memo → delivery.

- **Method:** bounded scrape of the memo index (it's a static GitHub Pages site — check
  robots/terms, use an informative UA, cache everything). Extract: crash date/location,
  recommendations made. Hand-verify a sample of "was it built" via later-dated
  infrastructure datasets (bike lanes, signals, vertical deflections) and street-view-style
  checks *by the human*, not the model. Start with the 10 most recent memos only — this is
  a curation task with a pipeline assist, not a full automation.
- **Output:** `data/memo-audit.json` (curated, source-linked, with `status: verified |
  unverified | not-yet-reviewed`) + a section on the laws page ("promised at a specific
  crash site vs. delivered").
- **This is the highest-journalism-value item but the most manual; do A1–A3 first.**

### A5. Children and seniors near schools (Safe Streets for Students follow-through)

**Claim to test:** where are minors being struck, and are those locations covered by the
school-zone measures D.C. Law 24-285 requires (School Streets pilots, 15 mph zones,
action plans)?

- **Data:** Crash Details table (age fields — verify schema; MapServer/25), DCPS/charter
  school locations from Open Data DC, `data/legislation.json` entry for Law 24-285.
- **Method:** KSI involving persons under 18 within ~500 ft of a school point; aggregate to
  school clusters with small-count suppression (never map an individual child's crash).
  Same analysis for 65+ near senior centers is a cheap variant if the age field supports it.
- **Output:** extends the laws page: the statute's promise next to the observed pattern.

### A-scope discipline

Before building any connector: one seed query against the endpoint to confirm schema and
row shape (per CLAUDE.md "seed the format with a small query first"). Each A-item gets its
own PR with fixtures + tests. If a dataset turns out not to exist or lacks the key field
(e.g., no activation date, no age), log it in ISSUES.md and move on — do not synthesize.

---

## Workstream B — Visualization Performance (mobile / tablet / desktop)

Current state: no build step, Leaflet from CDN with SRI, baked JSON ≤132 KB per file,
polylines pre-decimated, `map-perf.test.mjs` guards reload-skips. Good bones; the gaps are
measurement and mobile map behavior.

### B1. Measure first — establish a budget

- Run Lighthouse (mobile + desktop presets) against all five pages on the live Pages URL.
  Record scores + key metrics (LCP, TBT, CLS, transferred bytes) in a new
  `PERF.md` baseline table. Target: LCP < 2.5 s on mobile for index/laws/anc; map pages
  get their own honest budget (Leaflet + tiles cost real bytes).
- Add a CI-friendly check where cheap: extend `map-perf.test.mjs`-style pure-logic tests
  rather than adding a heavy Lighthouse CI dependency (cost-conscious rule).

### B2. Map-page work (map.html, hotspots.html)

- **Marker budget:** switch per-crash markers to Leaflet's canvas renderer
  (`L.canvas()` / `preferCanvas: true`) if not already; cap rendered features per viewport
  and show "N more — zoom in" instead of degrading. Verify current marker counts at
  citywide zoom before choosing clustering vs. decimation (decimation is dependency-free;
  a clustering plugin must earn its bundle cost per CLAUDE.md).
- **Viewport-scoped fetches:** confirm ArcGIS queries are bbox-bounded and debounced on
  `moveend`; don't refetch on no-op settles (guard exists — extend it to hotspots.html if
  missing).
- **Lazy map init:** on mobile, defer Leaflet/tile loading until the map container is near
  the viewport (IntersectionObserver) on any page where the map isn't the primary content.
- **Tile weight:** add `preconnect` hints for the tile host and the DC ArcGIS host.

### B3. Non-map pages (index, anc, laws)

- Inline-SVG sparklines are already cheap. Audit for: render-blocking CSS/JS order, missing
  `defer`, image/font weight (should be near zero), and layout shift from late-arriving
  JSON (reserve card heights).
- Tables (77-corridor sortable): ensure sorting doesn't rebuild the whole DOM; paginate or
  virtualize only if profiling shows jank at 375 px — don't pre-optimize.

### B4. Responsive verification pass

- Explicit checks at 375 px (mobile), 768 px (tablet — currently the least-exercised width),
  and 1280 px for every page: nav, filter toolbar wrap, corridor table horizontal scroll
  containment, ANC brief print styles, tap-target size on map controls.
- Log defects to ISSUES.md; fix the top ones; add regression assertions to
  `html-integrity.test.mjs` where they're expressible statically.

**Acceptance for B:** PERF.md with before/after numbers; no page regresses; every fix
verified at the three widths via the local server.

---

## Workstream C — Deployment: GitHub Pages vs. Alternatives

This is an **evaluation with a written decision**, not a migration. Current setup (Pages +
Actions with a test-gated deploy + weekly data-refresh PRs) already satisfies the
architecture principles. Produce `DEPLOYMENT.md` containing:

### C1. Decision matrix

| Criterion | GitHub Pages (current) | Cloudflare Pages | Netlify | Vercel |
| --- | --- | --- | --- | --- |
| Cost at this scale | Free | Free | Free tier | Free tier (non-commercial) |
| Custom headers (CSP, cache-control) | ❌ none | ✅ `_headers` | ✅ | ✅ |
| Redirects | ❌ (meta-refresh only) | ✅ | ✅ | ✅ |
| Bandwidth/soft limits | 100 GB/mo, 1 GB site | Generous free | 100 GB/mo free | 100 GB/mo free |
| Edge functions / API proxy later | ❌ | ✅ Workers | ✅ | ✅ |
| CI already wired | ✅ | needs port | needs port | needs port |
| Custom domain + HTTPS | ✅ | ✅ | ✅ | ✅ |

(Verify the limit figures against current provider docs before committing the table — they
drift.)

### C2. Recommendation (pre-registered, to validate during implementation)

**Stay on GitHub Pages** until one of these triggers fires, then move to **Cloudflare
Pages** (closest fit: static-first, free, adds headers/redirects/Workers without a
framework):

1. Need for real HTTP headers — e.g., a strict CSP once third-party embeds grow, or
   long-cache headers for `data/*.json` with hash-busted names.
2. A server-side need: proxying/caching ArcGIS queries (the map's biggest latency source is
   live ArcGIS calls — a cached edge proxy is the likely first real backend).
3. Pages bandwidth pressure (unlikely at current sizes).

Document the migration path (DNS, Actions → CF Pages build, keeping the test gate) so the
move is a day, not a project. Also note in DEPLOYMENT.md: llms.txt/llms-full.txt and the
weekly refresh PR flow must survive any migration unchanged.

---

## Workstream D — Policy Solutions, Historical Bills, Coalitions

Goal: convert A-findings into **pitchable proposals with named recipients and the right
moment on the DC calendar**. Build on `data/legislation.json` (enacted law),
`data/organizations.json` (14 orgs), and the ANC resolution generator.

### D1. Pending-bills surface (the BACKLOG follow-up, now scheduled)

- New `data/bills.json` with its own schema (LIMS source URLs, status, committee, hearing
  dates) — deliberately separate from `legislation.json`, whose validator requires
  `code.dccouncil.gov` (keep that guard; it's what keeps enacted law clean).
- Seed inventory (verify each in LIMS before committing; statuses may have changed):
  - **B26-0057 Motor Vehicle Insurance Modernization** (crash-victim insurance minimums).
  - Any active successor to camera-revenue designation follow-through (builds on
    D.C. Law 24-321 / § 50-921.20).
  - Intelligent Speed Assistance (ISA) expansion beyond STEER's repeat-offender program —
    find the actual bill number via LIMS search; #StopSuperSpeeders is the campaign handle.
  - Whatever the current Council period's street-safety bills are: run a bounded LIMS
    search ("traffic safety", "Vision Zero", "pedestrian", "speed") for Council Period 26,
    budget ~10 fetches, take what's found, log gaps.
- **Historical context list** (for the "what's been tried" narrative): Vision Zero Act of
  2014, Bicycle and Pedestrian Safety Amendment Act of 2016, Vision Zero Omnibus 2020,
  Safe Streets for Students 2022, Safer Streets 2022, STEER 2024 — the enacted ones are
  already in `legislation.json`; the plan item is a short "lineage" panel on laws.html
  showing the 10-year arc and what each law's core promise was.
- Render on laws.html as a clearly-separated "Pending & Proposed" section with a
  status-freshness date on every card.

### D2. Coalition & pitch-target map (who can act on what)

Extend `data/organizations.json` (or a new `data/pitch-targets.json`) so every entry has:
`can_act_on` (which finding types), `channel` (testimony, resolution, meeting, budget ask),
and `source_url`. Target inventory to verify and complete:

- **Advocacy:** WABA, DC Families for Safe Streets, Washington Area Families for Safe
  Streets chapters, Greater Greater Washington (amplification), All Walks DC / Walk DC.
- **Official:** the Council committee with DDOT oversight (verify current committee name +
  chair for Council Period 26 — do not hardcode from memory), each ward's
  Councilmember, ANCs (the site already generates resolutions — that's the distribution
  channel), DDOT Vision Zero Division, Major Crash Review Task Force (public body with
  open meetings), DC Bicycle Advisory Council & Pedestrian Advisory Council (public
  bodies residents can join/testify at — verify meeting cadence on open-dc.gov).
- **Calendar hooks (this is the pitch-timing value):** performance oversight hearings
  (~Feb–Mar), budget hearings (~Mar–May), BAC/PAC monthly meetings, Major Crash Review
  Task Force meetings. Add a "when to show up" panel: each finding type mapped to its
  venue and season.

### D3. Pitch kits — the connective deliverable

For each shipped A-finding, a one-page, print-friendly brief (reuse the ANC resolution
generator pattern): headline number with source links, the map view deep-link, the specific
ask, the recipient (from D2), and the calendar moment. Static, generated from the baked
JSON — no new dependencies. Acceptance: Pranava can print/email a brief for (say) the
warnings analysis to a specific ANC or the oversight committee without editing HTML.

### D4. Recommendation-engine tie-in

Each new finding feeds `data/recommendations.json` as evidence cards with the full
CLAUDE.md field set (problem, scope, evidence, mechanism, intervention type, equity check,
confidence, uncertainty). No finding ships as prose only.

---

## Sequencing & Milestones

Ordered for dependency and momentum; each milestone is a separate PR with tests.

1. **M1 (Workstream B1 + B4):** perf baseline + responsive defect sweep. Fast, establishes
   the measurement frame. *(~1 session)*
2. **M2 (A3):** enforcement–harm mismatch columns — cheapest novel finding, reuses the
   HIN join. *(~1 session)*
3. **M3 (A1):** 311 warnings vs. crashes pipeline + page section — the flagship. *(2–3
   sessions incl. schema discovery)*
4. **M4 (A2):** per-camera before/after. *(1–2 sessions)*
5. **M5 (D1 + D2):** bills surface + pitch-target map on laws.html. *(1–2 sessions)*
6. **M6 (D3):** pitch-kit generator wired to M2–M4 findings. *(1 session)*
7. **M7 (B2/B3):** map perf work guided by the M1 baseline. *(1 session)*
8. **M8 (C):** DEPLOYMENT.md decision doc (can happen anytime; zero code). *(<1 session)*
9. **M9 (A5, A4):** school-zone analysis, then memo audit (most manual, do last).

Parallel-safe: M8 anytime; M5 independent of A-work; M1 before M7.

## Rules for the Implementing Model

- **Verify before you build:** one seed query per dataset to confirm the schema; discover
  dataset IDs via the Open Data DC catalog search API; never trust remembered field names.
- **Bounded research:** every discovery task above has a budget (~10 fetches); if a source
  is junk, log to ISSUES.md and continue. No multi-agent research fan-outs for these —
  they're targeted lookups.
- **Small counts:** A1/A2/A5 all touch potentially sensitive location-level data —
  aggregate or suppress; never enable re-identification.
- **Every figure badge-gated:** new effect sizes or claims render "unverified" until
  checked against the primary source, matching the countermeasures pattern.
- **Tests with every pipeline:** fixture-based, per the existing
  `test_hotspots_pipeline.py` pattern; frontend logic goes in `src/*-logic.js` so it's
  Node-testable.
- **Idempotent + cached:** all fetchers use `data/cache/`, respect rate limits, informative
  UA, backoff on 429/5xx.
- **Update llms.txt / llms-full.txt** whenever pages or data files are added.
