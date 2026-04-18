"""
System health aggregator — the single endpoint the admin_portal polls
to render its top-bar health badge.

Pings every downstream service concurrently (short 2 s timeout each) and
returns a structured report so the UI can show which service is broken,
how long it took to respond, and — when something is down — the reason.

Services checked:
    - customer_api                (middleware peer, :8002)
    - data_management_api         (middleware peer, :8003)
    - product_catalog_api         (middleware peer, :8004)
    - Airflow webserver           (:8080)
    - MLflow tracking server      (:5050)
    - Postgres (indirectly, via product_catalog_api's /ready)

All URLs are env-overridable so the same check works from localhost dev,
container-networked staging, or cloud deployments.
"""

from __future__ import annotations

import asyncio
import os
import time
from datetime import UTC, datetime

import httpx
from fastapi import APIRouter

from ..schemas import (
    OverallStatus,
    ServiceHealth,
    ServiceStatus,
    SystemHealthResponse,
)

router = APIRouter(prefix="/api/v1/system", tags=["system"])


# ── Service catalogue — edit here to add / remove checks ────────────────────

SERVICES: list[dict] = [
    {
        "name": "admin_api",
        "url": "http://localhost:8001/health",
        "critical": True,
    },
    {
        "name": "customer_api",
        "url": os.environ.get("CUSTOMER_API_HEALTH_URL", "http://localhost:8002/health"),
        "critical": True,
    },
    {
        "name": "data_management_api",
        "url": os.environ.get("DATA_MGMT_API_HEALTH_URL", "http://localhost:8003/health"),
        "critical": True,
    },
    {
        "name": "product_catalog_api",
        "url": os.environ.get("PRODUCT_CATALOG_API_HEALTH_URL", "http://localhost:8004/ready"),
        "critical": True,
    },
    {
        "name": "airflow",
        "url": os.environ.get("AIRFLOW_HEALTH_URL", "http://localhost:8080/health"),
        "critical": True,
    },
    {
        "name": "mlflow",
        "url": os.environ.get("MLFLOW_HEALTH_URL", "http://localhost:5050/health"),
        "critical": False,  # optional — experiment tracking, not on the hot path
    },
]

CHECK_TIMEOUT_SEC = float(os.environ.get("SYSTEM_HEALTH_TIMEOUT_SEC", "2.0"))


# ── Concurrent probe ────────────────────────────────────────────────────────


async def _probe(client: httpx.AsyncClient, svc: dict) -> ServiceHealth:
    started = time.perf_counter()
    try:
        resp = await client.get(svc["url"])
        latency_ms = int((time.perf_counter() - started) * 1000)
        if resp.status_code >= 500:
            return ServiceHealth(
                name=svc["name"],
                url=svc["url"],
                status=ServiceStatus.DOWN,
                latency_ms=latency_ms,
                error=f"HTTP {resp.status_code}",
                critical=svc["critical"],
            )
        if resp.status_code >= 400:
            return ServiceHealth(
                name=svc["name"],
                url=svc["url"],
                status=ServiceStatus.DEGRADED,
                latency_ms=latency_ms,
                error=f"HTTP {resp.status_code}",
                critical=svc["critical"],
            )
        return ServiceHealth(
            name=svc["name"],
            url=svc["url"],
            status=ServiceStatus.UP,
            latency_ms=latency_ms,
            critical=svc["critical"],
        )
    except (httpx.ConnectError, httpx.ConnectTimeout):
        return ServiceHealth(
            name=svc["name"],
            url=svc["url"],
            status=ServiceStatus.DOWN,
            error="Connection refused / timeout",
            critical=svc["critical"],
        )
    except httpx.TimeoutException:
        return ServiceHealth(
            name=svc["name"],
            url=svc["url"],
            status=ServiceStatus.DEGRADED,
            error="Slow response (>2 s)",
            critical=svc["critical"],
        )
    except httpx.HTTPError as exc:
        return ServiceHealth(
            name=svc["name"],
            url=svc["url"],
            status=ServiceStatus.DOWN,
            error=f"{type(exc).__name__}: {exc}",
            critical=svc["critical"],
        )


@router.get(
    "/health",
    response_model=SystemHealthResponse,
    summary="Aggregated health of every service in the local stack",
)
async def system_health() -> SystemHealthResponse:
    async with httpx.AsyncClient(timeout=CHECK_TIMEOUT_SEC) as client:
        results = await asyncio.gather(*(_probe(client, svc) for svc in SERVICES))

    summary = {"up": 0, "degraded": 0, "down": 0}
    overall = OverallStatus.HEALTHY
    for r in results:
        if r.status == ServiceStatus.UP:
            summary["up"] += 1
        elif r.status == ServiceStatus.DEGRADED:
            summary["degraded"] += 1
            if r.critical:
                overall = OverallStatus.DEGRADED
        else:
            summary["down"] += 1
            if r.critical:
                overall = OverallStatus.DEGRADED

    return SystemHealthResponse(
        overall=overall,
        checked_at=datetime.now(tz=UTC),
        services=list(results),
        summary=summary,
    )
