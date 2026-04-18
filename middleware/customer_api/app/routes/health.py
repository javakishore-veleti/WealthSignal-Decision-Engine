"""Liveness + readiness + version endpoints for customer_api."""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "customer_api"}


@router.get("/ready")
def ready() -> dict:
    # customer_api is stateless today — once the customer schema lands,
    # this should ping Postgres via a cheap SELECT 1.
    return {"status": "ready", "service": "customer_api"}


@router.get("/version")
def version() -> dict:
    return {"service": "customer_api", "version": "0.1.0"}
