#!/usr/bin/env python3
"""Tests for pipeline/snapshot.py pure logic.

Network and ArcGIS responses are out of scope here; these cover the parts that
could silently drift: ward-label normalization, the geodesic area helper, and
the triage-score weights staying in sync with README.md / app.js.

Run: python3 tests/test_snapshot.py
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "pipeline"))

import snapshot  # noqa: E402


def test_normalize_ward() -> None:
    assert snapshot._normalize_ward("Ward 1") == "Ward 1"
    assert snapshot._normalize_ward("Ward 8") == "Ward 8"
    for junk in ("Null", "Unknown", "UNKNOWN", "", None, "  ", "Ward X"):
        assert snapshot._normalize_ward(junk) == "Unknown ward", junk


def test_ring_area_unit_square() -> None:
    # A ~0.01 deg square near DC latitude. At 38.9 N, 0.01 deg lon ~ 0.866 km,
    # 0.01 deg lat ~ 1.111 km, so area ~ 0.962 km^2 ~ 0.3715 sq mi.
    lat0 = 38.9
    ring = [
        [-77.00, lat0],
        [-77.00, lat0 + 0.01],
        [-76.99, lat0 + 0.01],
        [-76.99, lat0],
        [-77.00, lat0],
    ]
    area = abs(snapshot._ring_area_sq_miles(ring, math.radians(lat0)))
    assert 0.36 < area < 0.385, area


def test_ring_area_orientation_sign_irrelevant_after_abs() -> None:
    lat0 = math.radians(38.9)
    ring = [[-77.0, 38.9], [-76.99, 38.9], [-76.99, 38.91], [-77.0, 38.91], [-77.0, 38.9]]
    rev = list(reversed(ring))
    assert math.isclose(
        abs(snapshot._ring_area_sq_miles(ring, lat0)),
        abs(snapshot._ring_area_sq_miles(rev, lat0)),
        rel_tol=1e-9,
    )


def test_triage_weights_match_documented_heuristic() -> None:
    # Guard against silent weight drift from README.md "Hotspot Method".
    assert (snapshot.W_FATAL, snapshot.W_MAJOR, snapshot.W_MINOR) == (40, 12, 2)
    assert (snapshot.W_PED, snapshot.W_BIKE, snapshot.W_SPEED) == (2, 2, 1)


def test_rate_per_handles_zero_denominator() -> None:
    assert snapshot.rate_per(10, None) is None
    assert snapshot.rate_per(10, 0) is None
    assert snapshot.rate_per(50, 100_000, 100_000) == 50.0


# --- Aggregation / assembly (network stubbed) ----------------------------


def _crash_feature(ward: str, count: int, *, fatal=0, major=0, minor=0, ped=0, bike=0, speed=0):
    """Build a fake ArcGIS grouped-stats feature like the crash layer returns."""
    return {
        "attributes": {
            "WARD": ward,
            "N": count,
            "s_FATAL_DRIVER": fatal,
            "s_MAJORINJURIES_DRIVER": major,
            "s_MINORINJURIES_DRIVER": minor,
            "s_TOTAL_PEDESTRIANS": ped,
            "s_TOTAL_BICYCLES": bike,
            "s_SPEEDING_INVOLVED": speed,
        }
    }


def _square_ring(lon: float, lat: float, d: float = 0.01):
    return [[lon, lat], [lon, lat + d], [lon + d, lat + d], [lon + d, lat], [lon, lat]]


def _install_fake_fetch(crash_features):
    """Patch snapshot.fetch_json to serve canned crash + ward-polygon responses."""
    original = snapshot.fetch_json

    def fake(url, params, *, refresh, label):  # noqa: ARG001
        if url == snapshot.WARD_LAYER:
            return {
                "features": [
                    {"attributes": {"NAME": "Ward 1", "WARD": "1"}, "geometry": {"rings": [_square_ring(-77.0, 38.9)]}},
                    {"attributes": {"NAME": "Ward 2", "WARD": "2"}, "geometry": {"rings": [_square_ring(-77.05, 38.92)]}},
                ]
            }
        return {"features": crash_features}

    snapshot.fetch_json = fake
    return original


def test_ward_statistics_aggregates_and_merges_unknowns() -> None:
    features = [
        _crash_feature("Ward 1", 100, fatal=1, major=2, minor=3, ped=4, bike=5, speed=6),
        _crash_feature("Null", 5, fatal=1),
        _crash_feature("Unknown", 2),
        _crash_feature("", 1),
    ]
    original = _install_fake_fetch(features)
    try:
        wards = snapshot.ward_statistics("2024-01-01", refresh=False)
    finally:
        snapshot.fetch_json = original

    assert wards["Ward 1"]["crashes"] == 100
    # 100 + 40*1 + 12*2 + 2*3 + 2*4 + 2*5 + 1*6 = 194
    assert wards["Ward 1"]["triage_score"] == 194
    # the three junk labels collapse into one Unknown ward bucket
    assert "Unknown ward" in wards
    assert wards["Unknown ward"]["crashes"] == 8
    assert wards["Unknown ward"]["fatalities"] == 1
    assert "Null" not in wards and "Unknown" not in wards


def test_build_joins_denominators_and_sorts_by_triage() -> None:
    features = [
        _crash_feature("Ward 1", 50, fatal=1),
        _crash_feature("Ward 2", 200, major=5),
        _crash_feature("Null", 9),
    ]
    original = _install_fake_fetch(features)
    try:
        summary = snapshot.build(refresh=False)
    finally:
        snapshot.fetch_json = original

    assert summary["schema_version"] == 1
    assert set(summary["windows"]) == {"2024", "2025", "2026", "all"}

    wards = summary["windows"]["all"]["wards"]
    # Ward 2 (200 + 60) outranks Ward 1 (50 + 40); Unknown ward is present but last-ish.
    real = [w for w in wards if w["ward"].startswith("Ward ")]
    assert real[0]["ward"] == "Ward 2"

    w1 = next(w for w in wards if w["ward"] == "Ward 1")
    assert w1["population"] == 88846  # from data/ward-denominators.json
    assert w1["land_area_sq_mi"] is not None and w1["land_area_sq_mi"] > 0
    # crashes_per_100k = 50 / 88846 * 100000
    assert w1["crashes_per_100k"] == round(50 / 88846 * 100_000, 2)
    assert w1["crashes_per_sq_mi"] == round(50 / w1["land_area_sq_mi"], 2)

    unknown = next(w for w in wards if w["ward"] == "Unknown ward")
    assert unknown["population"] is None
    assert unknown["crashes_per_100k"] is None

    citywide = summary["windows"]["all"]["citywide"]
    assert citywide["crashes"] == 50 + 200 + 9


def test_ward_land_area_matches_square_geometry() -> None:
    original = _install_fake_fetch([])
    try:
        areas = snapshot.ward_land_area(refresh=False)
    finally:
        snapshot.fetch_json = original
    # A 0.01-deg square near DC latitude is ~0.37 sq mi (see test_ring_area_unit_square).
    assert 0.36 < areas["Ward 1"] < 0.385


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
