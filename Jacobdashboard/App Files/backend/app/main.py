"""FastAPI application entry point.

On startup:
  1. Runs Alembic migrations (creates cordillera.db if missing, applies schema).
  2. If the Excel workbook is present and no excel_migration batch exists,
     runs the one-time migration automatically.

Mounts the API routers and serves the built React frontend (when present).
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .api import excel, crud, import_api

log = logging.getLogger(__name__)

if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
    FRONTEND_DIST = Path(sys._MEIPASS) / "frontend" / "dist"
else:
    FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"

# main.py: App Files/backend/app/main.py → parents[3] = jacobdashboard
_CERT_TRACKER_DIR = Path(__file__).resolve().parents[3] / "cert_tracker"
_PRIMARY_WORKBOOK = _CERT_TRACKER_DIR / "Contractor Certifications Tracker.xlsx"
_BACKEND_DIR = Path(__file__).resolve().parents[1]  # App Files/backend/


def _run_alembic() -> None:
    try:
        from alembic.config import Config
        from alembic import command as alembic_command

        cfg = Config(str(_BACKEND_DIR / "alembic.ini"))
        cfg.set_main_option("script_location", str(_BACKEND_DIR / "alembic"))
        alembic_command.upgrade(cfg, "head")
        log.info("Alembic: schema up to date.")
    except Exception as exc:
        log.warning("Alembic upgrade failed (non-fatal): %s", exc)


def _run_migration_if_needed() -> None:
    try:
        from .database import SessionLocal
        from .services import migration

        db = SessionLocal()
        try:
            if not migration.is_migrated(db) and _PRIMARY_WORKBOOK.exists():
                log.info("First run: migrating %s → SQLite …", _PRIMARY_WORKBOOK.name)
                migration.run_migration(db, _PRIMARY_WORKBOOK)
        finally:
            db.close()
    except Exception as exc:
        log.warning("Auto-migration failed (non-fatal): %s", exc)


app = FastAPI(title="Cordillera Workforce Dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(excel.router)
app.include_router(crud.router)
app.include_router(import_api.router)


@app.on_event("startup")
async def startup() -> None:
    _run_alembic()
    _run_migration_if_needed()


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api")
def api_root() -> dict:
    return {"message": "Cordillera Workforce Dashboard API"}


# Migration status / manual trigger endpoints
@app.get("/api/migrate/status")
def migrate_status() -> dict:
    from .database import SessionLocal
    from .services import migration

    db = SessionLocal()
    try:
        migrated = migration.is_migrated(db)
        from . import models
        return {
            "migrated": migrated,
            "record_counts": {
                "contractors": db.query(models.Contractor).count(),
                "workers": db.query(models.Worker).count(),
                "certs": db.query(models.Cert).count(),
                "cert_entries": db.query(models.CertEntry).count(),
            },
        }
    finally:
        db.close()


@app.post("/api/migrate/from-excel")
def migrate_from_excel() -> dict:
    from .database import SessionLocal
    from .services import migration

    if not _PRIMARY_WORKBOOK.exists():
        return {"ok": False, "error": "Workbook not found", "path": str(_PRIMARY_WORKBOOK)}
    db = SessionLocal()
    try:
        batch = migration.run_migration(db, _PRIMARY_WORKBOOK)
        return {
            "ok": True,
            "batch_id": batch.id,
            "status": batch.status,
            "records_added": batch.records_added,
            "warnings": batch.warnings or [],
        }
    finally:
        db.close()


if FRONTEND_DIST.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_DIST / "assets"),
        name="frontend-assets",
    )

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        requested_file = FRONTEND_DIST / full_path
        if full_path and requested_file.exists() and requested_file.is_file():
            return FileResponse(requested_file)
        return FileResponse(FRONTEND_DIST / "index.html")

else:

    @app.get("/{full_path:path}")
    def dev_hint(full_path: str):
        return JSONResponse(
            {
                "message": "Frontend build not found yet.",
                "next_steps": [
                    "Run the React frontend with 'npm run dev' inside frontend.",
                    "Or build it with 'npm run build' inside frontend.",
                ],
            }
        )
