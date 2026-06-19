#!/usr/bin/env python3
"""Tests for pipeline/hotspots.py pure logic.

Network and ArcGIS responses are stubbed; these cover the parts that could
silently drift and corrupt the corridor ranking or the baked GeoJSON:
the point-to-segment spatial join, per-record severity reading, ward resolution,
polyline decimation, street-name casing, and the confidence/intervention rules.

Run: python3 tests/test_hotspots_pipeline.py
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "pipeline"))

import hotspots  # noqa: E402


def test_point_segment_dist_endpoints_and_interior() -> None:
    # Horizontal segment from (0,0) to (100,0) in metre space.
    assert math.isclose(hotspots.point_segment_dist_m(50, 10, 0, 0, 100, 0), 10.0)
    # Beyond the B endpoint clamps to B.
    assert math.isclose(hotspots.point_segment_dist_m(150, 0, 0, 0, 100, 0), 50.0)
    # Before the A endpoint clamps to A.
    assert math.isclose(hotspots.point_segment_dist_m(-30, 0, 0, 0, 100, 0), 30.0)
    # Degenerate (zero-length) segment falls back to point distance.
    assert math.isclose(hotspots.point_segment_dist_m(3, 4, 0, 0, 0, 0), 5.0)


def test_field_reads_raw_record_values_with_casing_and_nulls() -> None:
    attrs = {"FATAL_PEDESTRIAN": 1, "majorinjuries_driver": None, "MINORINJURIES_DRIVER": "2"}
    assert hotspots._field(attrs, "FATAL_PEDESTRIAN") == 1
    assert hotspots._field(attrs, "MAJORINJURIES_DRIVER") == 0  # null -> 0
    assert hotspots._field(attrs, "MINORINJURIES_DRIVER") == 2  # numeric string coerced
    assert hotspots._field(attrs, "NOT_PRESENT") == 0


def test_crash_severity_splits_by_mode() -> None:
    attrs = {
        "FATAL_PEDESTRIAN": 1,
        "MAJORINJURIES_PEDESTRIAN": 2,
        "MINORINJURIES_PEDESTRIAN": 3,
        "MAJORINJURIES_DRIVER": 4,
    }
    sev = hotspots._crash_severity(attrs)
    assert sev["fatal"] == 1
    assert sev["major"] == 6  # 2 ped + 4 driver
    assert sev["minor"] == 3
    assert sev["mode_ksi"]["pedestrian"] == 3  # 1 fatal + 2 major
    assert sev["mode_ksi"]["driver"] == 4
    assert sev["mode_ksi"]["cyclist"] == 0


def _corridor(path):
    return {
        "corridor_id": "c1",
        "route_name": "TEST RD NE",
        "from_street": "A ST NE",
        "to_street": "B ST NE",
        "length_mi": 1.0,
        "tier": 1,
        "path": path,
    }


def test_join_assigns_only_crashes_within_buffer() -> None:
    # Corridor along a constant longitude near DC; ~0.001 deg lat steps.
    path = [[-77.00, 38.900], [-77.00, 38.905], [-77.00, 38.910]]
    corridors = [_corridor(path)]
    # One crash essentially on the line (KSI), one ~1km east (off the corridor).
    on_line = {"lon": -77.0000, "lat": 38.9025, "attrs": {"FATAL_PEDESTRIAN": 1, "MAJORINJURIES_DRIVER": 2, "WARD": "Ward 6"}}
    far = {"lon": -76.989, "lat": 38.9025, "attrs": {"MAJORINJURIES_DRIVER": 9, "WARD": "Ward 7"}}
    out = hotspots.join_crashes_to_corridors(corridors, [on_line, far])[0]
    assert out["crashes"] == 1  # only the on-line crash joined
    assert out["fatalities"] == 1
    assert out["major_injuries"] == 2
    assert out["ksi"] == 3  # 1 fatal + 2 major
    assert out["injuries"] == 2  # major + minor, the far crash's 9 excluded
    assert out["wards"] == ["Ward 6"]


def test_ward_list_filters_by_share_and_sorts() -> None:
    # Ward 8 dominates; Ward 7 above the 10% threshold; a stray junk bucket excluded.
    counts = {"Ward 8": 80, "Ward 7": 15, "Unknown ward": 5, "Ward 5": 1}
    assert hotspots._ward_list(counts) == ["Ward 7", "Ward 8"]
    assert hotspots._ward_list({}) == []


def test_simplify_caps_points_and_keeps_endpoints() -> None:
    path = [[float(i), 0.0] for i in range(200)]
    simp = hotspots._simplify(path, max_points=50)
    assert len(simp) <= 50
    assert simp[0] == path[0]
    assert simp[-1] == path[-1]
    # A short path is returned unchanged.
    short = [[0.0, 0.0], [1.0, 1.0]]
    assert hotspots._simplify(short, max_points=50) == short


def test_titlecase_keeps_directionals_and_ordinals() -> None:
    assert hotspots._titlecase("GEORGIA AVE NW") == "Georgia Ave NW"
    assert hotspots._titlecase("7TH ST NW") == "7th St NW"
    assert hotspots._titlecase("FLORIDA AVE NW/GEORGIA AVE NW") == "Florida Ave NW/Georgia Ave NW"
    assert hotspots._titlecase("MARTIN LUTHER KING JR AVE SE") == "Martin Luther King Jr Ave SE"


def test_clean_street_replaces_driveway_junk() -> None:
    assert hotspots._clean_street("Driveway-58022292") == "unnamed access road"
    assert hotspots._clean_street("Bowen Rd SE/Driveway-12") == "Bowen Rd SE/unnamed access road"
    assert hotspots._clean_street("5th St SE") == "5th St SE"


def test_confidence_thresholds() -> None:
    assert hotspots._confidence(100) == "high"
    assert hotspots._confidence(60) == "high"
    assert hotspots._confidence(59) == "medium"
    assert hotspots._confidence(25) == "medium"
    assert hotspots._confidence(24) == "low"


def test_recommend_interventions_react_to_mode_and_cap_at_four() -> None:
    catalog = hotspots._intervention_catalog()
    ped_heavy = {"ksi": 20, "mode_ksi": {"pedestrian": 10, "cyclist": 0, "driver": 5, "passenger": 0, "other": 0}}
    recs = hotspots.recommend_interventions(ped_heavy, catalog)
    assert len(recs) == 4
    ids = [r["id"] for r in recs]
    assert "leading_pedestrian_interval" in ids  # ped share >= 0.15 triggers ped fixes
    for r in recs:
        assert r["name"] and r["effect"]  # the data test requires both to render

    bike_heavy = {"ksi": 20, "mode_ksi": {"pedestrian": 0, "cyclist": 5, "driver": 10, "passenger": 0, "other": 0}}
    assert "protected_bike_lane" in [r["id"] for r in hotspots.recommend_interventions(bike_heavy, catalog)]


def main() -> int:
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    failed = 0
    for test in tests:
        try:
            test()
            print(f"PASS {test.__name__}")
        except AssertionError as exc:
            failed += 1
            print(f"FAIL {test.__name__}: {exc}")
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
