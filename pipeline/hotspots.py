#!/usr/bin/env python3
"""Generate high-injury corridor hotspots by joining crashes to DDOT's High Injury Network.

Replaces the hand-authored, ward-grain estimates in data/hotspots.geojson with
real per-corridor counts computed from canonical Open Data DC records. See
BACKLOG.md "Intersection-grain hotspots from the live snapshot" and the
DATA-AUDIT-001 residual ("compute real per-corridor counts via HIN spatial join").

Method (transparent and reproducible):
- Pull the 77 DDOT High Injury Network (HIN) corridor centerlines.
- Pull every crash 2022-present (paginated, cached on disk).
- The crash MapServer ignores server-side polyline buffering, so the spatial join
  is done client-side: each crash is assigned to the nearest HIN corridor whose
  centerline passes within BUFFER_M metres, using point-to-segment distance with a
  metre-space grid index. Crashes with no corridor within the buffer are dropped
  from corridor totals (they are not on the HIN).
- Per corridor we sum people killed, seriously (major) injured, and all injured,
  split KSI by travel mode, and read the ward(s) straight off the joined crashes.

Outputs:
- data/hin-corridors.json : all 77 corridors with full metrics + provenance.
- data/hotspots.geojson   : the top TOP_N corridors by KSI, in the schema the
                            map (hotspots.js) and landing teaser (landing.js) read.

Both carry source URLs, captured_at, and explicit method caveats. Recommended
interventions are a transparent screening suggestion derived from the dominant
crash mode, NOT a DDOT plan; effect sizes are drawn from data/countermeasures.json
and inherit its "research-grade until verified" caveat.

Usage:
    python3 pipeline/hotspots.py            # use cache when present
    python3 pipeline/hotspots.py --refresh  # force re-fetch from ArcGIS
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import re
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

import snapshot  # noqa: E402  (shared cache, fetch, field lists, ward normalize)

# --- Paths -----------------------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
CORRIDORS_PATH = DATA_DIR / "hin-corridors.json"
GEOJSON_PATH = DATA_DIR / "hotspots.geojson"
COUNTERMEASURES_PATH = DATA_DIR / "countermeasures.json"

# --- Sources ---------------------------------------------------------------

HIN_LAYER = (
    "https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/"
    "MoveDC/MapServer/17/query"
)
HIN_PAGE = "https://opendata.dc.gov/datasets/high-injury-network"
CRASH_PAGE = snapshot.CRASH_SOURCE_PAGE

# --- Tunables ---------------------------------------------------------------

SINCE = "2022-01-01"
PERIOD_LABEL = "2022-present"
BUFFER_M = 25.0  # a crash counts toward a corridor if within this of its centerline
TOP_N = 8  # corridors emitted to hotspots.geojson (the map + teaser)
PAGE_SIZE = 1000  # ArcGIS maxRecordCount for the crash layer
EARTH_R = 6_371_000.0
LAT0 = math.radians(38.9)  # DC latitude, for the local equirectangular projection
COS_LAT0 = math.cos(LAT0)
GRID_CELL_M = 400.0  # spatial-index cell; >> BUFFER_M so a 3x3 neighbour scan is safe

# Crash severity fields, grouped by mode, reused from the snapshot pipeline so the
# two stay in sync. (label, fatal field, major field, minor field, is_vulnerable)
MODE_FIELDS = [
    ("pedestrian", "FATAL_PEDESTRIAN", "MAJORINJURIES_PEDESTRIAN", "MINORINJURIES_PEDESTRIAN", True),
    ("cyclist", "FATAL_BICYCLIST", "MAJORINJURIES_BICYCLIST", "MINORINJURIES_BICYCLIST", True),
    ("driver", "FATAL_DRIVER", "MAJORINJURIES_DRIVER", "MINORINJURIES_DRIVER", False),
    ("passenger", "FATALPASSENGER", "MAJORINJURIESPASSENGER", "MINORINJURIESPASSENGER", False),
    ("other", "FATALOTHER", "MAJORINJURIESOTHER", "MINORINJURIESOTHER", False),
]
# Stable identifier + locator fields kept so every corridor count is traceable
# back to specific crash records (CRIMEID is the dataset's stable per-crash key).
ID_FIELDS = ["CRIMEID", "REPORTDATE", "ADDRESS"]
SAMPLE_RECORDS_PER_CORRIDOR = 15  # capped audit sample emitted per corridor
CRASH_FIELDS = ["WARD"] + ID_FIELDS + [f for _, fa, ma, mi, _ in MODE_FIELDS for f in (fa, ma, mi)]


# --- Geometry: local equirectangular projection + point-to-segment ----------


def to_xy(lon: float, lat: float) -> tuple[float, float]:
    """Project lon/lat to local metres (equirectangular around DC). Sub-1% over DC."""
    return (math.radians(lon) * EARTH_R * COS_LAT0, math.radians(lat) * EARTH_R)


def point_segment_dist_m(px: float, py: float, ax: float, ay: float, bx: float, by: float) -> float:
    """Distance in metres from point P to segment AB, all in projected metres."""
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    cx, cy = ax + t * dx, ay + t * dy
    return math.hypot(px - cx, py - cy)


def _cell(x: float, y: float) -> tuple[int, int]:
    return (int(math.floor(x / GRID_CELL_M)), int(math.floor(y / GRID_CELL_M)))


MAX_GEOM_POINTS = 50  # decimate dense HIN centerlines for the overview map


def _simplify(path: list[list[float]], max_points: int = MAX_GEOM_POINTS) -> list[list[float]]:
    """Evenly decimate a polyline to <= max_points, always keeping both endpoints.

    The map is a corridor overview, not a survey base map, so stride sampling keeps
    the line shape recognisable while cutting the baked file size several-fold.
    """
    if len(path) <= max_points:
        return path
    stride = math.ceil(len(path) / (max_points - 1))
    kept = path[::stride]
    if kept[-1] != path[-1]:
        kept.append(path[-1])
    return kept


_DIRECTIONALS = {"NW", "NE", "SE", "SW", "N", "S", "E", "W"}


def _titlecase_token(tok: str) -> str:
    up = tok.upper()
    if up in _DIRECTIONALS:
        return up
    if tok[:1].isdigit():  # ordinals like 7TH, 14TH, 1ST, 3RD
        return tok.lower()
    return tok.capitalize()


_DRIVEWAY_RE = re.compile(r"driveway-?\d+", re.IGNORECASE)


def _clean_street(name: str) -> str:
    """Replace HIN source junk like 'Driveway-58022292' with a readable label."""
    return _DRIVEWAY_RE.sub("unnamed access road", name).strip()


def _titlecase(name: str) -> str:
    """Title-case a street name while keeping DC quadrant directionals (NW/NE/SE/SW)
    uppercase and ordinal suffixes lowercase (7Th -> 7th). Preserves '/' separators
    used in compound HIN street names (e.g. 'Florida Ave NW/Georgia Ave NW')."""
    parts = [" ".join(_titlecase_token(t) for t in part.split()) for part in name.split("/")]
    return "/".join(parts)


# --- Fetch HIN corridors ----------------------------------------------------


def fetch_corridors(*, refresh: bool) -> list[dict[str, Any]]:
    """Fetch the 77 HIN corridor centerlines with attributes and 4326 geometry."""
    data = snapshot.fetch_json(
        HIN_LAYER,
        {
            "where": "1=1",
            "outFields": "ROUTENAME,FROMSTREET,TOSTREET,LENGTH_MI,TIER_1,TIER_2,TIER_3,CORRIDORID",
            "returnGeometry": "true",
            "outSR": "4326",
        },
        refresh=refresh,
        label="HIN corridors",
    )
    corridors: list[dict[str, Any]] = []
    for feat in data.get("features", []):
        attrs = feat["attributes"]
        paths = feat.get("geometry", {}).get("paths", [])
        if not paths:
            continue
        # hotspots.js draws a single LineString; pick the longest path part.
        path = max(paths, key=len)
        tier = 1 if attrs.get("TIER_1") else 2 if attrs.get("TIER_2") else 3
        corridors.append(
            {
                "corridor_id": attrs.get("CORRIDORID"),
                "route_name": (attrs.get("ROUTENAME") or "").strip(),
                "from_street": (attrs.get("FROMSTREET") or "").strip(),
                "to_street": (attrs.get("TOSTREET") or "").strip(),
                "length_mi": round(float(attrs.get("LENGTH_MI") or 0), 3),
                "tier": tier,
                "path": [[round(lon, 5), round(lat, 5)] for lon, lat in path],
            }
        )
    return corridors


# --- Fetch crashes (paginated) ----------------------------------------------


def fetch_crashes(*, refresh: bool) -> tuple[list[dict[str, Any]], int]:
    """Fetch every crash since SINCE with geometry + severity fields, paginated.

    Returns (geocoded_crashes, fetched_total) so the caller can report how many
    records were dropped for missing geometry."""
    crashes: list[dict[str, Any]] = []
    fetched = 0
    offset = 0
    while True:
        data = snapshot.fetch_json(
            snapshot.CRASH_LAYER,
            {
                "where": snapshot._where_for(SINCE),
                "outFields": ",".join(CRASH_FIELDS),
                "returnGeometry": "true",
                "outSR": "4326",
                "orderByFields": "OBJECTID",
                "resultRecordCount": str(PAGE_SIZE),
                "resultOffset": str(offset),
            },
            refresh=refresh,
            label=f"crashes offset {offset}",
        )
        feats = data.get("features", [])
        fetched += len(feats)
        for feat in feats:
            geom = feat.get("geometry") or {}
            x, y = geom.get("x"), geom.get("y")
            if x is None or y is None:
                continue  # ungeocoded crash: cannot join to a corridor
            crashes.append({"lon": x, "lat": y, "attrs": feat["attributes"]})
        if not data.get("exceededTransferLimit") or not feats:
            break
        offset += PAGE_SIZE
    return crashes, fetched


# --- Spatial join + aggregation --------------------------------------------


def _empty_agg() -> dict[str, Any]:
    return {
        "crashes": 0,
        "fatalities": 0,
        "major_injuries": 0,
        "minor_injuries": 0,
        "mode_ksi": {label: 0 for label, *_ in MODE_FIELDS},
        "ward_crashes": {},
        # audit trail: keep enough to trace counts back to source crash records
        "dist_sum": 0.0,
        "dist_max": 0.0,
        "date_min": None,
        "date_max": None,
        "sample_record_ids": [],
    }


def _epoch_ms_to_date(val: Any) -> str | None:
    """ArcGIS REPORTDATE is epoch milliseconds; return an ISO date (UTC) or None."""
    if val is None:
        return None
    try:
        return dt.datetime.fromtimestamp(int(val) / 1000, dt.timezone.utc).strftime("%Y-%m-%d")
    except (TypeError, ValueError, OverflowError, OSError):
        return None


def _field(attrs: dict[str, Any], name: str) -> int:
    """Read one raw severity count off an individual crash record (handles casing/nulls)."""
    val = attrs.get(name)
    if val is None:
        val = attrs.get(name.upper())
    if val is None:
        return 0
    try:
        return int(round(float(val)))
    except (TypeError, ValueError):
        return 0


def _crash_severity(attrs: dict[str, Any]) -> dict[str, Any]:
    """Per-record killed/major/minor totals and per-mode KSI from one crash."""
    fatal = major = minor = 0
    mode_ksi: dict[str, int] = {}
    for label, fa, ma, mi, _ in MODE_FIELDS:
        f = _field(attrs, fa)
        m = _field(attrs, ma)
        n = _field(attrs, mi)
        fatal += f
        major += m
        minor += n
        mode_ksi[label] = f + m
    return {"fatal": fatal, "major": major, "minor": minor, "mode_ksi": mode_ksi}


def join_crashes_to_corridors(
    corridors: list[dict[str, Any]], crashes: list[dict[str, Any]]
) -> tuple[list[dict[str, Any]], int]:
    """Assign each crash to the nearest corridor within BUFFER_M; aggregate per corridor.

    Returns (corridor_rows, joined_count) so the caller can report how many of the
    geocoded crashes fell on the HIN vs. were excluded as off-network."""
    # Build segment list in projected metres + a grid index keyed by metre-cell.
    segments: list[tuple[int, float, float, float, float]] = []
    grid: dict[tuple[int, int], list[int]] = {}
    for ci, corr in enumerate(corridors):
        pts = [to_xy(lon, lat) for lon, lat in corr["path"]]
        for (ax, ay), (bx, by) in zip(pts, pts[1:]):
            seg_idx = len(segments)
            segments.append((ci, ax, ay, bx, by))
            # register the segment in every cell its (buffer-padded) bbox overlaps
            cx0, cy0 = _cell(min(ax, bx) - BUFFER_M, min(ay, by) - BUFFER_M)
            cx1, cy1 = _cell(max(ax, bx) + BUFFER_M, max(ay, by) + BUFFER_M)
            for cx in range(cx0, cx1 + 1):
                for cy in range(cy0, cy1 + 1):
                    grid.setdefault((cx, cy), []).append(seg_idx)

    aggs = [_empty_agg() for _ in corridors]
    for crash in crashes:
        px, py = to_xy(crash["lon"], crash["lat"])
        ccx, ccy = _cell(px, py)
        best_dist = BUFFER_M
        best_ci = -1
        seen: set[int] = set()
        for cx in range(ccx - 1, ccx + 2):  # 3x3 neighbourhood
            for cy in range(ccy - 1, ccy + 2):
                for seg_idx in grid.get((cx, cy), ()):  # noqa: PLR2004
                    if seg_idx in seen:
                        continue
                    seen.add(seg_idx)
                    ci, ax, ay, bx, by = segments[seg_idx]
                    d = point_segment_dist_m(px, py, ax, ay, bx, by)
                    if d <= best_dist:
                        best_dist = d
                        best_ci = ci
        if best_ci < 0:
            continue
        attrs = crash["attrs"]
        sev = _crash_severity(attrs)
        agg = aggs[best_ci]
        agg["crashes"] += 1
        agg["fatalities"] += sev["fatal"]
        agg["major_injuries"] += sev["major"]
        agg["minor_injuries"] += sev["minor"]
        for label, k in sev["mode_ksi"].items():
            agg["mode_ksi"][label] += k
        ward = snapshot._normalize_ward(attrs.get("WARD"))
        agg["ward_crashes"][ward] = agg["ward_crashes"].get(ward, 0) + 1
        # audit trail
        agg["dist_sum"] += best_dist
        agg["dist_max"] = max(agg["dist_max"], best_dist)
        date = _epoch_ms_to_date(attrs.get("REPORTDATE"))
        if date:
            agg["date_min"] = date if agg["date_min"] is None else min(agg["date_min"], date)
            agg["date_max"] = date if agg["date_max"] is None else max(agg["date_max"], date)
        crime_id = attrs.get("CRIMEID")
        if crime_id and len(agg["sample_record_ids"]) < SAMPLE_RECORDS_PER_CORRIDOR:
            agg["sample_record_ids"].append(crime_id)

    joined = 0
    out: list[dict[str, Any]] = []
    for corr, agg in zip(corridors, aggs):
        joined += agg["crashes"]
        injuries = agg["major_injuries"] + agg["minor_injuries"]
        ksi = agg["fatalities"] + agg["major_injuries"]
        mean_dist = round(agg["dist_sum"] / agg["crashes"], 1) if agg["crashes"] else None
        out.append(
            {
                **corr,
                "crashes": agg["crashes"],
                "injuries": injuries,
                "fatalities": agg["fatalities"],
                "major_injuries": agg["major_injuries"],
                "minor_injuries": agg["minor_injuries"],
                "ksi": ksi,
                "mode_ksi": agg["mode_ksi"],
                "wards": _ward_list(agg["ward_crashes"]),
                "audit": {
                    "date_range": [agg["date_min"], agg["date_max"]],
                    "mean_join_distance_m": mean_dist,
                    "max_join_distance_m": round(agg["dist_max"], 1) if agg["crashes"] else None,
                    "sample_record_ids": agg["sample_record_ids"],
                },
            }
        )
    return out, joined


def _ward_list(ward_crashes: dict[str, int], *, min_share: float = 0.1) -> list[str]:
    """Wards covering at least min_share of a corridor's crashes, real wards only."""
    total = sum(ward_crashes.values())
    if not total:
        return []
    wards = [
        w
        for w, n in ward_crashes.items()
        if w.startswith("Ward ") and n / total >= min_share
    ]
    return sorted(wards, key=lambda w: int(w.split()[1]))


