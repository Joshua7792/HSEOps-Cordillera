"""One-time Excel → SQLite migration.

Called automatically on first startup when the .xlsx exists and no
excel_migration ImportBatch record is found in the database.

Uses excel_reader.read_workbook() directly so all parsing logic (date
formats, contractor/worker field mapping, cert categories) is reused
without duplication.
"""
from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from .. import models
from .excel_reader import read_workbook

log = logging.getLogger(__name__)


def is_migrated(db: Session) -> bool:
    return (
        db.query(models.ImportBatch)
        .filter(models.ImportBatch.batch_type == "excel_migration")
        .first()
    ) is not None


def run_migration(db: Session, xlsx_path: Path) -> models.ImportBatch:
    """Migrate the Excel workbook to SQLite. Idempotent: no-ops if already done."""
    if is_migrated(db):
        log.info("Migration already completed — skipping.")
        return (
            db.query(models.ImportBatch)
            .filter(models.ImportBatch.batch_type == "excel_migration")
            .first()
        )

    log.info("Starting Excel → SQLite migration from %s", xlsx_path)
    warnings: list[str] = []
    records_added = 0

    try:
        wb = read_workbook(xlsx_path)
        warnings.extend(wb.issues)

        # --- Contractors -------------------------------------------------------
        contractor_id_by_name: dict[str, int] = {}
        for c in wb.contractors:
            row = models.Contractor(
                name=c.name,
                primary_contact=c.primary_contact,
                specialty=c.specialty,
                notes=c.notes,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(row)
            db.flush()
            contractor_id_by_name[c.name.lower()] = row.id
            records_added += 1

        # --- Certs -------------------------------------------------------------
        cert_id_by_name: dict[str, int] = {}
        for c in wb.certs:
            row = models.Cert(
                name=c.name,
                category=c.category,
                validity_years=c.validity_years,
                notes=c.notes,
            )
            db.add(row)
            db.flush()
            cert_id_by_name[c.name.lower()] = row.id
            records_added += 1

        # --- Workers + CertEntries --------------------------------------------
        for w in wb.workers:
            contractor_id = contractor_id_by_name.get(w.contractor.lower())
            if contractor_id is None and w.contractor:
                warnings.append(
                    f"Worker '{w.name}': contractor '{w.contractor}' not found — stored without contractor link."
                )
            worker_row = models.Worker(
                name=w.name,
                contractor_id=contractor_id,
                job_title=w.job_title,
                status=w.status or "active",
                employee_code=w.employee_code,
                hire_date=w.hire_date,
                email=w.email,
                phone=w.phone,
                notes=w.notes,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(worker_row)
            db.flush()
            records_added += 1

            for cs in w.certs:
                if cs.completed_on is None:
                    continue
                cert_id = cert_id_by_name.get(cs.cert_name.lower())
                if cert_id is None:
                    warnings.append(
                        f"Worker '{w.name}': cert '{cs.cert_name}' not in catalog — skipped."
                    )
                    continue
                entry = models.CertEntry(
                    worker_id=worker_row.id,
                    cert_id=cert_id,
                    completed_on=cs.completed_on,
                    source="excel_migration",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db.add(entry)
                records_added += 1

        # --- Migration batch record -------------------------------------------
        batch = models.ImportBatch(
            filename=xlsx_path.name,
            batch_type="excel_migration",
            imported_at=datetime.utcnow(),
            status="success" if not warnings else "partial",
            warnings=warnings or None,
            records_added=records_added,
        )
        db.add(batch)
        db.commit()
        log.info("Migration complete: %d records added, %d warnings.", records_added, len(warnings))
        return batch

    except Exception as exc:
        db.rollback()
        log.exception("Migration failed: %s", exc)
        batch = models.ImportBatch(
            filename=xlsx_path.name,
            batch_type="excel_migration",
            imported_at=datetime.utcnow(),
            status="failed",
            warnings=[str(exc)],
            records_added=0,
        )
        db.add(batch)
        db.commit()
        return batch
