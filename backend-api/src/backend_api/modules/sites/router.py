"""
FastAPI route controller for lunar landing sites catalog.
"""

from __future__ import annotations

from typing import Annotated, Any
from fastapi import APIRouter, HTTPException, Query
from backend_api.modules.sites.repository import get_catalog, get_site_by_id

router = APIRouter(prefix="/api/sites", tags=["Sites"])


@router.get("")
def list_sites(
    full: Annotated[bool, Query(description="Include 720-hour series and 360-bin horizon masks if true")] = False,
) -> Any:
    """Return catalog of all curated lunar landing sites with summary scientific telemetry."""
    catalog = get_catalog()
    if full:
        return catalog

    return [
        {
            "site_id": s["site_id"],
            "name": s["name"],
            "type": s["type"],
            "coordinates": s["coordinates"],
            "terrain": {
                "slope_touchdown_deg": s["terrain"]["slope_touchdown_deg"],
                "slope_status": s["terrain"]["slope_status"],
                "slope_color": s["terrain"]["slope_color"],
                "max_gradient_deg": s["terrain"]["max_gradient_deg"],
                "dist_to_psr_km": s["terrain"]["dist_to_psr_km"],
                "psr_name": s["terrain"]["psr_name"],
            },
            "summary_metrics": s["summary_metrics"],
        }
        for s in catalog.values()
    ]


@router.get("/{site_id}")
def get_site_detail(site_id: str) -> dict[str, Any]:
    """Return complete authentic scientific profile, 360° horizon mask, and November 2026 series."""
    site = get_site_by_id(site_id)
    if not site:
        raise HTTPException(
            status_code=404,
            detail=f"Site ID '{site_id}' not found in curated catalog.",
        )
    return site
