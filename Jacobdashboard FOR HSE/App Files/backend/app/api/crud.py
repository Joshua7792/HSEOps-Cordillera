"""CRUD endpoints — create, update, and delete contractors, workers, certs, and cert entries.

Endpoints:
  POST   /api/contractors
  PUT    /api/contractors/{id}
  DELETE /api/contractors/{id}   (409 if contractor has active workers)
  PUT    /api/workers/{id}
  DELETE /api/workers/{id}
  POST   /api/certs
  PUT    /api/certs/{id}
  DELETE /api/certs/{id}
  PUT    /api/cert-entries/{id}
  DELETE /api/cert-entries/{id}
"""
from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models

router = APIRouter(prefix="/api", tags=["crud"])


# ── Request schemas ──────────────────────────────────────────────────────────

class ContractorCreate(BaseModel):
    name: str
    primary_contact: Optional[str] = None
    specialty: Optional[str] = None
    notes: Optional[str] = None


class ContractorUpdate(BaseModel):
    name: Optional[str] = None
    primary_contact: Optional[str] = None
    specialty: Optional[str] = None
    notes: Optional[str] = None


class WorkerUpdate(BaseModel):
    name: Optional[str] = None
    contractor_id: Optional[int] = None
    job_title: Optional[str] = None
    status: Optional[str] = None
    employee_code: Optional[str] = None
    hire_date: Optional[date] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None


class CertCreate(BaseModel):
    name: str
    category: Optional[str] = None
    validity_years: Optional[int] = 1
    notes: Optional[str] = None


class CertUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    validity_years: Optional[int] = None
    notes: Optional[str] = None


class CertEntryUpdate(BaseModel):
    completed_on: Optional[date] = None
    source: Optional[str] = None


# ── Helpers ──────────────────────────────────────────────────────────────────

def _apply_updates(obj, updates: dict) -> None:
    for field, value in updates.items():
        if value is not None:
            setattr(obj, field, value)


# ── Contractor endpoints ─────────────────────────────────────────────────────

@router.post("/contractors", status_code=201)
def create_contractor(body: ContractorCreate, db: Session = Depends(get_db)) -> dict:
    existing = db.query(models.Contractor).filter_by(name=body.name).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Contractor '{body.name}' already exists")
    contractor = models.Contractor(**body.model_dump())
    db.add(contractor)
    db.commit()
    db.refresh(contractor)
    return {"id": contractor.id, "name": contractor.name}


@router.put("/contractors/{contractor_id}")
def update_contractor(
    contractor_id: int,
    body: ContractorUpdate,
    db: Session = Depends(get_db),
) -> dict:
    contractor = db.get(models.Contractor, contractor_id)
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")
    updates = body.model_dump(exclude_none=True)
    if "name" in updates:
        conflict = (
            db.query(models.Contractor)
            .filter(models.Contractor.name == updates["name"], models.Contractor.id != contractor_id)
            .first()
        )
        if conflict:
            raise HTTPException(status_code=409, detail=f"Contractor name '{updates['name']}' is already taken")
    _apply_updates(contractor, updates)
    db.commit()
    db.refresh(contractor)
    return {"id": contractor.id, "name": contractor.name}


@router.delete("/contractors/{contractor_id}", status_code=204)
def delete_contractor(contractor_id: int, db: Session = Depends(get_db)) -> None:
    contractor = db.get(models.Contractor, contractor_id)
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")
    active_workers = (
        db.query(models.Worker)
        .filter(models.Worker.contractor_id == contractor_id)
        .count()
    )
    if active_workers:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete contractor with {active_workers} active worker(s). Reassign workers first.",
        )
    db.delete(contractor)
    db.commit()


# ── Worker endpoints ─────────────────────────────────────────────────────────

@router.put("/workers/{worker_id}")
def update_worker(
    worker_id: int,
    body: WorkerUpdate,
    db: Session = Depends(get_db),
) -> dict:
    worker = db.get(models.Worker, worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    _apply_updates(worker, body.model_dump(exclude_none=True))
    db.commit()
    db.refresh(worker)
    return {"id": worker.id, "name": worker.name}


@router.delete("/workers/{worker_id}", status_code=204)
def delete_worker(worker_id: int, db: Session = Depends(get_db)) -> None:
    worker = db.get(models.Worker, worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    db.delete(worker)
    db.commit()


# ── Cert endpoints ───────────────────────────────────────────────────────────

@router.post("/certs", status_code=201)
def create_cert(body: CertCreate, db: Session = Depends(get_db)) -> dict:
    existing = db.query(models.Cert).filter_by(name=body.name).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Cert '{body.name}' already exists")
    cert = models.Cert(**body.model_dump())
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return {"id": cert.id, "name": cert.name}


@router.put("/certs/{cert_id}")
def update_cert(
    cert_id: int,
    body: CertUpdate,
    db: Session = Depends(get_db),
) -> dict:
    cert = db.get(models.Cert, cert_id)
    if not cert:
        raise HTTPException(status_code=404, detail="Cert not found")
    updates = body.model_dump(exclude_none=True)
    if "name" in updates:
        conflict = (
            db.query(models.Cert)
            .filter(models.Cert.name == updates["name"], models.Cert.id != cert_id)
            .first()
        )
        if conflict:
            raise HTTPException(status_code=409, detail=f"Cert name '{updates['name']}' is already taken")
    _apply_updates(cert, updates)
    db.commit()
    db.refresh(cert)
    return {"id": cert.id, "name": cert.name}


@router.delete("/certs/{cert_id}", status_code=204)
def delete_cert(cert_id: int, db: Session = Depends(get_db)) -> None:
    cert = db.get(models.Cert, cert_id)
    if not cert:
        raise HTTPException(status_code=404, detail="Cert not found")
    db.delete(cert)
    db.commit()


# ── CertEntry endpoints ──────────────────────────────────────────────────────

@router.put("/cert-entries/{entry_id}")
def update_cert_entry(
    entry_id: int,
    body: CertEntryUpdate,
    db: Session = Depends(get_db),
) -> dict:
    entry = db.get(models.CertEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Cert entry not found")
    _apply_updates(entry, body.model_dump(exclude_none=True))
    db.commit()
    db.refresh(entry)
    return {
        "id": entry.id,
        "worker_id": entry.worker_id,
        "cert_id": entry.cert_id,
        "completed_on": entry.completed_on.isoformat() if entry.completed_on else None,
    }


@router.delete("/cert-entries/{entry_id}", status_code=204)
def delete_cert_entry(entry_id: int, db: Session = Depends(get_db)) -> None:
    entry = db.get(models.CertEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Cert entry not found")
    db.delete(entry)
    db.commit()
