"""
Repository for curated lunar landing sites scientific catalog.
"""

from __future__ import annotations

import json
import os
from typing import Any
from backend_api.config import CATALOG_PATH

_CATALOG: dict[str, Any] = {}


def load_catalog() -> dict[str, Any]:
    """Load the precomputed NASA LOLA dataset into memory."""
    global _CATALOG
    if os.path.exists(CATALOG_PATH):
        try:
            with open(CATALOG_PATH, "r", encoding="utf-8") as f:
                _CATALOG = json.load(f)
            print(f"[Sites Module] Loaded {len(_CATALOG)} curated lunar site profiles from {CATALOG_PATH}")
        except Exception as e:
            print(f"[Sites Module] Warning: Failed to load catalog from {CATALOG_PATH}: {e}")
            _CATALOG = {}
    else:
        print(f"[Sites Module] Warning: Catalog file not found at {CATALOG_PATH}")
        _CATALOG = {}
    return _CATALOG


def get_catalog() -> dict[str, Any]:
    """Return the memory-cached catalog, loading if needed."""
    if not _CATALOG:
        load_catalog()
    return _CATALOG


def get_site_by_id(site_id: str) -> dict[str, Any] | None:
    """Find a specific site profile by unique key."""
    cat = get_catalog()
    return cat.get(site_id)


def get_site_count() -> int:
    """Return total number of cached curated landing sites."""
    return len(get_catalog())


# Pre-load catalog at import time for zero cold-start latency
load_catalog()
