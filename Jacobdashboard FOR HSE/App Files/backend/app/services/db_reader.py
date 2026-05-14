"""Database reader for the Cordillera dashboard.

Queries SQLite via SQLAlchemy and returns the same ParsedWorkbook dataclass
that excel_reader.read_workbook() returned, so all API routes are unchanged.

The aggregation pipeline (counts, action list, heatmap, cert demand, KPIs)
is reused directly from excel_reader — only the data source changes.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy.orm import Session, selectinload

from .. import models
from ..database import DB_PATH
from .excel_reader import (
    ActionItem,
    Cert,
    CertDemand,
    CertStatus,
    Contractor,
    HeatmapPayload,
    HeatmapRow,
    KPIs,
    ParsedWorkbook,
    Worker,
    _aggregate_contractor_counts,
    _aggregate_worker_counts,
    _build_action_list,
    _build_cert_demand,
    _build_heatmap,
    _classify,
    _compute_kpis,
)


def _load_certs(db: Session) -> tuple[list[Cert], dict[int, Cert]]:
    db_certs = db.query(models.Cert).order_by(models.Cert.id).all()
    certs = [
        Cert(
            name=c.name,
            category=c.category,
            validity_years=c.validity_years,
            notes=c.notes,
        )
        for c in db_certs
    ]
    by_id: dict[int, Cert] = {c.id: dc for c, dc in zip(db_certs, certs)}
    return certs, by_id


def _load_workers(
    db: Session,
    certs_by_id: dict[int, Cert],
    contractor_name_by_id: dict[int, str],
    today: date,
) -> list[Worker]:
    db_workers = (
        db.query(models.Worker)
        .options(
            selectinload(models.Worker.cert_entries).selectinload(models.CertEntry.cert)
        )
        .order_by(models.Worker.id)
        .all()
    )
    workers: list[Worker] = []
    for dbw in db_workers:
        contractor_name = contractor_name_by_id.get(dbw.contractor_id, "") if dbw.contractor_id else ""
        wdc = Worker(
            name=dbw.name,
            contractor=contractor_name,
            job_title=dbw.job_title,
            status=dbw.status or "active",
            employee_code=dbw.employee_code,
            hire_date=dbw.hire_date,
            email=dbw.email,
            phone=dbw.phone,
            notes=dbw.notes,
        )
        for entry in dbw.cert_entries:
            cert_def = certs_by_id.get(entry.cert_id)
            if cert_def is None:
                continue
            status, anniv, days = _classify(entry.completed_on, today)
            wdc.certs.append(
                CertStatus(
                    cert_name=cert_def.name,
                    cert_category=cert_def.category,
                    completed_on=entry.completed_on,
                    anniversary=anniv,
                    days_until_anniversary=days,
                    status=status,
                )
            )
        _aggregate_worker_counts(wdc)
        workers.append(wdc)
    return workers


def get_dashboard(db: Session) -> ParsedWorkbook:
    today = date.today()

    certs, certs_by_id = _load_certs(db)

    db_contractors = db.query(models.Contractor).order_by(models.Contractor.id).all()
    contractor_name_by_id: dict[int, str] = {c.id: c.name for c in db_contractors}

    workers = _load_workers(db, certs_by_id, contractor_name_by_id, today)

    workers_by_contractor: dict[str, list[Worker]] = {}
    for w in workers:
        workers_by_contractor.setdefault(w.contractor.lower(), []).append(w)

    contractors: list[Contractor] = []
    for dbc in db_contractors:
        cdc = Contractor(
            name=dbc.name,
            primary_contact=dbc.primary_contact,
            specialty=dbc.specialty,
            notes=dbc.notes,
        )
        _aggregate_contractor_counts(cdc, workers_by_contractor.get(dbc.name.lower(), []))
        contractors.append(cdc)

    action_list = _build_action_list(workers)
    heatmap = _build_heatmap(workers, certs)
    cert_demand = _build_cert_demand(workers, certs)
    kpis = _compute_kpis(workers, contractors, certs, today)

    stat = DB_PATH.stat() if DB_PATH.exists() else None
    last_modified = datetime.fromtimestamp(stat.st_mtime) if stat else datetime.now()

    return ParsedWorkbook(
        workbook_path=str(DB_PATH),
        last_modified=last_modified,
        loaded_at=datetime.now(),
        today=today,
        certs=certs,
        contractors=contractors,
        workers=workers,
        action_list=action_list,
        heatmap=heatmap,
        cert_demand=cert_demand,
        kpis=kpis,
        issues=[],
    )


def get_health(db: Session) -> dict:
    cert_count = db.query(models.Cert).count()
    worker_count = db.query(models.Worker).count()
    contractor_count = db.query(models.Contractor).count()
    entry_count = db.query(models.CertEntry).count()
    migration_batch = (
        db.query(models.ImportBatch)
        .filter(models.ImportBatch.batch_type == "excel_migration")
        .first()
    )
    stat = DB_PATH.stat() if DB_PATH.exists() else None
    return {
        "db_path": str(DB_PATH),
        "exists": DB_PATH.exists(),
        "migrated": migration_batch is not None,
        "migrated_at": migration_batch.imported_at.isoformat() if migration_batch else None,
        "last_modified": datetime.fromtimestamp(stat.st_mtime).isoformat() if stat else None,
        "record_counts": {
            "contractors": contractor_count,
            "workers": worker_count,
            "certs": cert_count,
            "cert_entries": entry_count,
        },
        "today": date.today().isoformat(),
    }


def get_kpis(db: Session) -> KPIs:
    """Lightweight KPI query — used by the no-op refresh endpoint."""
    today = date.today()
    certs, certs_by_id = _load_certs(db)
    db_contractors = db.query(models.Contractor).all()
    contractor_name_by_id = {c.id: c.name for c in db_contractors}
    workers = _load_workers(db, certs_by_id, contractor_name_by_id, today)
    contractors = [
        Contractor(name=c.name, primary_contact=c.primary_contact)
        for c in db_contractors
    ]
    for cdc, dbc in zip(contractors, db_contractors):
        _aggregate_contractor_counts(
            cdc, [w for w in workers if w.contractor.lower() == dbc.name.lower()]
        )
    return _compute_kpis(workers, contractors, certs, today)
