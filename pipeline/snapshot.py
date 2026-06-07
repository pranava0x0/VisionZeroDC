#!/usr/bin/env python3
"""Snapshot DC crash statistics into a compact, source-traceable summary JSON.

Replaces fragile per-load live ArcGIS grouped queries with a reproducible baked
file (data/crash-summary.json) consumed by the static frontend. See BACKLOG.md
items "Precompute Local JSON Summaries" and "Add Exposure Denominators".

Design notes:
- Uses only the Python standard library (urllib) to stay dependency-free.
- Idempotent: responses are cached under data/cache/; re-runs reuse the cache
  unless --refresh is passed. Re-running is safe and produces the same output.
- Source-traceable: every number carries its source URL and a captured_at stamp.
- Denominators: ward population comes from data/ward-denominators.json; ward land
  area is computed here from official ward polygons. Rates are clearly labeled as
  triage context, not official risk measures.

Usage:
    python3 pipeline/snapshot.py            # use cache when present
    python3 pipeline/snapshot.py --refresh  # force re-fetch from ArcGIS
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import math
import sys
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

# --- Paths -----------------------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
CACHE_DIR = DATA_DIR / "cache"
DENOMINATORS_PATH = DATA_DIR / "ward-denominators.json"
OUTPUT_PATH = DATA_DIR / "crash-summary.json"

# --- Sources (mirror app.js so frontend and pipeline agree) ----------------

CRASH_LAYER = (
    "https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/"
    "Public_Safety_WebMercator/MapServer/24/query"
)
WARD_LAYER = (
    "https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/"
    "Administrative_Other_Boundaries_WebMercator/MapServer/53/query"
)
CRASH_SOURCE_PAGE = "https://opendata.dc.gov/datasets/DCGIS::crashes-in-dc"

USER_AGENT = "dc-vehicle-safety-snapshot/1.0 (+https://github.com/pranava0x0)"

# Date windows the frontend exposes (value -> human label + where-clause start).
DATE_WINDOWS: list[dict[str, str]] = [
    {"key": "2024", "label": "2024-present", "since": "2024-01-01"},
    {"key": "2025", "label": "2025-present", "since": "2025-01-01"},
    {"key": "2026", "label": "2026-present", "since": "2026-01-01"},
    {"key": "all", "label": "all available records", "since": ""},
]

# Severity-weighted triage score components, summed server-side per ward.
# Mirrors the triageScore() heuristic in app.js so the baked numbers match the
# live ranking. This is a screening heuristic, NOT an official DDOT ranking.
FATAL_FIELDS = [
    "FATAL_BICYCLIST",
    "FATAL_DRIVER",
    "FATAL_PEDESTRIAN",
    "FATALPASSENGER",
    "FATALOTHER",
]
MAJOR_FIELDS = [
    "MAJORINJURIES_BICYCLIST",
    "MAJORINJURIES_DRIVER",
    "MAJORINJURIES_PEDESTRIAN",
    "MAJORINJURIESPASSENGER",
    "MAJORINJURIESOTHER",
]
MINOR_FIELDS = [
    "MINORINJURIES_BICYCLIST",
    "MINORINJURIES_DRIVER",
    "MINORINJURIES_PEDESTRIAN",
    "MINORINJURIESPASSENGER",
    "MINORINJURIESOTHER",
]
PED_FIELD = "TOTAL_PEDESTRIANS"
BIKE_FIELD = "TOTAL_BICYCLES"
SPEED_FIELD = "SPEEDING_INVOLVED"  # numeric count field, summed like the rest

# Triage score weights (kept identical to README.md "Hotspot Method").
W_FATAL = 40
W_MAJOR = 12
W_MINOR = 2
W_PED = 2
W_BIKE = 2
W_SPEED = 1


# --- HTTP with on-disk cache ----------------------------------------------


def _cache_key(url: str, params: dict[str, str]) -> str:
    blob = url + "?" + urllib.parse.urlencode(sorted(params.items()))
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()[:16]


def fetch_json(
    url: str, params: dict[str, str], *, refresh: bool, label: str
) -> dict[str, Any]:
    """GET an ArcGIS query as JSON, caching the raw response on disk."""
    params = {**params, "f": "json"}
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file = CACHE_DIR / f"{_cache_key(url, params)}.json"

    if cache_file.exists() and not refresh:
        print(f"  cache  {label}", file=sys.stderr)
        return json.loads(cache_file.read_text())

    query = urllib.parse.urlencode(params)
    req = urllib.request.Request(f"{url}?{query}", headers={"User-Agent": USER_AGENT})
    print(f"  fetch  {label}", file=sys.stderr)
    with urllib.request.urlopen(req, timeout=120) as resp:  # noqa: S310 (trusted gov host)
        payload = resp.read().decode("utf-8")

    data = json.loads(payload)
    if "error" in data:
        raise RuntimeError(f"ArcGIS error for {label}: {data['error']}")
    cache_file.write_text(payload)
    return data


# --- Crash statistics ------------------------------------------------------


def _out_statistics() -> str:
    """Build the outStatistics JSON: count plus summed severity/mode fields."""
    stats: list[dict[str, str]] = [
        {"statisticType": "count", "onStatisticField": "OBJECTID", "outStatisticFieldName": "n"}
    ]
    summed = FATAL_FIELDS + MAJOR_FIELDS + MINOR_FIELDS + [PED_FIELD, BIKE_FIELD, SPEED_FIELD]
    for field in summed:
        stats.append(
            {
                "statisticType": "sum",
                "onStatisticField": field,
                "outStatisticFieldName": f"s_{field}",
            }
        )
    return json.dumps(stats)


def _where_for(since: str) -> str:
    if not since:
        return "1=1"
    return f"REPORTDATE >= DATE '{since}'"


def _normalize_ward(raw: Any) -> str:
    """Collapse the assorted unlocated labels ('Null', 'Unknown', '', None) into one."""
    name = (str(raw).strip() if raw is not None else "")
    if name.startswith("Ward ") and name[5:].strip().isdigit():
        return name
    return "Unknown ward"


def _sum(attrs: dict[str, Any], fields: list[str]) -> int:
    total = 0
    for field in fields:
        val = attrs.get(f"s_{field}") or attrs.get(f"S_{field}")
        if val is not None:
            total += int(round(float(val)))
    return total


def ward_statistics(since: str, *, refresh: bool) -> dict[str, dict[str, int]]:
    """Per-ward crash totals for one date window."""
    where = _where_for(since)
    label_base = f"crash stats since {since or 'all'}"
    data = fetch_json(
        CRASH_LAYER,
        {
            "where": where,
            "groupByFieldsForStatistics": "WARD",
            "outStatistics": _out_statistics(),
        },
        refresh=refresh,
        label=label_base,
    )

    metrics = (
        "crashes",
        "fatalities",
        "major_injuries",
        "minor_injuries",
        "pedestrians_involved",
        "bicycles_involved",
        "speeding_involved",
    )
    wards: dict[str, dict[str, int]] = {}
    for feat in data.get("features", []):
        attrs = feat["attributes"]
        ward = _normalize_ward(attrs.get("WARD"))
        row = wards.setdefault(ward, {key: 0 for key in metrics})
        row["crashes"] += int(attrs.get("N") or attrs.get("n") or 0)
        row["fatalities"] += _sum(attrs, FATAL_FIELDS)
        row["major_injuries"] += _sum(attrs, MAJOR_FIELDS)
        row["minor_injuries"] += _sum(attrs, MINOR_FIELDS)
        row["pedestrians_involved"] += _sum(attrs, [PED_FIELD])
        row["bicycles_involved"] += _sum(attrs, [BIKE_FIELD])
        row["speeding_involved"] += _sum(attrs, [SPEED_FIELD])

    for row in wards.values():
        row["triage_score"] = (
            row["crashes"]
            + W_FATAL * row["fatalities"]
            + W_MAJOR * row["major_injuries"]
            + W_MINOR * row["minor_injuries"]
            + W_PED * row["pedestrians_involved"]
            + W_BIKE * row["bicycles_involved"]
            + W_SPEED * row["speeding_involved"]
        )
    return wards


# --- Citywide trend by year + accountability scorecard ---------------------

# Vision Zero launched in DC in 2015; 2015-2019 is the pre-COVID baseline window.
SCORECARD_BASELINE = (2015, 2019)
# Recent, settled window used for the honest accountability comparison. Avoids the
# 2015 open-data anomaly (its major-injury counts are far above 2016-2019) and the
# reporting lag in the newest years.
SCORECARD_RECENT = (2020, 2024)
# The newest calendar years are still being coded, so their death/injury counts are
# preliminary and tend to rise as records settle. Flag this many latest years.
PRELIMINARY_YEARS = 2
TREND_START_YEAR = 2015


def citywide_by_year(*, refresh: bool, end_year: int) -> list[dict[str, int]]:
    """Citywide crash + KSI totals per calendar year, TREND_START_YEAR..end_year."""
    rows: list[dict[str, int]] = []
    for year in range(TREND_START_YEAR, end_year + 1):
        where = (
            f"REPORTDATE >= DATE '{year}-01-01' AND REPORTDATE < DATE '{year + 1}-01-01'"
        )
        data = fetch_json(
            CRASH_LAYER,
            {"where": where, "outStatistics": _out_statistics()},
            refresh=refresh,
            label=f"year {year}",
        )
        feats = data.get("features", [])
        attrs = feats[0]["attributes"] if feats else {}
        crashes = int(attrs.get("N") or attrs.get("n") or 0)
        fatal = _sum(attrs, FATAL_FIELDS)
        major = _sum(attrs, MAJOR_FIELDS)
        minor = _sum(attrs, MINOR_FIELDS)
        rows.append(
            {
                "year": year,
                "crashes": crashes,
                "fatalities": fatal,
                "major_injuries": major,
                "minor_injuries": minor,
                "ksi": fatal + major,
            }
        )
    return rows


def _window_avg(by: dict[int, dict[str, int]], lo: int, hi: int, metric: str):
    """Average of a metric over a year window, using only years that have data."""
    years = [y for y in range(lo, hi + 1) if by.get(y, {}).get("crashes", 0) > 0]
    if not years:
        return None, []
    return round(sum(by[y][metric] for y in years) / len(years), 1), years


def _pct_change(current, base) -> float | None:
    if current is None or not base:
        return None
    return round((current - base) / base * 100, 1)


def build_scorecard(by_year: list[dict[str, int]], *, this_year: int) -> dict[str, Any]:
    """Accountability scorecard comparing recent traffic deaths/serious injuries to
    the launch-era baseline, framed honestly around DC's missed 2024 target.

    The headline year is the latest full year, but the most recent PRELIMINARY_YEARS
    are flagged because their counts rise as records are coded. The "peak" year in the
    settled recent window carries the real accountability story (deaths rose, not fell).
    """
    by = {r["year"]: r for r in by_year}
    base_fatal, base_years = _window_avg(by, *SCORECARD_BASELINE, "fatalities")
    base_ksi, _ = _window_avg(by, *SCORECARD_BASELINE, "ksi")
    recent_fatal, recent_years = _window_avg(by, *SCORECARD_RECENT, "fatalities")
    recent_ksi, _ = _window_avg(by, *SCORECARD_RECENT, "ksi")

    latest_full_year = this_year - 1
    latest = by.get(latest_full_year)
    ytd = by.get(this_year)
    preliminary_years = sorted(by)[-PRELIMINARY_YEARS:] if by else []

    # Peak death year within the settled recent window (the accountability hook).
    settled_recent = [by[y] for y in recent_years]
    peak = max(settled_recent, key=lambda r: r["fatalities"]) if settled_recent else None

    return {
        "baseline_window": list(SCORECARD_BASELINE),
        "baseline_years_used": base_years,
        "baseline_avg_fatalities": base_fatal,
        "baseline_avg_ksi": base_ksi,
        "recent_window": list(SCORECARD_RECENT),
        "recent_years_used": recent_years,
        "recent_avg_fatalities": recent_fatal,
        "recent_avg_ksi": recent_ksi,
        "peak_recent_year": peak["year"] if peak else None,
        "peak_recent_fatalities": peak["fatalities"] if peak else None,
        "latest_full_year": latest_full_year,
        "latest_full_year_fatalities": latest["fatalities"] if latest else None,
        "latest_full_year_ksi": latest["ksi"] if latest else None,
        "fatalities_change_vs_baseline_pct": _pct_change(
            latest["fatalities"] if latest else None, base_fatal
        ),
        "ytd_year": this_year,
        "ytd_fatalities": ytd["fatalities"] if ytd else None,
        "ytd_ksi": ytd["ksi"] if ytd else None,
        "preliminary_years": preliminary_years,
        "target_year": 2024,
        "data_quality": (
            "Counts come from the open, police-reported Crashes in DC dataset and may "
            "differ from DDOT's curated Vision Zero figures. The most recent "
            f"{PRELIMINARY_YEARS} years ({', '.join(map(str, preliminary_years))}) are "
            "preliminary and typically rise as records are coded. 2015 major-injury "
            "counts in the open data look anomalously high, so the comparison uses the "
            "settled 2020-2024 window. KSI = people killed or seriously (major) injured. "
            "DC set a goal of zero deaths and serious injuries by 2024 and did not meet it."
        ),
    }


# --- Ward land area from official polygons ---------------------------------


def _ring_area_sq_miles(ring: list[list[float]], lat0_rad: float) -> float:
    """Planar area of one lon/lat ring via local equirectangular projection.

    Accurate to well under 1% for ward-sized polygons. Returns signed sq miles
    (sign indicates ring orientation; caller takes absolute value of the sum).
    """
    earth_radius_m = 6_371_000.0
    pts = []
    for lon, lat in ring:
        x = math.radians(lon) * earth_radius_m * math.cos(lat0_rad)
        y = math.radians(lat) * earth_radius_m
        pts.append((x, y))
    area_m2 = 0.0
    for i in range(len(pts) - 1):
        x1, y1 = pts[i]
        x2, y2 = pts[i + 1]
        area_m2 += x1 * y2 - x2 * y1
    area_m2 /= 2.0
    return area_m2 / 2_589_988.110336  # m^2 -> sq miles


def ward_land_area(*, refresh: bool) -> dict[str, float]:
    """Square miles per ward, computed from official 2022 ward polygons."""
    data = fetch_json(
        WARD_LAYER,
        {
            "where": "1=1",
            "outFields": "NAME,WARD",
            "returnGeometry": "true",
            "outSR": "4326",
        },
        refresh=refresh,
        label="ward polygons",
    )
    areas: dict[str, float] = {}
    for feat in data.get("features", []):
        name = feat["attributes"].get("NAME") or f"Ward {feat['attributes'].get('WARD')}"
        rings = feat.get("geometry", {}).get("rings", [])
        if not rings:
            continue
        lats = [pt[1] for ring in rings for pt in ring]
        lat0 = math.radians(sum(lats) / len(lats))
        total = sum(abs(_ring_area_sq_miles(ring, lat0)) for ring in rings)
        areas[name] = round(total, 3)
    return areas


# --- Assembly --------------------------------------------------------------


def rate_per(numerator: int, denominator: float | None, scale: float = 1.0) -> float | None:
    if not denominator:
        return None
    return round(numerator / denominator * scale, 2)


def build(*, refresh: bool) -> dict[str, Any]:
    now = dt.datetime.now(dt.timezone.utc)
    captured_at = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    denominators = json.loads(DENOMINATORS_PATH.read_text())
    population = denominators["population"]["by_ward"]
    land_area = ward_land_area(refresh=refresh)
    by_year = citywide_by_year(refresh=refresh, end_year=now.year)
    scorecard = build_scorecard(by_year, this_year=now.year)

    windows_out: dict[str, Any] = {}
    for window in DATE_WINDOWS:
        wards_stats = ward_statistics(window["since"], refresh=refresh)
        ward_rows = []
        citywide = {
            "crashes": 0,
            "fatalities": 0,
            "major_injuries": 0,
            "minor_injuries": 0,
            "pedestrians_involved": 0,
            "bicycles_involved": 0,
            "speeding_involved": 0,
        }
        for ward, stats in wards_stats.items():
            for key in citywide:
                citywide[key] += stats[key]
            is_real_ward = ward.startswith("Ward ")
            pop = population.get(ward) if is_real_ward else None
            area = land_area.get(ward) if is_real_ward else None
            ward_rows.append(
                {
                    "ward": ward,
                    **stats,
                    "population": pop,
                    "land_area_sq_mi": area,
                    "crashes_per_100k": rate_per(stats["crashes"], pop, 100_000),
                    "crashes_per_sq_mi": rate_per(stats["crashes"], area),
                    "ksi_per_100k": rate_per(
                        stats["fatalities"] + stats["major_injuries"], pop, 100_000
                    ),
                    "ksi_per_sq_mi": rate_per(
                        stats["fatalities"] + stats["major_injuries"], area
                    ),
                }
            )
        ward_rows.sort(key=lambda r: r["triage_score"], reverse=True)
        windows_out[window["key"]] = {
            "label": window["label"],
            "since": window["since"] or None,
            "citywide": citywide,
            "wards": ward_rows,
        }

    return {
        "schema_version": 1,
        "captured_at": captured_at,
        "generator": "pipeline/snapshot.py",
        "sources": {
            "crashes": {
                "title": "Crashes in DC",
                "agency": "DDOT / MPD via Open Data DC",
                "query_url": CRASH_LAYER,
                "page_url": CRASH_SOURCE_PAGE,
            },
            "wards": {
                "title": "Ward - 2022 boundaries",
                "agency": "Open Data DC / DCGIS",
                "query_url": WARD_LAYER,
            },
            "population": denominators["population"],
        },
        "method": {
            "triage_score": (
                "crashes + 40*fatalities + 12*major_injuries + 2*minor_injuries "
                "+ 2*pedestrians_involved + 2*bicycles_involved + 1*speeding_involved"
            ),
            "triage_note": (
                "Screening heuristic for finding places to inspect, not an official "
                "DDOT ranking. Do not use raw ward totals for relative-risk claims "
                "without exposure denominators."
            ),
            "land_area": denominators["land_area"]["method"],
        },
        "caveats": denominators["_caveats"],
        "scorecard": scorecard,
        "citywide_by_year": by_year,
        "windows": windows_out,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--refresh", action="store_true", help="ignore cache and re-fetch from ArcGIS"
    )
    args = parser.parse_args()

    print("Building crash summary snapshot...", file=sys.stderr)
    summary = build(refresh=args.refresh)

    # Sanity check before writing the canonical file.
    all_window = summary["windows"].get("all", {})
    total_crashes = all_window.get("citywide", {}).get("crashes", 0)
    if total_crashes < 100_000:
        raise SystemExit(
            f"Refusing to write: all-window crash total {total_crashes} is implausibly "
            "low (expected >100k). Source may be degraded."
        )

    OUTPUT_PATH.write_text(json.dumps(summary, indent=2) + "\n")
    print(
        f"Wrote {OUTPUT_PATH.relative_to(ROOT)} "
        f"({total_crashes:,} all-time crashes across "
        f"{len(all_window.get('wards', []))} ward groups).",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
