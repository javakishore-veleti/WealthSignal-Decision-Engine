"""Liveness + readiness endpoints for admin_api."""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "admin_api"}


@router.get("/ready")
def ready() -> dict:
    return {"status": "ready", "service": "admin_api"}


@router.get("/version")
def version() -> dict:
    return {"service": "admin_api", "version": "0.1.0"}
