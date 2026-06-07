# CLAUDE.md - DC Vehicle Safety

> Project source of truth for intent, engineering principles, data handling, and editorial rules.
> Companion files: [AGENTS.md](AGENTS.md) is the operating manual for AI agents; [DESIGN.md](DESIGN.md) is the visual and UX system.

---

## Project Intent

Build a public-interest dashboard, analysis workspace, and policy recommendation tool for vehicle safety in Washington, DC, based on open data.

The product should help residents, advocates, journalists, ANC commissioners, council staff, and agency watchers answer:

1. Where are people being injured or killed on DC streets?
2. Which corridors, intersections, and travel modes face the highest risk?
3. What safety interventions have been installed, promised, delayed, or omitted?
4. Which policy or engineering actions are best supported by the available evidence?
5. What changed after a policy, camera, street redesign, enforcement shift, or capital project?

The north star is an evidence-backed safety atlas: map, table, source cards, and recommendation engine in one place. The tool should make it easy to move from a crash cluster to the supporting records to a defensible recommendation without losing the source trail.

---

## Editorial Promise

- Every numeric claim links to a primary or authoritative source.
- The tool may be pro-safety and pro-accountability, but it must not invent certainty. Separate observed facts, modeled estimates, and policy judgments.
- Recommendations are evidence cards, not black-box scores. Show the data behind the recommendation, the mechanism, the tradeoffs, and the uncertainty.
- Use plain language. Define traffic-engineering terms like KSI, AADT, protected intersection, leading pedestrian interval, and high injury network the first time they appear.
- Avoid victim-blaming language. Prefer "driver struck a pedestrian" or "crash involved a person walking" over phrasing that makes the vulnerable road user the actor by default.
- Report wins alongside failures. A corridor with reduced injuries after an intervention belongs next to a corridor where risk remains high.
- Surface missingness. "No available data", "not geocoded", "not yet reviewed", and "source unavailable" are meaningful states.

---

## Candidate Open Data Sources

Treat this list as a starting inventory. Verify the schema and freshness before building a connector.

| Source | Use |
| --- | --- |
| Open Data DC - Crashes in DC | crash locations, injury/fatality counts, mode involvement, speeding flags, nearest intersection. Current endpoint: `https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Public_Safety_WebMercator/MapServer/24` |
| Open Data DC - Crash Details Table | anonymized per-person crash details linked by crash ID. Current endpoint: `https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Public_Safety_WebMercator/MapServer/25` |
| Vision Zero crash dashboard | DDOT public dashboard for crash/injury/fatality exploration. Current dashboard: `https://dcvisionzero.github.io/Crash-Injury-Dashboard/` |
| Open Data DC - High Injury Network | corridor prioritization and Vision Zero context |
| Open Data DC - Vision Zero Safety | Vision Zero-related safety records |
| Open Data DC - Automated Safety Cameras | camera locations and enforcement infrastructure |
| Open Data DC - Automated Safety Cameras Violation Count By Month | monthly camera violation trends |
| Open Data DC - Moving Violations monthly/yearly datasets | enforcement trend context. Current examples: `Violations_Moving_2026/MapServer/0` and `/1` for Jan/Feb 2026; `Violations_Moving_2025/MapServer/0-11` for 2025 months. |
| Open Data DC - Traffic Volume datasets | exposure denominator for crash rates |
| Open Data DC - Bicycle Lanes, Traffic Signal, Vertical Deflections | street-design and traffic-calming context |
| DDOT, MPD, DMV, DC Council, OCFO, OCA, ANC, and WMATA sources | project status, legal authority, budget, enforcement, transit context |

Open Data DC exposes catalog metadata through its official search API. Use the API to discover current dataset IDs rather than hardcoding titles from memory.

---

## Official DC Vision Zero Crash Analysis Note

Captured 2026-05-27 from <https://visionzero.dc.gov/pages/crash-analysis>. Treat this as an authoritative DDOT framing source and a launchpad to the live crash dashboard, not as a substitute for raw crash records.

Source inventory:

| Item | URL / ID | Notes |
| --- | --- | --- |
| Vision Zero Crash Analysis page | <https://visionzero.dc.gov/pages/crash-analysis> | ArcGIS Hub page titled "Crash Analysis"; page item `0158ae34caa54b0aa7e09af38a5b6ce7`, modified 2026-03-05. |
| Embedded crash dashboard | <https://dcvisionzero.github.io/Crash-Injury-Dashboard/> | Primary interactive crash/injury dashboard embedded on the page. |
| ArcGIS dashboard link | <https://dcgis.maps.arcgis.com/apps/dashboards/a2f1cca5159e4c6eae197895d2e08336> | "View crash dashboard in full screen" target from the page. |
| Legacy crash dashboard | <https://dcgis.maps.arcgis.com/apps/instant/portfolio/index.html?appid=32a44d7aa95f4bb7a0e10eaf2599eb72> | Linked as the old dashboard. |
| Fatal crash memos | <https://dcvisionzero.github.io/Crash-Injury-Dashboard/memo/> | DDOT follow-up memos tied to fatal crashes. |
| Major Crash Review Task Force | <https://www.open-dc.gov/public-bodies/major-crash-review-task-force> | Independent task force calendar/context linked from Crash Analysis. |
| Non-injury crash directions | <https://ddot.dc.gov/page/what-do-after-non-injury-crash> | Public instructions for minor non-injury crashes. |
| Human cost story map | <https://storymaps.arcgis.com/stories/6a85b032dc0548408cd1cfaecb41216f> | Linked from the "Human Cost of Traffic Crashes" section. |

