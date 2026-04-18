"""Liveness + readiness endpoints for data_management_api."""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "data_management_api"}


@router.get("/ready")
def ready() -> dict:
    # Real readiness should ping Airflow's /api/v1/health once the REST
    # client is wired; for now always ready (in-memory stub).
    return {"status": "ready", "service": "data_management_api"}


@router.get("/version")
def version() -> dict:
    return {"service": "data_management_api", "version": "0.1.0"}
