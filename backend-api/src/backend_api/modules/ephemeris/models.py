"""
Pydantic data models for celestial ephemeris queries and responses.
"""

from __future__ import annotations

from pydantic import BaseModel


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
    source: str = "horizons"
