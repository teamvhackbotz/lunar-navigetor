"""
FastAPI route controller for topocentric celestial ephemeris.
"""

from __future__ import annotations

from typing import Annotated
from fastapi import APIRouter, Query
from backend_api.modules.ephemeris.models import EphemerisResponse
from backend_api.modules.ephemeris.service import compute_ephemeris

router = APIRouter(prefix="/api/ephemeris", tags=["Ephemeris"])


@router.get("", response_model=EphemerisResponse)
def get_ephemeris(
    lat: Annotated[float, Query(description="Lunar latitude in degrees (N positive)", ge=-90, le=90)],
    lon: Annotated[float, Query(description="Lunar longitude in degrees (E positive)", ge=-360, le=360)],
    dt: Annotated[
        str,
        Query(description="UTC datetime in ISO 8601 format, e.g. 2026-11-14T08:00:00Z"),
    ],
    live_horizons: Annotated[bool, Query(description="Query external JPL Horizons if true")] = False,
) -> EphemerisResponse:
    """
    Returns Apparent Azimuth & Elevation of the Sun and Earth from given lunar coordinates.
    Uses ultra-fast analytical ephemeris engine by default (< 5µs latency), with optional
    live JPL Horizons proxying.
    """
    data = compute_ephemeris(lat=lat, lon=lon, dt_str=dt, live_horizons=live_horizons)
    return EphemerisResponse(**data)
