"""Initial schema: contractors, workers, certs, cert_entries, import_batches.

Revision ID: 001
Revises:
Create Date: 2026-05-13
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision: str = "001"
down_revision: str | None = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "import_batches",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("filename", sa.String, nullable=False),
        sa.Column("batch_type", sa.String, nullable=False, server_default="pdf_import"),
        sa.Column("imported_at", sa.DateTime, nullable=False),
        sa.Column("status", sa.String, nullable=False),
        sa.Column("warnings", sa.JSON, nullable=True),
        sa.Column("records_added", sa.Integer, nullable=False, server_default="0"),
        sa.Column("records_updated", sa.Integer, nullable=False, server_default="0"),
        sa.Column("records_skipped", sa.Integer, nullable=False, server_default="0"),
        sa.Column("acknowledged_at", sa.DateTime, nullable=True),
    )

    op.create_table(
        "contractors",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String, nullable=False, unique=True),
        sa.Column("primary_contact", sa.String, nullable=True),
        sa.Column("specialty", sa.String, nullable=True),
        sa.Column("notes", sa.String, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "certs",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String, nullable=False, unique=True),
        sa.Column("category", sa.String, nullable=False, server_default="Uncategorized"),
        sa.Column("validity_years", sa.Integer, nullable=False, server_default="1"),
        sa.Column("notes", sa.String, nullable=True),
    )

    op.create_table(
        "workers",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String, nullable=False),
        sa.Column(
            "contractor_id",
            sa.Integer,
            sa.ForeignKey("contractors.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("job_title", sa.String, nullable=True),
        sa.Column("status", sa.String, nullable=False, server_default="active"),
        sa.Column("employee_code", sa.String, nullable=True),
        sa.Column("hire_date", sa.Date, nullable=True),
        sa.Column("email", sa.String, nullable=True),
        sa.Column("phone", sa.String, nullable=True),
        sa.Column("notes", sa.String, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
        sa.UniqueConstraint("name", "contractor_id"),
    )

    op.create_table(
        "cert_entries",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "worker_id",
            sa.Integer,
            sa.ForeignKey("workers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "cert_id",
            sa.Integer,
            sa.ForeignKey("certs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("completed_on", sa.Date, nullable=False),
        sa.Column("source", sa.String, nullable=False, server_default="manual"),
        sa.Column(
            "import_batch_id",
            sa.Integer,
            sa.ForeignKey("import_batches.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
        sa.UniqueConstraint("worker_id", "cert_id"),
    )


def downgrade() -> None:
    op.drop_table("cert_entries")
    op.drop_table("workers")
    op.drop_table("certs")
    op.drop_table("contractors")
    op.drop_table("import_batches")
