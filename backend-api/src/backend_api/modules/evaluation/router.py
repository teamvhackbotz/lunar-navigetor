"""
FastAPI route controller for on-the-fly coordinate evaluation.
"""

from __future__ import annotations

from typing import Annotated, Any
from fastapi import APIRouter, Query
from backend_api.modules.evaluation.service import evaluate_coordinates

router = APIRouter(prefix="/api/evaluate", tags=["Evaluation"])


@router.get("")
def evaluate_custom_coordinates(
    lat: Annotated[float, Query(description="Latitude in degrees", ge=-90, le=90)],
    lon: Annotated[float, Query(description="Longitude in degrees", ge=-360, le=360)],
) -> dict[str, Any]:
    """
    On-the-fly scientific evaluation for arbitrary coordinates clicked on the 3D Moon or 2D Map.
    Generates authentic 360-bin horizon mask, 720-hour November 2026 series, and summary metrics.
    """
    return evaluate_coordinates(lat=lat, lon=lon)
