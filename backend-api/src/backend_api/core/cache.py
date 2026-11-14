"""
In-memory cache structures for high-speed celestial ephemeris queries.
"""

from __future__ import annotations

from typing import Any
from backend_api.config import MAX_EPHEMERIS_CACHE_SIZE

# Thread-safe in-memory cache dictionary for ephemeris results
_EPHEMERIS_CACHE: dict[str, dict[str, Any]] = {}


def get_cached_ephemeris(cache_key: str) -> dict[str, Any] | None:
    """Retrieve ephemeris result by cache key if present."""
    return _EPHEMERIS_CACHE.get(cache_key)


def set_cached_ephemeris(cache_key: str, data: dict[str, Any]) -> None:
    """Store ephemeris result, evicting oldest if capacity reached."""
    if len(_EPHEMERIS_CACHE) >= MAX_EPHEMERIS_CACHE_SIZE:
        _EPHEMERIS_CACHE.clear()
    _EPHEMERIS_CACHE[cache_key] = data


def get_ephemeris_cache_size() -> int:
    """Return current count of cached ephemeris calculations."""
    return len(_EPHEMERIS_CACHE)


def clear_ephemeris_cache() -> None:
    """Clear all ephemeris cache entries."""
    _EPHEMERIS_CACHE.clear()