# --- Recommended interventions (transparent screening suggestion) -----------


def _intervention_catalog() -> dict[str, dict[str, str]]:
    """id -> {name, effect}. Effect strings come from data/countermeasures.json
    (the source of truth) when present; otherwise a qualitative mechanism phrase
    with no fabricated number, per the editorial promise."""
    catalog = {
        "road_diet": {"name": "Road diet / lane rechannelization", "effect": "reduces crashes by narrowing the roadway and removing passing/turning conflicts"},
        "protected_intersection": {"name": "Protected intersections", "effect": "separates turning vehicles from people walking and biking"},
        "leading_pedestrian_interval": {"name": "Leading pedestrian intervals", "effect": "gives people on foot a head start so turning drivers yield"},
        "curb_extension": {"name": "Curb extensions / bump-outs", "effect": "shortens crossing distance and slows turning vehicles"},
        "daylighting": {"name": "Daylighting (clear-sight corners)", "effect": "improves visibility at the crossing"},
        "protected_bike_lane": {"name": "Protected bike lanes", "effect": "physically separates people biking from traffic"},
        "automated_speed_camera": {"name": "Automated speed enforcement", "effect": "lowers speeds, the key driver of crash severity"},
        "speed_limit_20": {"name": "20 mph default speed limit", "effect": "improves pedestrian survival in a crash"},
    }
    try:
        cm = {c["id"]: c for c in json.loads(COUNTERMEASURES_PATH.read_text()).get("countermeasures", [])}
    except (OSError, ValueError, KeyError):
        cm = {}
    for cid, item in catalog.items():
        src = cm.get(cid)
        # Prefer the verified, sourced figure from the countermeasure library.
        if src and src.get("effect_size") and src.get("verified"):
            item["effect"] = src["effect_size"]
    return catalog


