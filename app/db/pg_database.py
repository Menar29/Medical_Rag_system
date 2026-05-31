"""
SQLAlchemy engine — supports both SQLite (dev) and PostgreSQL (prod).

DATABASE_URL examples:
  sqlite:///./app/db/cerviscan.sqlite          ← default (local dev)
  postgresql://user:pass@localhost:5432/cerviscan
  postgresql://user:pass@postgres:5432/cerviscan   ← via Docker
"""

import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from .models import Base

DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "sqlite:///./app/db/cerviscan.sqlite",
)

_is_sqlite = DATABASE_URL.startswith("sqlite")

_connect_args = {"check_same_thread": False} if _is_sqlite else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=_connect_args,
    pool_pre_ping=True,
)

# Enable WAL mode for SQLite to allow concurrent reads during writes
if _is_sqlite:
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA journal_mode=WAL")
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_pg_db() -> None:
    """Create all tables if they do not exist yet."""
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency: yields a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
