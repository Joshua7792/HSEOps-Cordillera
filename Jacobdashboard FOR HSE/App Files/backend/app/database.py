"""SQLAlchemy engine, session factory, and FastAPI dependency for the SQLite database."""
from __future__ import annotations

from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# database.py is at: App Files/backend/app/database.py
# parents[0]=app  parents[1]=backend  parents[2]=App Files  parents[3]=jacobdashboard
DB_PATH = Path(__file__).resolve().parents[3] / "cert_tracker" / "cordillera.db"

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency: yields a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
