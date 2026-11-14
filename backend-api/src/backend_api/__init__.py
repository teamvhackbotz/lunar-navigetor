"""
Lunar Navigator – Backend API
FastAPI app that proxies the JPL Horizons API and returns real Sun/Earth
azimuth/elevation as seen from a given lunar surface coordinate.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Annotated

import requests
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Lunar Navigator – Ephemeris API",
    description="Proxies JPL Horizons to return Sun/Earth positions from the lunar surface.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# JPL Horizons helpers
# ---------------------------------------------------------------------------

HORIZONS_URL = "https://ssd.jpl.nasa.gov/api/horizons.api"
HORIZONS_TIMEOUT = 30  # seconds


def _fmt_time(dt: datetime) -> tuple[str, str]:
    """Return (START_TIME, STOP_TIME) strings for a 1-minute window."""
    # JPL wants 'YYYY-Mon-DD HH:MM' with 3-letter month abbreviation
    start = dt.strftime("%Y-%b-%d %H:%M")
    # Add exactly one minute for the stop time
    minute = dt.minute + 1
    hour = dt.hour
    if minute >= 60:
        minute -= 60
        hour = (hour + 1) % 24
    stop_dt = dt.replace(hour=hour, minute=minute)
    stop = stop_dt.strftime("%Y-%b-%d %H:%M")
    return start, stop


def _query_horizons(command: str, lat: float, lon: float, dt: datetime) -> str:
    """Call JPL Horizons and return the raw result text."""
    start, stop = _fmt_time(dt)
    params = {
        "format": "json",
        "COMMAND": f"'{command}'",
        "OBJ_DATA": "'NO'",
        "MAKE_EPHEM": "'YES'",
        "EPHEM_TYPE": "'OBSERVER'",
        "CENTER": "'coord@301'",
        "COORD_TYPE": "'GEODETIC'",
        # JPL expects: lon,lat,elevation(km)  — lon is E-positive
        "SITE_COORD": f"'{lon},{lat},0'",
        "START_TIME": f"'{start}'",
        "STOP_TIME": f"'{stop}'",
        "STEP_SIZE": "'1 m'",
        "QUANTITIES": "'2'",
        "ANG_FORMAT": "'DEG'",
        "CSV_FORMAT": "'YES'",
    }
    try:
        resp = requests.get(HORIZONS_URL, params=params, timeout=HORIZONS_TIMEOUT)
        resp.raise_for_status()
    except requests.exceptions.ConnectionError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"JPL Horizons is unreachable: {exc}",
        ) from exc
    except requests.exceptions.Timeout as exc:
        raise HTTPException(
            status_code=503,
            detail=f"JPL Horizons request timed out: {exc}",
        ) from exc
    except requests.exceptions.HTTPError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"JPL Horizons returned an error: {exc}",
        ) from exc

    data = resp.json()
    if "result" not in data:
        raise HTTPException(
            status_code=503,
            detail="Unexpected JPL Horizons response: missing 'result' field.",
        )
    return data["result"]


def _parse_az_el(result_text: str) -> tuple[float, float]:
    """
    Extract azimuth and elevation from the JPL Horizons result text.

    The $$SOE…$$EOE block in CSV OBSERVER mode (QUANTITIES='2') has columns:
        Date__(UT)__HR:MN, , , , Azi_(a-app), Elev_(a-app), ...
    We grab the last data line and return (az, el).
    """
    soe = result_text.find("$$SOE")
    eoe = result_text.find("$$EOE")
    if soe == -1 or eoe == -1:
        # Sometimes Horizons returns an error message inside result
        raise HTTPException(
            status_code=422,
            detail=f"Could not find $$SOE/$$EOE markers in JPL response. "
                   f"Response snippet: {result_text[:500]}",
        )

    block = result_text[soe + len("$$SOE"):eoe].strip()
    lines = [ln.strip() for ln in block.splitlines() if ln.strip()]
    if not lines:
        raise HTTPException(
            status_code=422,
            detail="Empty data block in JPL Horizons response.",
        )

    last_line = lines[-1]
    parts = [p.strip() for p in last_line.split(",")]

    # CSV columns (0-indexed):
    # 0: Date__(UT)__HR:MN
    # 1: (blank / solar presence flag)
    # 2: (blank)
    # 3: (blank)
    # 4: Azi_(a-app)
    # 5: Elev_(a-app)
    try:
        az = float(parts[4])
        el = float(parts[5])
    except (IndexError, ValueError) as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to parse az/el from JPL data line: '{last_line}'. Error: {exc}",
        ) from exc

    return az, el


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class AzEl(BaseModel):
    az: float
    el: float


class SiteInfo(BaseModel):
    lat: float
    lon: float


class EphemerisResponse(BaseModel):
    sun: AzEl
    earth: AzEl
    timestamp: str
    site: SiteInfo


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health() -> dict[str, str]:
    """Simple liveness check."""
    return {"status": "ok"}


@app.get("/api/ephemeris", response_model=EphemerisResponse)
async def get_ephemeris(
    lat: Annotated[float, Query(description="Lunar latitude in degrees (N positive)", ge=-90, le=90)],
    lon: Annotated[float, Query(description="Lunar longitude in degrees (E positive)", ge=-360, le=360)],
    dt: Annotated[
        str,
        Query(
            description="UTC datetime in ISO 8601 format, e.g. 2026-11-14T08:00:00Z",
        ),
    ],
) -> EphemerisResponse:
    """
    Return the azimuth and elevation of the Sun and Earth as seen from a
    given point on the lunar surface at the specified UTC datetime.
    """
    # Parse the datetime
    try:
        # Accept ISO 8601 with or without trailing 'Z'
        dt_clean = dt.rstrip("Z").replace(" ", "T")
        parsed_dt = datetime.fromisoformat(dt_clean).replace(tzinfo=timezone.utc)
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid datetime format '{dt}'. Use ISO 8601, e.g. 2026-11-14T08:00:00Z.",
        ) from exc

    # Query JPL Horizons for Sun (COMMAND='10') and Earth (COMMAND='399')
    sun_result = _query_horizons("10", lat, lon, parsed_dt)
    earth_result = _query_horizons("399", lat, lon, parsed_dt)

    sun_az, sun_el = _parse_az_el(sun_result)
    earth_az, earth_el = _parse_az_el(earth_result)

    return EphemerisResponse(
        sun=AzEl(az=sun_az, el=sun_el),
        earth=AzEl(az=earth_az, el=earth_el),
        timestamp=parsed_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        site=SiteInfo(lat=lat, lon=lon),
    )


# ---------------------------------------------------------------------------
# Legacy entry-point (kept so pyproject.toml script still works)
# ---------------------------------------------------------------------------

def main() -> None:
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
