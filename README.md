# Vision Zero DC Crash Map

Static prototype for mapping DC crash records and related safety context from official District open data sources.

## Run Locally

```bash
python3 -m http.server 8050
```

Open <http://localhost:8050>.

The app has no build step and no package install. It uses Leaflet from a CDN and queries official DC ArcGIS/Open Data endpoints directly.

## Current Layers

| Layer | Status | Source |
| --- | --- | --- |
| Crashes in DC | Implemented as mapped points with date, severity, mode, and speeding filters | `https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Public_Safety_WebMercator/MapServer/24` |
| Crash Details Table | Implemented on demand when a crash is selected | `https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Public_Safety_WebMercator/MapServer/25` |
| Vision Zero Tracker / dashboard | Linked as official framing and verified-metric context | `https://dcvisionzero.github.io/Crash-Injury-Dashboard/` |
| Moving Violations | Implemented as optional contextual overlay for selected monthly tables | `Violations_Moving_2025` and `Violations_Moving_2026` MapServer tables |
| Hot spots in view | Implemented as server-side grouped statistics by address/ward and by ward | `Crashes in DC` grouped queries |

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
