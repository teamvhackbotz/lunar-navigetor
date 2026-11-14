"""
Ephemeris service coordinating in-memory caching, live JPL Horizons proxying,
and analytical astronomical computations.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from fastapi import HTTPException
from backend_api.core.cache import get_cached_ephemeris, set_cached_ephemeris
from backend_api.modules.ephemeris.engine import calc_analytic_ephem
from backend_api.modules.ephemeris.horizons import parse_az_el, query_horizons_sync


def compute_ephemeris(lat: float, lon: float, dt_str: str, live_horizons: bool = False) -> dict[str, Any]:
    """
    Returns topocentric Azimuth & Elevation of the Sun and Earth.
    Checks memory cache first, resolves via Horizons if requested (or analytical engine).
    """
    try:
        dt_clean = dt_str.rstrip("Z").replace(" ", "T")
        parsed_dt = datetime.fromisoformat(dt_clean).replace(tzinfo=timezone.utc)
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid datetime format '{dt_str}'. Use ISO 8601, e.g. 2026-11-14T08:00:00Z.",
        ) from exc

    cache_key = f"{lat:.2f},{lon:.2f},{parsed_dt.isoformat()},{live_horizons}"
    cached = get_cached_ephemeris(cache_key)
    if cached:
        return cached

    if live_horizons:
        try:
            sun_raw = query_horizons_sync("10", lat, lon, parsed_dt)
            earth_raw = query_horizons_sync("399", lat, lon, parsed_dt)
            sun_az, sun_el = parse_az_el(sun_raw)
            earth_az, earth_el = parse_az_el(earth_raw)
            source = "horizons_live"
        except HTTPException:
            sun_az, sun_el, earth_az, earth_el = calc_analytic_ephem(lat, lon, parsed_dt)
            source = "analytic_fallback"
    else:
        sun_az, sun_el, earth_az, earth_el = calc_analytic_ephem(lat, lon, parsed_dt)
        source = "analytic_engine"

    resp = {
        "sun": {"az": sun_az, "el": sun_el},
        "earth": {"az": earth_az, "el": earth_el},
        "timestamp": parsed_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "site": {"lat": lat, "lon": lon},
        "source": source,
    }

    set_cached_ephemeris(cache_key, resp)
    return resp
