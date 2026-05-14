"""Alembic environment configuration.

Adds the backend directory to sys.path so app.models and app.database
can be imported without installing the package.
"""
import sys
from pathlib import Path

# alembic/env.py → alembic/ → backend/
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from alembic import context
from app.database import DB_PATH, engine
from app.models import Base

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=f"sqlite:///{DB_PATH}",
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
