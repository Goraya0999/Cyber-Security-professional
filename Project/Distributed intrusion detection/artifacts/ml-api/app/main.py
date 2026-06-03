"""
DIDS FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database import create_tables
from app.routers import auth, scan, logs, alerts, analytics, summary, health
from app.services.detection_service import DetectionService

# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="DIDS — Distributed Intrusion Detection System",
    description="AI-powered network intrusion detection with FastAPI + scikit-learn",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Startup / Shutdown
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def on_startup() -> None:
    """Create DB tables and load ML model on startup."""
    await create_tables()
    DetectionService.load_model()


# ---------------------------------------------------------------------------
# Routers — all mounted under /api to match frontend expectations
# ---------------------------------------------------------------------------

app.include_router(health.router,    prefix="/api")
app.include_router(auth.router,      prefix="/api/auth",      tags=["Auth"])
app.include_router(scan.router,      prefix="/api",           tags=["Scan"])
app.include_router(logs.router,      prefix="/api",           tags=["Logs"])
app.include_router(alerts.router,    prefix="/api",           tags=["Alerts"])
app.include_router(analytics.router, prefix="/api",           tags=["Analytics"])
app.include_router(summary.router,   prefix="/api",           tags=["Summary"])