def recommend_interventions(corr: dict[str, Any], catalog: dict[str, dict[str, str]]) -> list[dict[str, str]]:
    """Rank interventions by THIS corridor's mode mix and severity, each tagged with
    the trigger evidence that surfaced it. A screening suggestion, not a DDOT plan.

    Scoring is driven by the corridor's own KSI composition so different corridors
    surface different fixes: a pedestrian-heavy corridor leads with crossing
    treatments, a fatality-heavy one leads with speed management, etc."""
    ksi = max(corr["ksi"], 1)
    mode = corr["mode_ksi"]
    ped = mode.get("pedestrian", 0)
    bike = mode.get("cyclist", 0)
    veh = mode.get("driver", 0) + mode.get("passenger", 0)
    deaths = corr["fatalities"]
    ped_share, bike_share, veh_share = ped / ksi, bike / ksi, veh / ksi
    death_rate = deaths / ksi

    def pct(x: float) -> str:
        return f"{round(x * 100)}%"

    # (id, score, trigger). Higher score = more relevant to this corridor.
    candidates = [
        ("leading_pedestrian_interval", ped_share, f"pedestrians are {pct(ped_share)} of KSI here"),
        ("curb_extension", ped_share * 0.95, f"{ped} pedestrian KSI on this corridor"),
        ("daylighting", ped_share * 0.9, f"pedestrians are {pct(ped_share)} of KSI here"),
        ("protected_bike_lane", bike_share, f"cyclists are {pct(bike_share)} of KSI here"),
        ("protected_intersection", veh_share * 0.6 + ped_share * 0.4, "turning conflicts: drivers/passengers are " + pct(veh_share) + " of KSI"),
        ("automated_speed_camera", 0.5 + death_rate, f"{deaths} traffic death(s) on this corridor"),
        ("road_diet", 0.45 + death_rate * 0.8, f"{corr['ksi']} KSI concentrated on one arterial"),
        ("speed_limit_20", 0.4, "speed is the key driver of crash severity"),
    ]
    # Sort by score desc, stable tie-break by id for determinism.
    candidates.sort(key=lambda c: (-c[1], c[0]))
    return [
        {"id": cid, **catalog[cid], "trigger": trigger}
        for cid, _score, trigger in candidates[:4]
    ]


