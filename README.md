# Vision Zero DC

Static public-interest tool for reading DC crash data and related safety context from official District open data sources.

## Pages

- **`index.html` — Safety Overview (landing).** Accountability scorecard, deaths-vs-injuries trend, who-is-being-hurt mode share, the "where harm concentrates" headline, and evidence-backed policy recommendations + a countermeasure library. Reads the baked snapshot and curated JSON; no map libraries.
- **`map.html` — Crash Map.** The interactive Leaflet map with date/severity/mode filters, a KSI-only toggle, moving-violations overlay, hot spots, ward crash rates, and per-crash case files. Shareable via URL state.

A top nav links the two. Recommendation cards on the landing page deep-link into the map with the relevant filters applied.

## For machine readers (llms.txt)

[`llms.txt`](llms.txt) is a concise, link-first index of the pages, baked data files, docs, and authoritative sources, following the [llms.txt convention](https://llmstxt.org/). [`llms-full.txt`](llms-full.txt) adds the `crash-summary.json` data dictionary, methodology, and caveats in one file. Both are served at the site root (`/llms.txt`, `/llms-full.txt`) and avoid hardcoding volatile figures — they point to `data/crash-summary.json` as the canonical numeric source. Update them when pages, data files, or sources change.

## Run Locally

```bash
python3 -m http.server 8050
```

Open <http://localhost:8050> (landing page); the crash map is at `/map.html`.

The app has no build step and no package install. It uses Leaflet from a CDN and queries official DC ArcGIS/Open Data endpoints directly.

## Data Pipeline

Ward-level summaries (counts, KSI, and exposure rates) are precomputed into a baked file so the frontend does not depend on fragile live grouped queries for that view.

```bash
python3 pipeline/snapshot.py            # uses data/cache/ when present
python3 pipeline/snapshot.py --refresh  # force re-fetch from ArcGIS
```

This writes [data/crash-summary.json](data/crash-summary.json) (committed and served by the site) with per-ward crash totals, fatalities/injuries, the triage score, and exposure rates for each date window; a citywide `scorecard` and `citywide_by_year` trend; and per-window `ksi_by_mode` — plus full provenance and caveats. Denominators come from [data/ward-denominators.json](data/ward-denominators.json) (population) and computed ward polygon area. Re-runs are idempotent; raw caches live under `data/cache/` and are gitignored.

Two curated (hand-authored, source-linked) files back the recommendations on the landing page: [data/countermeasures.json](data/countermeasures.json) (proven fixes with cited effect sizes; figures are flagged unverified until checked against the primary source) and [data/recommendations.json](data/recommendations.json) (evidence cards following the CLAUDE.md recommendation fields).

## Sharing Views

Filters (date, severity, mode, moving-violations month) and the map center/zoom are mirrored into the URL query string, so any view can be copied from the address bar and reopened. Default filter values are omitted to keep shared links short.

## Tests

No test framework or dependencies — both suites use built-in runners.

```bash
python3 tests/test_snapshot.py   # pipeline: area math, aggregation, denominator join, sanity gate
node --test                      # frontend pure logic in src/crash-logic.js (severity, triage, URL state, map reload guard)
```

The frontend's pure, DOM-free logic lives in [src/crash-logic.js](src/crash-logic.js) (loaded before `app.js` in the browser, `require()`d by the Node tests) so it can be unit-tested without a browser. Triage-score weights are duplicated in `pipeline/snapshot.py` and `src/crash-logic.js`; tests in both suites guard against them drifting apart. The map's reload-skip decision (`isViewCovered` / `boundsContains`) is also pure and tested in [tests/map-perf.test.mjs](tests/map-perf.test.mjs) so a refactor can't silently make the map refetch on every pan.

### Continuous integration

Both suites run in GitHub Actions ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) on every push to `main` and on every pull request. Deployment to GitHub Pages is gated on `needs: test`, so a failing test blocks the deploy; pull requests run the tests but do not deploy.

To make the gate enforced on merges (not just informational), enable branch protection: **Settings → Branches → Add branch ruleset (or protection rule)** for `main` → require status checks to pass → select the **`test`** check. With that on, a PR can't merge while tests are red.

## Current Layers

| Layer | Status | Source |
| --- | --- | --- |
| Crashes in DC | Implemented as mapped points with date, severity, mode, and speeding filters | `https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Public_Safety_WebMercator/MapServer/24` |
| Crash Details Table | Implemented on demand when a crash is selected | `https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Public_Safety_WebMercator/MapServer/25` |
| Vision Zero Tracker / dashboard | Linked as official framing and verified-metric context | `https://dcvisionzero.github.io/Crash-Injury-Dashboard/` |
| Moving Violations | Implemented as optional contextual overlay for selected monthly tables | `Violations_Moving_2025` and `Violations_Moving_2026` MapServer tables |
| Hot spots in view | Implemented as server-side grouped statistics by address/ward and by ward | `Crashes in DC` grouped queries |
| Ward crash rates | Implemented from the baked snapshot with population and area denominators; rankable by crashes per sq mi, per 100k residents, or total | [data/crash-summary.json](data/crash-summary.json) via `pipeline/snapshot.py` |
| Landing insights band | Implemented: an accountability scorecard (deaths + KSI vs. a settled baseline, honest about the missed 2024 target and preliminary recent years) and a "where harm concentrates" headline (ward KSI share vs. population share) | `scorecard` + `citywide_by_year` in the baked snapshot |

## Design Choice

The crash point layer has hundreds of thousands of records, and the related Crash Details table has substantially more participant/vehicle rows. The first version avoids an eager join:

1. Query the official crash point layer for the current map view and filters.
2. Draw up to a safe point limit in Leaflet Canvas.
3. Query grouped statistics server-side to rank high-crash locations and wards without relying only on drawn points.
4. Fetch related Crash Details rows only after a crash is selected.
5. Treat moving violations as contextual ticket points, not crash records.

This keeps the first map responsive while preserving source traceability.

## Hotspot Method

The right rail ranks two policy-screening views for the active map extent and filters:

- **Top crash locations:** grouped by `ADDRESS` and `WARD`, excluding missing / route-not-found addresses.
- **Ward totals:** grouped by `WARD`.

The prototype uses a severity-weighted triage score:

```text
crash count
+ 40 * fatalities
+ 12 * major injuries
+ 2 * minor injuries
+ 2 * pedestrian-involved count
+ 2 * bicycle-involved count
+ 1 * speeding-involved count
```

This is a screening heuristic for finding places to inspect. It is not an official DDOT ranking and should not be used for ward comparisons without denominators such as exposure, population, road miles, traffic volume, or trips.

## Source Caveats

- `Crashes in DC` uses field `CRIMEID` with alias `CRASHID`; the details table uses the same join value.
- Crash locations are only published when location data is complete enough for DDOT to publish.
- Moving violation records are ticket records, not crashes. Use them for enforcement context, not crash counts.
- Vision Zero dashboard metrics may be verified/curated differently than raw crash records. Keep those distinctions visible in analysis.
- Ward labels come from the crash layer. Always preserve them in location tables, but avoid implying that raw ward totals alone prove relative risk.
