"""
FastAPI route controller for system diagnostics and cache health.
"""

from __future__ import annotations

from typing import Any
from fastapi import APIRouter
from backend_api.core.cache import get_ephemeris_cache_size
from backend_api.modules.sites.repository import get_site_count

router = APIRouter(tags=["Health"])


@router.get("/health")
def health() -> dict[str, Any]:
    """Liveness check and cache status."""
    return {
        "status": "ok",
        "service": "Lunar Navigator Ephemeris & Telemetry API",
        "cached_curated_sites": get_site_count(),
        "ephemeris_cache_entries": get_ephemeris_cache_size(),
    }
