"""SQLAlchemy ORM models for the Cordillera certification database."""
from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint, Date
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Contractor(Base):
    __tablename__ = "contractors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    primary_contact: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    specialty: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    workers: Mapped[list[Worker]] = relationship("Worker", back_populates="contractor_rel")


class Worker(Base):
    __tablename__ = "workers"
    __table_args__ = (UniqueConstraint("name", "contractor_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    contractor_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("contractors.id", ondelete="SET NULL"), nullable=True
    )
    job_title: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="active")
    employee_code: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    hire_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    contractor_rel: Mapped[Optional[Contractor]] = relationship(
        "Contractor", back_populates="workers"
    )
    cert_entries: Mapped[list[CertEntry]] = relationship(
        "CertEntry", back_populates="worker", cascade="all, delete-orphan"
    )


class Cert(Base):
    __tablename__ = "certs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    category: Mapped[str] = mapped_column(String, default="Uncategorized")
    validity_years: Mapped[int] = mapped_column(Integer, default=1)
    notes: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    entries: Mapped[list[CertEntry]] = relationship(
        "CertEntry", back_populates="cert", cascade="all, delete-orphan"
    )


class CertEntry(Base):
    __tablename__ = "cert_entries"
    __table_args__ = (UniqueConstraint("worker_id", "cert_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    worker_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("workers.id", ondelete="CASCADE"), nullable=False
    )
    cert_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("certs.id", ondelete="CASCADE"), nullable=False
    )
    completed_on: Mapped[date] = mapped_column(Date, nullable=False)
    source: Mapped[str] = mapped_column(String, default="manual")
    import_batch_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("import_batches.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    worker: Mapped[Worker] = relationship("Worker", back_populates="cert_entries")
    cert: Mapped[Cert] = relationship("Cert", back_populates="entries")
    import_batch: Mapped[Optional[ImportBatch]] = relationship("ImportBatch")


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    batch_type: Mapped[str] = mapped_column(String, default="pdf_import")
    imported_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    status: Mapped[str] = mapped_column(String, nullable=False)
    warnings: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    records_added: Mapped[int] = mapped_column(Integer, default=0)
    records_updated: Mapped[int] = mapped_column(Integer, default=0)
    records_skipped: Mapped[int] = mapped_column(Integer, default=0)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
