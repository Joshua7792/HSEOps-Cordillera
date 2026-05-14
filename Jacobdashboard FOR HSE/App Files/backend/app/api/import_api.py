"""PDF import endpoints — upload Anejo 3 PDFs and track import history.

Endpoints:
  POST /api/import/pdf       — multipart upload, parse + write to SQLite, return ImportBatch
  GET  /api/import/history   — list ImportBatch records newest first
  GET  /api/import/{id}      — single batch with full warnings list

PDF parsing is delegated entirely to cert_tracker/scripts/import_pdf.py (unchanged).
This module adds only a write_to_db() adapter that replaces openpyxl writes with
SQLAlchemy inserts.
"""
from __future__ import annotations

import re
import sys
import tempfile
import unicodedata
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models

router = APIRouter(prefix="/api/import", tags=["import"])

# Resolve the scripts directory so we can import import_pdf without modifying sys.path globally
_SCRIPTS_DIR = Path(__file__).resolve().parents[4] / "cert_tracker" / "scripts"


def _get_import_pdf():
    """Lazy import of import_pdf to avoid loading pdfplumber at startup."""
    if str(_SCRIPTS_DIR) not in sys.path:
        sys.path.insert(0, str(_SCRIPTS_DIR))
    import import_pdf  # noqa: PLC0415
    return import_pdf


# ── Cert alias map from DB ───────────────────────────────────────────────────

def _build_db_alias_map(db: Session) -> dict[str, str]:
    """Build a {normalized_key: canonical_name} map from DB certs.

    Mirrors what import_pdf.build_cert_alias_map() does for the workbook,
    but uses the SQLite certs table as source of truth.
    """
    ip = _get_import_pdf()
    aliases: dict[str, str] = {}
    for cert in db.query(models.Cert).all():
        name = cert.name
        aliases[ip.normalize(name)] = name
        aliases[ip.normalize_compact(name)] = name
        compact = ip.normalize(re.sub(r"[()]", "", name))
        aliases[compact] = name
        aliases[ip.normalize_compact(compact)] = name
    # Merge the hardcoded PAGE2_HEADER_ALIASES from import_pdf so typo variants
    # (e.g. "OSHA 8 Hr Refresher") resolve correctly.
    for k, v in ip.PAGE2_HEADER_ALIASES.items():
        aliases.setdefault(ip.normalize(k), v)
    return aliases


# ── DB write adapter ─────────────────────────────────────────────────────────

def write_to_db(
    contractor_name: str,
    primary_contact: Optional[str],
    workers_data: dict[str, dict[str, date]],
    filename: str,
    db: Session,
) -> models.ImportBatch:
    """Write parsed PDF data to SQLite. Returns the ImportBatch record.

    On any exception: rolls back, sets batch.status='failed', still returns
    the batch (caller must handle db.rollback if the batch itself can't commit).
    """
    ip = _get_import_pdf()
    alias_map = _build_db_alias_map(db)

    batch = models.ImportBatch(
        filename=filename,
        batch_type="pdf_import",
        imported_at=datetime.now(timezone.utc),
        status="pending",
        records_added=0,
        records_updated=0,
        records_skipped=0,
        warnings=[],
    )
    db.add(batch)
    db.flush()  # get batch.id before writing entries

    try:
        # 1) Upsert contractor
        c_norm = ip.normalize_company(contractor_name)
        contractor = None
        for c in db.query(models.Contractor).all():
            if ip.normalize_company(c.name) == c_norm:
                contractor = c
                break
        if contractor is None:
            contractor = models.Contractor(
                name=contractor_name,
                primary_contact=primary_contact,
            )
            db.add(contractor)
            db.flush()
        elif primary_contact and not contractor.primary_contact:
            contractor.primary_contact = primary_contact

        # 2) Upsert workers + cert entries
        for worker_name, certs in workers_data.items():
            w_norm = ip.normalize(worker_name)

            # Find existing worker by normalized name (within this contractor first,
            # then globally for cases where contractor assignment is pending)
            worker = (
                db.query(models.Worker)
                .filter(models.Worker.contractor_id == contractor.id)
                .all()
            )
            matched_worker = next(
                (w for w in worker if ip.normalize(w.name) == w_norm), None
            )
            if matched_worker is None:
                # Try without contractor filter
                all_workers = db.query(models.Worker).all()
                matched_worker = next(
                    (w for w in all_workers if ip.normalize(w.name) == w_norm), None
                )
            if matched_worker is None:
                matched_worker = models.Worker(
                    name=worker_name,
                    contractor_id=contractor.id,
                    status="active",
                )
                db.add(matched_worker)
                db.flush()
                batch.records_added += 1

            # 3) Upsert cert entries
            for header_name, dt in certs.items():
                canonical = ip.match_cert(header_name, alias_map)
                if not canonical:
                    batch.warnings.append(f"Unmatched cert header: '{header_name}' for worker '{worker_name}'")
                    batch.records_skipped += 1
                    continue

                cert = db.query(models.Cert).filter_by(name=canonical).first()
                if cert is None:
                    # Auto-register new cert (same behavior as import_pdf.py)
                    cert = models.Cert(name=canonical, category="Additional Training", validity_years=0)
                    db.add(cert)
                    db.flush()

                entry = (
                    db.query(models.CertEntry)
                    .filter_by(worker_id=matched_worker.id, cert_id=cert.id)
                    .first()
                )
                if entry is None:
                    entry = models.CertEntry(
                        worker_id=matched_worker.id,
                        cert_id=cert.id,
                        completed_on=dt,
                        source="pdf_import",
                        import_batch_id=batch.id,
                    )
                    db.add(entry)
                    batch.records_added += 1
                else:
                    existing_date = entry.completed_on
                    if existing_date is None or dt > existing_date:
                        entry.completed_on = dt
                        entry.source = "pdf_import"
                        entry.import_batch_id = batch.id
                        batch.records_updated += 1
                    else:
                        batch.records_skipped += 1

        batch.status = "success"
        db.commit()

    except Exception as exc:
        db.rollback()
        # Re-add the batch in failed state so the caller gets a usable record
        batch = models.ImportBatch(
            filename=filename,
            batch_type="pdf_import",
            imported_at=datetime.now(timezone.utc),
            status="failed",
            warnings=[str(exc)],
            records_added=0,
            records_updated=0,
            records_skipped=0,
        )
        db.add(batch)
        db.commit()

    return batch


