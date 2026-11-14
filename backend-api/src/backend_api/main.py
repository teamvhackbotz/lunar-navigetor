"""
Lunar Navigator – Modular Monolith Application Factory.
Assembles all domain modules (Sites, Ephemeris, Evaluation, Health) into a single unified FastAPI instance.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend_api.modules.ephemeris import router as ephemeris_router
from backend_api.modules.evaluation import router as evaluation_router
from backend_api.modules.health import router as health_router
from backend_api.modules.sites import router as sites_router


def create_app() -> FastAPI:
    """Application factory for Lunar Navigator API."""
    app = FastAPI(
        title="Lunar Navigator – Ephemeris & Telemetry API",
        description="Modular Monolith API serving authentic NASA LOLA topography, 360° horizon masks, and JPL Horizons ephemerides.",
        version="2.0.0",
    )

    # Global CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register Domain Module Routers
    app.include_router(health_router)
    app.include_router(sites_router)
    app.include_router(ephemeris_router)
    app.include_router(evaluation_router)

    return app


app = create_app()


def main() -> None:
    """CLI development server runner."""
    import uvicorn
    uvicorn.run("backend_api:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    main()
