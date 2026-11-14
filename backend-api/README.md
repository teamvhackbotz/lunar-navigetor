# Lunar Navigator – High-Performance Ephemeris & Telemetry API

FastAPI modular monolith backend serving authentic **NASA LRO LOLA topography**, **360° obstacle horizon masks**, **JPL Horizons celestial ephemerides**, and **on-the-fly landing site safety evaluations**.

---

## 1. Modular Monolith Architecture

The backend is organized into distinct, decoupled domain modules within a single high-performance FastAPI service:

```text
backend-api/
  run.py                     <- Development Uvicorn launcher
  pyproject.toml             <- Python project definitions (managed by UV)
  README.md                  <- Architecture & API specification
  src/
    backend_api/
      __init__.py            <- Root package export (exposes app, create_app)
      main.py                <- FastAPI application factory & router registration
      config.py              <- Constants, astronomical epochs, file paths

      # Shared Infrastructure
      core/
        cache.py             <- Thread-safe LRU cache for ephemeris lookups

      # Domain Modules
      modules/
        sites/               <- Curated landing site catalog & topography repository
          models.py          <- Pydantic schemas (SiteSummary, TerrainSummary)
          repository.py      <- In-memory NASA LOLA catalog store
          router.py          <- /api/sites and /api/sites/{site_id} endpoints

        ephemeris/           <- Celestial mechanics & ephemeris solver
          models.py          <- Pydantic schemas (EphemerisResponse, AzEl)
          engine.py          <- < 5µs analytical subsolar & libration solver
          horizons.py        <- NASA JPL Horizons API client & parser
          service.py         <- Ephemeris caching & orchestration
          router.py          <- /api/ephemeris endpoint

        evaluation/          <- Dynamic coordinate evaluation engine
          service.py         <- 360-bin horizon mask & 720h mission simulation
          router.py          <- /api/evaluate endpoint

        health/              <- Liveness probe & system diagnostics
          router.py          <- /health endpoint
```

---

## 2. Quickstart

Run with [UV](https://github.com/astral-sh/uv):

```bash
cd backend-api
uv run python run.py
```

The server boots at `http://localhost:8000`. Interactive OpenAPI documentation is available at `http://localhost:8000/docs`.

---

## 3. API Endpoints

### `GET /health`
Liveness check and catalog cache status.
* **Response:**
  ```json
  {
    "status": "ok",
    "service": "Lunar Navigator Ephemeris & Telemetry API",
    "cached_curated_sites": 21,
    "ephemeris_cache_entries": 0
  }
  ```

### `GET /api/sites`
Returns summary telemetry and LOLA slopes for all 21 curated landing sites. Pass `?full=true` to retrieve the complete 720-hour series and 360-bin horizon masks for all sites in a single call.

### `GET /api/sites/{site_id}`
Returns the complete authentic scientific profile for a specific landing site (e.g. `shackleton`, `ridge`, `malapert`, `apollo_11`):
* Exact coordinates and LOLA elevation datum.
* Touchdown slope and maximum descent gradient.
* 360-bin horizon obstruction mask $H(\theta)$.
* 720-hour columnar ephemeris arrays (`sun_el`, `sun_az`, `earth_el`, `earth_az`, `sun_visible`, `earth_visible`).
* Diviner regolith thermal range ($T_{\min}, T_{\max}$).
* Summary metrics (daylight %, continuous solar stay, DTE link uptime).

### `GET /api/ephemeris?lat={lat}&lon={lon}&dt={ISO}&live_horizons={bool}`
Returns topocentric Apparent Azimuth & Elevation (`QUANTITIES='4'`) for Sun and Earth from given coordinates at specified UTC timestamp.

### `GET /api/evaluate?lat={lat}&lon={lon}`
Instantaneous scientific evaluation for an arbitrary user coordinate dropped on the 3D Moon or 2D Map.