# --- Assembly ---------------------------------------------------------------


def _confidence(crashes: int) -> str:
    if crashes >= 60:
        return "high"
    if crashes >= 25:
        return "medium"
    return "low"


def build(*, refresh: bool) -> tuple[dict[str, Any], dict[str, Any]]:
    now = dt.datetime.now(dt.timezone.utc)
    captured_at = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    corridors = fetch_corridors(refresh=refresh)
    crashes, fetched = fetch_crashes(refresh=refresh)
    joined, joined_count = join_crashes_to_corridors(corridors, crashes)
    geocoded = len(crashes)
    totals = {
        "crashes_fetched": fetched,
        "crashes_geocoded": geocoded,
        "crashes_ungeocoded": fetched - geocoded,
        "crashes_joined_to_corridor": joined_count,
        "crashes_excluded_off_network": geocoded - joined_count,
        "hin_corridors": len(corridors),
        "record_id_field": "CRIMEID",
    }
    # Rank by KSI desc, tie-break by total injuries then crashes (deterministic).
    joined.sort(key=lambda c: (c["ksi"], c["injuries"], c["crashes"]), reverse=True)

    sources = {
        "crashes": {
            "title": "Crashes in DC",
            "agency": "DDOT / MPD via Open Data DC",
            "query_url": snapshot.CRASH_LAYER,
            "page_url": CRASH_PAGE,
        },
        "hin": {
            "title": "High Injury Network",
            "agency": "DDOT (moveDC) via Open Data DC",
            "query_url": HIN_LAYER,
            "page_url": HIN_PAGE,
        },
    }
    method = (
        f"Each crash since {SINCE} is assigned to the nearest HIN corridor whose "
        f"centerline passes within {BUFFER_M:.0f} m (point-to-segment, local "
        "equirectangular projection). KSI = people killed + seriously (major) "
        "injured. Injuries = all reported injured people (major + minor). Ward(s) "
        "are read from the joined crash records. Each corridor carries an `audit` "
        "block (date range, join-distance stats, and a sample of CRIMEID record IDs) "
        "and `totals` reports fetched/geocoded/joined/excluded counts so the figures "
        "are traceable back to source records. Recommended interventions are a "
        "screening suggestion ranked by the corridor's own mode mix and severity "
        "(each carries its trigger), not a DDOT plan; effect sizes come from "
        "data/countermeasures.json (research-grade until verified)."
    )
    caveats = (
        "Counts are crashes within 25 m of the DDOT High Injury Network centerline, "
        f"{PERIOD_LABEL}, from the open, police-reported Crashes in DC dataset; they "
        "may differ from DDOT's curated figures. Ungeocoded crashes and crashes off "
        "the HIN are excluded. A crash near two corridors is assigned to the nearest."
    )

    corridors_doc = {
        "schema_version": 1,
        "captured_at": captured_at,
        "generator": "pipeline/hotspots.py",
        "period": PERIOD_LABEL,
        "buffer_m": BUFFER_M,
        "sources": sources,
        "method": method,
        "caveats": caveats,
        "totals": totals,
        "corridors": [
            {
                "corridor_id": c["corridor_id"],
                "route_name": c["route_name"],
                "from_street": _clean_street(c["from_street"]),
                "to_street": _clean_street(c["to_street"]),
                "length_mi": c["length_mi"],
                "tier": c["tier"],
                "wards": c["wards"],
                "crashes": c["crashes"],
                "injuries": c["injuries"],
                "fatalities": c["fatalities"],
                "major_injuries": c["major_injuries"],
                "minor_injuries": c["minor_injuries"],
                "ksi": c["ksi"],
                "mode_ksi": c["mode_ksi"],
                "audit": c["audit"],
            }
            for c in joined
        ],
    }

    catalog = _intervention_catalog()
    top = [c for c in joined if c["crashes"] > 0][:TOP_N]
    features = []
    for rank, c in enumerate(top, start=1):
        wards = c["wards"] or ["ward not resolved"]
        priority = "URGENT" if (rank <= 2 or c["tier"] == 1) else "HIGH"
        from_street = _clean_street(c["from_street"])
        to_street = _clean_street(c["to_street"])
        location = (
            f"{from_street} to {to_street}"
            if from_street and to_street
            else (from_street or to_street or "corridor extent")
        )
        features.append(
            {
                "id": f"hin_{c['corridor_id']}",
                "type": "Feature",
                "properties": {
                    "rank": rank,
                    "corridor_name": _titlecase(c["route_name"]),
                    "location_scope": _titlecase(location),
                    "ward": ", ".join(wards),
                    "severity": {
                        "injuries": c["injuries"],
                        "major_injuries": c["major_injuries"],
                        "fatalities": c["fatalities"],
                        "ksi": c["ksi"],
                        "crashes": c["crashes"],
                        "period": PERIOD_LABEL,
                    },
                    "mode_breakdown": {
                        "pedestrian_ksi": c["mode_ksi"]["pedestrian"],
                        "cyclist_ksi": c["mode_ksi"]["cyclist"],
                        "driver_ksi": c["mode_ksi"]["driver"],
                        "passenger_ksi": c["mode_ksi"]["passenger"],
                    },
                    "recommended_interventions": recommend_interventions(c, catalog),
                    "equity_notes": (
                        f"Serves {', '.join(wards)}. HIN Tier {c['tier']}. Equity context is "
                        "ward-level; pair with DC Equity Emphasis Areas before prioritizing."
                    ),
                    "confidence": _confidence(c["crashes"]),
                    "confidence_note": (
                        f"{c['crashes']} crashes joined within {BUFFER_M:.0f} m; "
                        f"{c['ksi']} KSI ({c['fatalities']} killed). "
                        "Counts from Open Data DC; corridor extent per DDOT HIN."
                    ),
                    "priority": priority,
                    "data_source": "Crashes in DC x DDOT High Injury Network (Open Data DC)",
                    "last_updated": captured_at[:10],
                    "audit": c["audit"],
                },
                "geometry": {"type": "LineString", "coordinates": _simplify(c["path"])},
            }
        )

    geojson = {
        "type": "FeatureCollection",
        "metadata": {
            "title": "DC Vision Zero High-Injury Corridors",
            "description": (
                f"Top {len(features)} HIN corridors by people killed or seriously injured, "
                "computed by joining Open Data DC crashes to the DDOT High Injury Network."
            ),
            "source_title": "Crashes in DC x High Injury Network",
            "source_url": CRASH_PAGE,
            "hin_source_url": HIN_PAGE,
            "captured_at": captured_at,
            "method": method,
            "caveats": caveats,
            "totals": totals,
        },
        "features": features,
    }
    return corridors_doc, geojson


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true", help="ignore cache and re-fetch")
    args = parser.parse_args()

    print("Building HIN corridor hotspots...", file=sys.stderr)
    corridors_doc, geojson = build(refresh=args.refresh)

    # Sanity check before writing: the top corridor must have a plausible KSI.
    feats = geojson["features"]
    if not feats:
        raise SystemExit("Refusing to write: no corridors joined any crashes. Source degraded?")
    top_ksi = feats[0]["properties"]["severity"]["ksi"]
    if top_ksi < 10:
        raise SystemExit(
            f"Refusing to write: top corridor KSI {top_ksi} implausibly low. Source may be degraded."
        )

    CORRIDORS_PATH.write_text(json.dumps(corridors_doc, indent=2) + "\n")
    GEOJSON_PATH.write_text(json.dumps(geojson, indent=2) + "\n")
    print(
        f"Wrote {GEOJSON_PATH.relative_to(ROOT)} ({len(feats)} corridors) and "
        f"{CORRIDORS_PATH.relative_to(ROOT)} ({len(corridors_doc['corridors'])} corridors). "
        f"Top: {feats[0]['properties']['corridor_name']} — {top_ksi} KSI.",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