Key page notes to preserve:

- Vision Zero strategies are described as systematic, data-driven, and used to identify and prioritize interventions with the greatest potential to eliminate fatalities and serious injuries.
- DDOT says the data guides street design and enforcement efforts.
- After any fatal crash, DDOT conducts a site visit with multiple DDOT divisions and MPD's Major Crash Investigations Unit; the review considers the crash, nearby crash history, the site's broader safety profile, community concerns, and related planning studies.
- The Major Crash Review Task Force reviews all fatal crashes and includes MPD, DDOT, OP, DMV, BAC, PAC, and MAAC.
- The page frames equity as central to crash analysis, noting that transportation disadvantage and sociodemographic vulnerability can overlap and that investment prioritization should account for disparate impacts and historic disinvestment.
- DC is reported to have lost an average of 32 people per year on streets between 2015 and 2019.
- The page reports an average of 8,530 injury crashes per year, or 23 per day, during 2017-2019 based on MPD crash data.
- During the COVID-19 public health emergency, reported traffic injuries decreased about 30% overall, including 44% among pedestrians and 51% among cyclists, while fatalities increased from 27 in 2019 to 37 in 2020 and 40 in 2021.
- The page attributes the divergence between fewer injuries and more fatalities partly to higher speeds during reduced congestion and changed travel patterns.

Use this page for context, framing, dashboard discovery, and linked resources. Use raw Open Data DC / MPD / DDOT datasets for canonical analysis whenever possible.

---

## Data Principles

### Source Attribution

- Every record carries `source_url`, `source_title`, `source_agency`, `captured_at`, and connector name.
- Preserve raw fields as `*_raw` when cleaning names, dates, locations, or categories.
- Keep enough provenance to answer: "Where did this number come from, and when did we capture it?"

### Append-Only Captures

- Prefer append-only snapshots over destructive overwrites.
- If a government dataset changes historical rows, keep both captures when feasible and mark which is latest.
- Use stable IDs derived from source identifiers, not display names.
- Do not delete raw downloads or source snapshots unless explicitly cleaning generated artifacts.

### Exposure and Denominators

- Raw crash counts are useful for locating harm, but policy comparisons need denominators when possible.
- Prefer rates by traffic volume, road length, population, trips, school enrollment, bike-lane mileage, or other relevant exposure measures.
- Do not compare wards, neighborhoods, or modes using raw counts alone unless the limitation is visibly stated.

### Privacy and Small Counts

- Crash data can be sensitive even when anonymized.
- Avoid re-identification. Do not combine records to infer individual identities.
- Aggregate small counts when presenting neighborhood, school, or vulnerable-user patterns.
- Do not publish precise narratives about a crash unless the detail is already public and necessary.

### Geospatial Discipline

- Keep coordinate systems explicit.
- Validate points against DC boundaries and flag outliers.
- Track geocoding confidence separately from crash severity.
- Distinguish intersection, block, corridor, ANC, ward, and route-level analysis. They answer different questions.
- Every surfaced hot spot should carry its ward, location grain, and whether it came from raw records, grouped statistics, or a modeled region.
- For early screening, ranking by severity-weighted counts is acceptable only if the UI labels it as a triage heuristic and keeps the components visible.

---

## Recommendation Rules

Policy recommendations must be traceable and modest about uncertainty.

Each recommendation should include:

- **Problem statement:** what pattern triggered it.
- **Location scope:** intersection, corridor, ward, citywide, or programmatic.
- **Evidence:** linked source records and summary metrics.
- **Mechanism:** how the intervention is expected to reduce risk.
- **Intervention type:** engineering, enforcement, speed management, signal timing, curb management, education, legislation, budget, data quality, or maintenance.
- **Equity check:** who benefits, who may be burdened, and whether enforcement-heavy interventions create disproportionate risk.
- **Confidence:** high / medium / low, based on data completeness and evidence strength.
- **Uncertainty:** known gaps, stale data, missing denominator, or unverified project status.

Do not ship:

- A single composite "safety score" without transparent components.
- A "dangerous neighborhood" ranking that stigmatizes residents instead of identifying fixable street conditions.
- LLM-generated policy judgments without source-grounded evidence and human-reviewable logic.
- Recommendations that treat enforcement as the default answer when engineering or speed-management fixes are more direct.

---

## Architecture Principles

