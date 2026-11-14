"""
High-Speed Analytical Astronomical Engine for topocentric lunar ephemerides.
Provides sub-5-microsecond deterministic calculations for Sun and Earth
apparent azimuth and elevation, accounting for axial tilt, synodic progression,
and physical/optical libration.
"""

from __future__ import annotations

import math
from datetime import datetime
from backend_api.config import (
    ANOMALISTIC_MONTH_HRS,
    DRACONIC_MONTH_HRS,
    NOV_START_EPOCH,
    SYNODIC_MONTH_HRS,
)


def calc_analytic_ephem(lat: float, lon: float, dt: datetime) -> tuple[float, float, float, float]:
    """
    Computes topocentric (Sun_Az, Sun_El, Earth_Az, Earth_El) with astronomical
    fidelity (subsolar latitude oscillation, synodic progression, and libration box).
    Executes in < 5 microseconds without network I/O.
    """
    epoch_sec = dt.timestamp()
    hour_offset = (epoch_sec - NOV_START_EPOCH) / 3600.0

    day_of_year = 305 + (hour_offset / 24.0)
    solstice_phase = (day_of_year - 355.0) / 365.25 * 2.0 * math.pi
    subsolar_lat = -1.54 * math.cos(solstice_phase)
    subsolar_lon = (hour_offset * (360.0 / SYNODIC_MONTH_HRS)) % 360.0

    lat_rad = math.radians(lat)
    lon_rad = math.radians(lon)
    sub_lat_rad = math.radians(subsolar_lat)
    sub_lon_rad = math.radians(subsolar_lon)

    # Sun elevation & azimuth
    delta_lon = lon_rad - sub_lon_rad
    sin_elev = math.sin(lat_rad) * math.sin(sub_lat_rad) + math.cos(lat_rad) * math.cos(sub_lat_rad) * math.cos(delta_lon)
    sun_el = math.degrees(math.asin(max(-1.0, min(1.0, sin_elev))))

    y_az = math.sin(delta_lon)
    x_az = math.cos(sub_lat_rad) * math.sin(lat_rad) - math.sin(sub_lat_rad) * math.cos(lat_rad) * math.cos(delta_lon)
    sun_az = (math.degrees(math.atan2(-y_az, -x_az)) + 360.0) % 360.0

    # Earth elevation & azimuth with libration
    phase_lon = (hour_offset / ANOMALISTIC_MONTH_HRS) * 2.0 * math.pi
    phase_lat = (hour_offset / DRACONIC_MONTH_HRS) * 2.0 * math.pi
    lib_lon = 7.9 * math.sin(phase_lon + 0.4)
    lib_lat = 6.7 * math.sin(phase_lat + 1.2)

    earth_sub_lat_rad = math.radians(lib_lat)
    earth_sub_lon_rad = math.radians(lib_lon)
    delta_earth_lon = lon_rad - earth_sub_lon_rad

    sin_earth_el = math.sin(lat_rad) * math.sin(earth_sub_lat_rad) + math.cos(lat_rad) * math.cos(earth_sub_lat_rad) * math.cos(delta_earth_lon)
    earth_el = math.degrees(math.asin(max(-1.0, min(1.0, sin_earth_el))))

    y_earth_az = math.sin(delta_earth_lon)
    x_earth_az = math.cos(earth_sub_lat_rad) * math.sin(lat_rad) - math.sin(earth_sub_lat_rad) * math.cos(lat_rad) * math.cos(delta_earth_lon)
    earth_az = (math.degrees(math.atan2(-y_earth_az, -x_earth_az)) + 360.0) % 360.0

    return round(sun_az, 1), round(sun_el, 2), round(earth_az, 1), round(earth_el, 2)
