"""
SQLAlchemy engine + session management for the Product Catalog service.

The connection URL comes from `WEALTHSIGNAL_DB_URL` — the same env variable
the Alembic migration workflow uses — so the API, migrations, and Airflow
DAGs all talk to the same database without hardcoding a URL anywhere.
"""

from __future__ import annotations

import os
from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

DEFAULT_LOCAL_URL = (
    "postgresql+psycopg://wealthsignal:wealthsignal@localhost:5432/wealthsignal"
)


def _resolve_url() -> str:
    return os.environ.get("WEALTHSIGNAL_DB_URL", DEFAULT_LOCAL_URL)


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    """Cached SQLAlchemy engine — one per process."""
    return create_engine(
        _resolve_url(),
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=10,
        future=True,
    )


@lru_cache(maxsize=1)
def session_factory() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), expire_on_commit=False, autoflush=False)


def get_session() -> Iterator[Session]:
    """FastAPI dependency yielding a short-lived, auto-closed session."""
    factory = session_factory()
    session = factory()
    try:
        yield session
    finally:
        session.close()
