"""
NASA JPL Horizons API integration and OBSERVER table parser.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from fastapi import HTTPException
import requests
from backend_api.config import HORIZONS_TIMEOUT, HORIZONS_URL


def format_horizons_window(dt: datetime) -> tuple[str, str]:
    """Return (START_TIME, STOP_TIME) strings for a 1-minute window, handling midnight rollover."""
    start = dt.strftime("%Y-%b-%d %H:%M")
    stop_dt = dt + timedelta(minutes=1)
    stop = stop_dt.strftime("%Y-%b-%d %H:%M")
    return start, stop


def query_horizons_sync(command: str, lat: float, lon: float, dt: datetime) -> str:
    """Synchronous network query to NASA JPL Horizons API."""
    start, stop = format_horizons_window(dt)
    params = {
        "format": "json",
        "COMMAND": f"'{command}'",
        "OBJ_DATA": "'NO'",
        "MAKE_EPHEM": "'YES'",
        "EPHEM_TYPE": "'OBSERVER'",
        "CENTER": "'coord@301'",
        "COORD_TYPE": "'GEODETIC'",
        # JPL expects: lon,lat,elevation(km) — lon is E-positive
        "SITE_COORD": f"'{lon},{lat},0'",
        "START_TIME": f"'{start}'",
        "STOP_TIME": f"'{stop}'",
        "STEP_SIZE": "'1 m'",
        "QUANTITIES": "'4'",  # Quantity 4 = Apparent Azimuth & Elevation (Azi_(a-app), Elev_(a-app))
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


def parse_az_el(result_text: str) -> tuple[float, float]:
    """
    Extract azimuth and elevation from the JPL Horizons result text.
    The $$SOE…$$EOE block in CSV OBSERVER mode (QUANTITIES='4') contains:
        Date__(UT)__HR:MN, , , , Azi_(a-app), Elev_(a-app), ...
    """
    soe = result_text.find("$$SOE")
    eoe = result_text.find("$$EOE")
    if soe == -1 or eoe == -1:
        raise HTTPException(
            status_code=422,
            detail=f"Could not find $$SOE/$$EOE markers in JPL response. Response snippet: {result_text[:400]}",
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

    try:
        az = float(parts[4])
        el = float(parts[5])
    except (IndexError, ValueError) as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to parse az/el from JPL data line: '{last_line}'. Error: {exc}",
        ) from exc

    return az, el
