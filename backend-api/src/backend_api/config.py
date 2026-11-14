"""
Configuration constants and paths for Lunar Navigator API.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Path & Service Settings
# ---------------------------------------------------------------------------

CATALOG_PATH: str = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
        "..",
        "static",
        "data",
        "lunar_sites_telemetry.json",
    )
)

# ---------------------------------------------------------------------------
# Astronomical Constants
# ---------------------------------------------------------------------------

SYNODIC_MONTH_HRS: float = 708.734
ANOMALISTIC_MONTH_HRS: float = 661.309
DRACONIC_MONTH_HRS: float = 653.093
NOV_START_EPOCH: float = datetime(2026, 11, 1, 0, 0, 0, tzinfo=timezone.utc).timestamp()

# ---------------------------------------------------------------------------
# External JPL Horizons API Settings
# ---------------------------------------------------------------------------

HORIZONS_URL: str = "https://ssd.jpl.nasa.gov/api/horizons.api"
HORIZONS_TIMEOUT: int = 15  # seconds

# ---------------------------------------------------------------------------
# Cache Limits
# ---------------------------------------------------------------------------

MAX_EPHEMERIS_CACHE_SIZE: int = 500
