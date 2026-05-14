"""FastAPI routes for the dashboard — now backed by SQLite via SQLAlchemy.

All routes keep the same URLs and JSON response shapes as the original
Excel-based implementation so the frontend requires no changes.

Endpoints:
  GET  /api/excel/health              DB path + record counts + migration status
  GET  /api/excel/dashboard           full landing-page payload
  GET  /api/excel/contractors         contractor rollups
  GET  /api/excel/workers             all workers with their cert statuses
  GET  /api/excel/workers/{name}      single worker (URL-encoded name)
  GET  /api/excel/certifications      cert catalog
  POST /api/excel/refresh             no-op (data always fresh); returns current KPIs
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from ..database import get_db
from ..services import db_reader
from ..services.excel_reader import _normalize

router = APIRouter(prefix="/api/excel", tags=["excel"])


@router.get("/health")
def health(db: Session = Depends(get_db)) -> dict:
    return db_reader.get_health(db)


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)) -> dict:
    wb = db_reader.get_dashboard(db)
    return {
        "kpis": jsonable_encoder(wb.kpis),
        "action_list": jsonable_encoder(wb.action_list),
        "workers": jsonable_encoder(wb.workers),
        "contractors": jsonable_encoder(wb.contractors),
        "heatmap": jsonable_encoder(wb.heatmap),
        "cert_demand": jsonable_encoder(wb.cert_demand),
        "today": wb.today.isoformat(),
        "issues": wb.issues,
        "workbook": {
            "path": wb.workbook_path,
            "last_modified": wb.last_modified.isoformat(),
            "loaded_at": wb.loaded_at.isoformat(),
        },
    }


@router.get("/contractors")
def contractors(db: Session = Depends(get_db)) -> list[dict]:
    wb = db_reader.get_dashboard(db)
    return jsonable_encoder(wb.contractors)


@router.get("/workers")
def workers(db: Session = Depends(get_db)) -> list[dict]:
    wb = db_reader.get_dashboard(db)
    return jsonable_encoder(wb.workers)


@router.get("/workers/{worker_name}")
def worker(worker_name: str, db: Session = Depends(get_db)) -> dict:
    wb = db_reader.get_dashboard(db)
    target = _normalize(worker_name)
    for w in wb.workers:
        if _normalize(w.name) == target:
            return jsonable_encoder(w)
    raise HTTPException(status_code=404, detail=f"Worker not found: {worker_name}")


@router.get("/certifications")
def certifications(db: Session = Depends(get_db)) -> list[dict]:
    wb = db_reader.get_dashboard(db)
    return jsonable_encoder(wb.certs)


@router.post("/refresh")
def refresh(db: Session = Depends(get_db)) -> dict:
    """No-op refresh — data is always live from SQLite. Returns current KPIs."""
    kpis = db_reader.get_kpis(db)
    return {
        "ok": True,
        "loaded_at": kpis.today.isoformat() if kpis.today else None,
        "last_modified": kpis.today.isoformat() if kpis.today else None,
        "kpis": jsonable_encoder(kpis),
        "sync_actions": {},
    }
