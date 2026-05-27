# BACKLOG.md - DC Vehicle Safety

> Future options for when the crash map, hotspot analysis, or policy recommendation views become too complex for the current static prototype.

---

## When To Upgrade

Consider moving an item from this backlog into active work when one of these starts happening:

- The map feels slow with normal filters or while panning.
- The point layer becomes visually unreadable at citywide zoom.
- Users need to compare wards, corridors, or intersections side by side.
- A recommendation needs multiple denominators, data joins, or repeatable methodology.
- The app needs saved analyses, permalinks, exports, or scheduled refreshes.
- The current browser-only ArcGIS queries make the UI brittle or hard to test.

---

## Visualization Complexity Options

### 1. Add Point Clustering

**Use when:** citywide crash dots are too dense to inspect.

**Approach:** cluster nearby crash points by zoom level, then expand into individual records at neighborhood/intersection scale.

**Good for:** fast overview, familiar map behavior, lower visual clutter.

**Tradeoff:** clusters can hide severe crashes unless severity-aware styling is added.

### 2. Add Heatmap / Density Layer

**Use when:** users need to see broad crash concentration patterns before drilling into records.

**Approach:** add a heatmap toggle using crash severity or weighted KSI values.

**Good for:** quick "where is harm concentrated?" exploration.

**Tradeoff:** heatmaps are not precise policy evidence; pair with table rankings and source records.

### 3. Add Hexbin Or Grid Aggregation

**Use when:** points and heatmaps both feel too noisy.

**Approach:** aggregate crashes into fixed hexes or grid cells with counts, KSI, vulnerable-user involvement, and speeding flags.

**Good for:** regional analysis, side-by-side comparisons, stable visual units.

**Tradeoff:** grid boundaries are artificial; intersections and corridors still need separate analysis.

### 4. Add Corridor-Level Views

**Use when:** hotspot rows start identifying roads more often than intersections.

**Approach:** group crashes by named corridor, road segment, or DDOT project geography.

**Good for:** policy recommendations like road diets, signal timing, bus/bike lane changes, speed management, and capital planning.

**Tradeoff:** requires a clean street centerline join and careful segment definitions.

### 5. Add Small Multiples

**Use when:** a single map has too many toggles.

**Approach:** show small maps by severity, travel mode, ward, time period, or intervention type.

**Good for:** comparing patterns without hiding logic behind filters.

**Tradeoff:** needs a careful layout so mobile does not become unusable.

### 6. Add Map/Table Split View

**Use when:** users need ranked evidence more than freeform map exploration.

**Approach:** create a sortable table for intersections, corridors, wards, and crash records, with map selection synchronized to table rows.

**Good for:** policy triage, auditability, source review, exporting lists.

**Tradeoff:** tables need pagination or virtualization once rows grow.

---

## Data And Performance Options

### 1. Precompute Local JSON Summaries

**Use when:** live ArcGIS grouped queries slow down or become fragile.

**Approach:** add a script that snapshots raw crash data and writes compact summary JSON for the frontend.

**Good for:** speed, reproducibility, versioned methodology.

**Tradeoff:** requires a refresh workflow and stale-data labels.

### 2. Use DuckDB For Local Analysis

**Use when:** analysis gets more complex but still fits local/static deployment.

**Approach:** store snapshots as Parquet/CSV and generate summaries with DuckDB scripts.

**Good for:** fast joins, repeatable ranking tables, easy data checks.

**Tradeoff:** still not a full production API.

### 3. Add PostGIS Backend

**Use when:** spatial joins, buffering, corridors, and ward/ANC overlays become core product features.

**Approach:** load crash, ward, street, project, traffic-volume, and violation data into Postgres/PostGIS.

**Good for:** serious geospatial analysis and reusable API endpoints.

**Tradeoff:** more infrastructure and deployment complexity.

### 4. Move Heavy Map Rendering To Vector Tiles

**Use when:** point rendering becomes the bottleneck even after filtering.

**Approach:** generate vector tiles for crashes, clusters, or aggregate cells.

**Good for:** smooth pan/zoom with large geospatial datasets.

**Tradeoff:** more build tooling and tile schema design.

### 5. Consider Deck.gl For Advanced Layers

**Use when:** the project needs high-performance WebGL layers like hexagons, arcs, animated time, or large point clouds.

**Approach:** keep the current civic-newsroom UI, but render heavy analytical layers in Deck.gl.

**Good for:** performant complex visualizations.

**Tradeoff:** more frontend complexity; only worth it if Leaflet/canvas is no longer enough.

---

## Policy Analysis Options

### 1. Add Exposure Denominators

**Use when:** ward or corridor comparisons become important.

**Potential denominators:** population, road miles, traffic volume, trips, bike counts, pedestrian counts, school enrollment, bus stops, or land area.

**Outcome:** move from "most crashes" toward "highest risk relative to exposure."

### 2. Add Intervention Taxonomy

**Use when:** hotspot output should suggest policy actions.

**Categories:** speed management, signal timing, protected bike/ped infrastructure, crossing improvements, curb management, enforcement, maintenance, legislation, budget, data quality.

**Outcome:** recommendation cards become consistent and reviewable.

### 3. Add Evidence Cards

**Use when:** ranked hotspots need policy recommendations.

**Card fields:** location, ward, grain, trigger metric, source rows, possible intervention, mechanism, confidence, equity check, caveats.

**Outcome:** recommendations remain auditable instead of becoming opaque scores.

### 4. Add Before/After Evaluation

**Use when:** DC projects or policies can be tied to dates and locations.

**Approach:** compare pre/post crash patterns with visible caveats about regression to the mean, exposure changes, and enforcement/reporting shifts.

**Outcome:** the tool can evaluate interventions, not just identify problems.

---

## UX Options

### 1. Add View Tabs

**Tabs:** Map, Hotspots, Wards, Corridors, Records, Methodology.

**Use when:** one screen starts carrying too many responsibilities.

### 2. Add Saved Filter URLs

**Use when:** users need to share a ward, hotspot, date range, or severity filter.

**Approach:** synchronize filters and map bounds to URL parameters.

### 3. Add Export Buttons

**Use when:** analysts need to move hotspot lists into memos, testimony, or spreadsheets.

**Formats:** CSV, GeoJSON, PNG, printable evidence card.

### 4. Add Methodology Drawer

**Use when:** scoring and ranking logic becomes too long for inline notes.

**Approach:** keep short caveats in the UI and link to a detailed methodology panel.

---

## First Likely Next Steps

1. Add URL-synced filters and map bounds.
2. Add a sortable hotspot table below the map for mobile and tablet.
3. Add a local data snapshot script for reproducible crash and ward summaries.
4. Add denominators for ward comparisons before making any ward risk claims.
5. Add evidence-card templates for policy recommendations.