# ── Route helpers ────────────────────────────────────────────────────────────

def _batch_to_dict(batch: models.ImportBatch) -> dict:
    return {
        "id": batch.id,
        "filename": batch.filename,
        "batch_type": batch.batch_type,
        "imported_at": batch.imported_at.isoformat() if batch.imported_at else None,
        "status": batch.status,
        "records_added": batch.records_added,
        "records_updated": batch.records_updated,
        "records_skipped": batch.records_skipped,
        "warnings": batch.warnings or [],
        "acknowledged_at": batch.acknowledged_at.isoformat() if batch.acknowledged_at else None,
    }


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/pdf")
async def import_pdf_upload(file: UploadFile, db: Session = Depends(get_db)) -> dict:
    """Upload an Anejo 3 PDF, parse it, and write results to SQLite."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    ip = _get_import_pdf()

    # Write upload to a temp file so pdfplumber can read it by path
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = Path(tmp.name)

    try:
        contractor, primary_contact, workers_data = ip.extract_pdf_data(tmp_path)
    except Exception as exc:
        tmp_path.unlink(missing_ok=True)
        # Record failed batch and return it (not a 500 — corrupt PDF is a user error)
        batch = models.ImportBatch(
            filename=file.filename,
            batch_type="pdf_import",
            imported_at=datetime.now(timezone.utc),
            status="failed",
            warnings=[str(exc)],
            records_added=0,
            records_updated=0,
            records_skipped=0,
        )
        db.add(batch)
        db.commit()
        return _batch_to_dict(batch)
    finally:
        tmp_path.unlink(missing_ok=True)

    if not contractor:
        batch = models.ImportBatch(
            filename=file.filename,
            batch_type="pdf_import",
            imported_at=datetime.now(timezone.utc),
            status="failed",
            warnings=["Could not find contractor name in PDF"],
            records_added=0,
            records_updated=0,
            records_skipped=0,
        )
        db.add(batch)
        db.commit()
        return _batch_to_dict(batch)

    batch = write_to_db(contractor, primary_contact, workers_data, file.filename, db)
    return _batch_to_dict(batch)


@router.get("/history")
def import_history(db: Session = Depends(get_db)) -> list[dict]:
    """List all ImportBatch records, newest first."""
    batches = (
        db.query(models.ImportBatch)
        .order_by(models.ImportBatch.imported_at.desc())
        .all()
    )
    return [_batch_to_dict(b) for b in batches]


@router.get("/{batch_id}")
def import_batch_detail(batch_id: int, db: Session = Depends(get_db)) -> dict:
    """Single ImportBatch with full warnings list."""
    batch = db.get(models.ImportBatch, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Import batch not found")
    return _batch_to_dict(batch)
