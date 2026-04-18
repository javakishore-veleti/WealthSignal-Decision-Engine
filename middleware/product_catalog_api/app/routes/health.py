"""Liveness + readiness endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..db.session import get_session

router = APIRouter(tags=["health"])


@router.get("/health", summary="Liveness probe")
def health() -> dict:
    return {"status": "ok", "service": "product_catalog_api"}


@router.get("/ready", summary="Readiness probe (DB reachable)")
def ready(session: Session = Depends(get_session)) -> dict:
    try:
        session.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001 — surface any DB error to the probe
        return {
            "status": "not_ready",
            "service": "product_catalog_api",
            "db_error": type(exc).__name__,
        }
    return {"status": "ready", "service": "product_catalog_api"}


@router.get("/version", summary="Build metadata")
def version() -> dict:
    return {"service": "product_catalog_api", "version": "0.1.0"}