- **Ship the smallest useful version end-to-end.** A working map with sourced crash filters beats a grand plan with no deployable tool.
- **Static when possible.** Prefer a baked-data site on GitHub Pages or another static host when update cadence allows it.
- **Pipeline first, UI second.** Build CLI/data stages that agents can run and verify before investing in UI polish.
- **Single source of truth.** Dataset schemas, category labels, color tokens, and intervention taxonomies live in one canonical module or data file.
- **Modular layers.** Separate fetching, caching, normalization, analysis, recommendation logic, and presentation.
- **Idempotent operations.** Re-running a stage should be safe. Use content hashes, stable IDs, cache checks, and `INSERT OR IGNORE`-style writes.
- **Cost-conscious.** Prefer open data, local processing, static JSON, and cheap models. Use paid APIs only when the gain is specific and documented.
- **Performance is product quality.** Maps, tables, and filters must stay fast on mobile. Paginate, lazy-load, cluster or decimate map features when needed.

---

## Suggested Future Structure

This repo is new; adjust once the actual stack lands.

```text
pipeline/
  config.py              # source URLs, rate limits, paths, canonical vocab
  models.py              # Pydantic schemas for raw, normalized, and analysis records
  fetch.py               # download/cache source data
  normalize.py           # clean fields, preserve raw values
  geocode.py             # location validation and spatial joins
  analyze.py             # rates, clusters, before/after, trends
  recommend.py           # transparent recommendation rules
  build.py               # emit docs/data/*.json and LLM-friendly outputs
data/
  raw/                   # downloaded source snapshots, usually gitignored
  cache/                 # request/API cache, gitignored
  processed/             # normalized intermediate outputs
docs/
  index.html             # static dashboard shell, if using vanilla static
  data/                  # baked JSON consumed by the site
  llms.txt               # concise machine-readable project index
  llms-full.txt          # full data/source/documentation context when practical
src/                     # app source if using Next/Vite instead of vanilla docs/
tests/
  fixtures/              # small representative source samples
  test_*.py or *.test.ts # schema, data integrity, analysis, UI logic
```

---

## Testing and Validation

- Write tests alongside code.
- Every connector gets fixture-based tests for schema, row count sanity, required fields, and stale-source behavior.
- Every bug fix gets a regression test.
- Validate output before writing canonical JSON.
- Cover edge cases: empty inputs, null optional fields, date boundaries, duplicate IDs, ungeocoded crashes, out-of-DC coordinates, and combined filters.
- For recommendation logic, test each rule with minimal fixtures so a future change cannot silently alter the policy rationale.
- For UI changes, run the app locally and verify the affected flow at mobile and desktop widths.

---

## Network Ethics and Rate Limiting

- Use official APIs when available.
- Start small: fetch one dataset or limited rows before full runs.
- Cache every fetch. Re-runs should not re-download unchanged data.
- Respect rate limits and add backoff for 429/5xx responses.
- Use an informative user agent.
- Log blocked or stale sources to `issues.md`; do not hide them in console output.

---

## Web Search and Token Efficiency

Be deliberately frugal with web search, web fetches, and any agent-driven research. They are the easiest way to spend a large token budget and still come back empty.

- **Don't run deep / multi-agent research unless the task truly requires broad, multi-source synthesis.** For ordinary questions, prefer a known primary source (Open Data DC, DDOT, a specific URL), a doc already in this repo, or one or two targeted searches. Treat a large research fan-out as a last resort, and only when explicitly worth it.
- **Seed the format with a small query first.** Run one narrow search or fetch to confirm the source exists and the result is shaped as expected, fix the query and output schema from it, then scale. Never launch a big batch blind.
- **Bound it.** Tight question, small named source set, a rough call budget, and a stop condition — not an open-ended crawl. State the budget before starting.
- **Fail fast.** If results are junk or a flow stalls, stop and report what you have instead of retrying the same costly path.
- **Verify before publishing.** Scraped numbers and effect sizes are research-grade until checked against the primary source (see the Editorial Promise); don't burn more tokens polishing an unverified figure.

See `AGENTS.md` ("Token And Effort Discipline") for the operational version of this rule.

---

## Security and Dependencies

- Never commit secrets, API keys, tokens, `.env`, `node_modules/`, `__pycache__/`, raw large downloads, or generated build directories.
- Read credentials from environment variables only.
- Before adding or upgrading packages, check the project owner's supply-chain advisory index at `https://pranava0x0.github.io/vibe-coding-security/llms-ctx.txt` and surface relevant warnings.
- Prefer boring dependencies with durable maintenance.
- Do not add a frontend framework, mapping library, charting library, or AI service unless it clearly earns its maintenance and bundle cost.

---

## Issue and Backlog Hygiene

When created, keep:

- `issues.md` as the bug and data-quality audit trail.
- `backlog.md` as the roadmap and idea parking lot.
- `security.md` as the dependency and advisory sweep log.

When something unexpected happens, add a concise note:

1. What I expected.
2. What happened.
3. Why.
4. What to do next time.

These files are project memory. Let them grow incrementally; do not rewrite them from scratch.
