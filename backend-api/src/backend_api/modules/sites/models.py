"""
Pydantic data models for landing site entities.
"""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel


class SiteCoordinates(BaseModel):
    lat: float
    lon: float
    elevation_m: int | float | None = None


class TerrainSummary(BaseModel):
    slope_touchdown_deg: float
    slope_status: str
    slope_color: str
    max_gradient_deg: float
    dist_to_psr_km: float
    psr_name: str


class SiteSummary(BaseModel):
    site_id: str
    name: str
    type: str
    coordinates: dict[str, Any]
    terrain: dict[str, Any]
    summary_metrics: dict[str, Any]
