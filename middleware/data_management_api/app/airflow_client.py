"""
Airflow REST client.

Real implementation using httpx against the Airflow 2.x stable REST API:
    POST /api/v1/dags/{dag_id}/dagRuns         — trigger
    GET  /api/v1/dags/{dag_id}/dagRuns/{run}   — poll

Fallback: if Airflow is unreachable (connection error, auth failure,
404 on the DAG), we keep an in-memory stub record so dependent services
and portals still see a plausible job state machine. This keeps local
dev usable when Airflow is still booting, without changing call-site
behaviour.

Configuration (env vars, sensible localhost defaults):
    AIRFLOW_API_BASE      default http://localhost:8080/api/v1
    AIRFLOW_USERNAME      default admin
    AIRFLOW_PASSWORD      default admin
    AIRFLOW_TIMEOUT_SEC   default 8
"""

from __future__ import annotations

import logging
import os
from datetime import UTC, datetime
from threading import Lock
from uuid import UUID, uuid4

import httpx

from .schemas import Artefact, JobResponse, JobStatus

log = logging.getLogger("data_management_api.airflow")

# ── Configuration ────────────────────────────────────────────────────────────

AIRFLOW_API_BASE = os.environ.get("AIRFLOW_API_BASE", "http://localhost:8080/api/v1")
AIRFLOW_USERNAME = os.environ.get("AIRFLOW_USERNAME", "admin")
AIRFLOW_PASSWORD = os.environ.get("AIRFLOW_PASSWORD", "admin")
AIRFLOW_TIMEOUT = float(os.environ.get("AIRFLOW_TIMEOUT_SEC", "8"))


# ── State mapping ────────────────────────────────────────────────────────────

_AIRFLOW_TO_JOB_STATE: dict[str, JobStatus] = {
    "queued": JobStatus.QUEUED,
    "scheduled": JobStatus.QUEUED,
    "none": JobStatus.QUEUED,
    "running": JobStatus.RUNNING,
    "up_for_retry": JobStatus.RUNNING,
    "up_for_reschedule": JobStatus.RUNNING,
    "deferred": JobStatus.RUNNING,
    "success": JobStatus.SUCCEEDED,
    "skipped": JobStatus.SUCCEEDED,
    "failed": JobStatus.FAILED,
    "upstream_failed": JobStatus.FAILED,
    "removed": JobStatus.FAILED,
}


# ── In-memory store — caches both real + stub jobs ──────────────────────────
# Keyed on our uuid4 job_id so callers have a single stable handle whether the
# job lives in Airflow or only as a local stub.

_jobs: dict[UUID, JobResponse] = {}
_lock = Lock()


# ── HTTP helpers ─────────────────────────────────────────────────────────────


def _client() -> httpx.Client:
    """Factory — short-lived client per call (keeps connection handling simple)."""
    return httpx.Client(
        base_url=AIRFLOW_API_BASE,
        auth=(AIRFLOW_USERNAME, AIRFLOW_PASSWORD),
        timeout=AIRFLOW_TIMEOUT,
        headers={"Content-Type": "application/json"},
    )


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        # Airflow returns ISO-8601 with either `Z` or `+00:00`.
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


# ── Submit ───────────────────────────────────────────────────────────────────


def submit_dag(dag_id: str, params: dict, note: str | None = None) -> JobResponse:
    """POST a DAG run to Airflow; fall back to an in-memory stub on failure."""
    job_id = uuid4()
    now = datetime.now(tz=UTC)

    try:
        with _client() as client:
            resp = client.post(
                f"/dags/{dag_id}/dagRuns",
                json={"conf": params or {}, "note": note or ""},
            )
        if resp.status_code >= 400:
            raise RuntimeError(f"Airflow responded {resp.status_code}: {resp.text[:200]}")
        data = resp.json()

        job = JobResponse(
            job_id=job_id,
            dag_id=dag_id,
            status=_AIRFLOW_TO_JOB_STATE.get(
                str(data.get("state", "queued")).lower(), JobStatus.QUEUED
            ),
            submitted_at=now,
            started_at=_parse_dt(data.get("start_date")),
            finished_at=_parse_dt(data.get("end_date")),
            params=params or {},
            message=note,
            airflow_run_id=data.get("dag_run_id"),
        )
        log.info("Triggered DAG %s → airflow_run_id=%s", dag_id, job.airflow_run_id)

    except (httpx.HTTPError, RuntimeError) as exc:
        log.warning(
            "Airflow REST unreachable (%s: %s); falling back to in-memory stub",
            type(exc).__name__,
            exc,
        )
        job = JobResponse(
            job_id=job_id,
            dag_id=dag_id,
            status=JobStatus.QUEUED,
            submitted_at=now,
            params=params or {},
            message=f"{note or ''} [stub: Airflow unreachable]".strip(),
            airflow_run_id=None,
            error=f"{type(exc).__name__}: {exc}",
        )

    with _lock:
        _jobs[job_id] = job
    return job


# ── Poll ─────────────────────────────────────────────────────────────────────


def get_dag_run(job_id: UUID) -> JobResponse | None:
    """Return the latest status for a job — poll Airflow if we have a real run,
    otherwise advance the stub state machine by one step."""
    with _lock:
        cached = _jobs.get(job_id)
    if cached is None:
        return None

    updated = _poll_airflow(cached) if cached.airflow_run_id else _advance_stub(cached)

    with _lock:
        _jobs[job_id] = updated
    return updated


def _poll_airflow(cached: JobResponse) -> JobResponse:
    try:
        with _client() as client:
            resp = client.get(f"/dags/{cached.dag_id}/dagRuns/{cached.airflow_run_id}")
        if resp.status_code >= 400:
            log.warning(
                "Airflow poll returned %s for %s; keeping cached state",
                resp.status_code,
                cached.airflow_run_id,
            )
            return cached

        data = resp.json()
        return cached.model_copy(
            update={
                "status": _AIRFLOW_TO_JOB_STATE.get(
                    str(data.get("state", "queued")).lower(), cached.status
                ),
                "started_at": _parse_dt(data.get("start_date")) or cached.started_at,
                "finished_at": _parse_dt(data.get("end_date")) or cached.finished_at,
            }
        )
    except httpx.HTTPError as exc:
        log.warning("Airflow poll failed (%s); keeping cached state", exc)
        return cached


def _advance_stub(cached: JobResponse) -> JobResponse:
    """Deterministic progression for stub-only jobs (no airflow_run_id)."""
    now = datetime.now(tz=UTC)
    if cached.status == JobStatus.QUEUED:
        return cached.model_copy(update={"status": JobStatus.RUNNING, "started_at": now})
    if cached.status == JobStatus.RUNNING:
        return cached.model_copy(update={"status": JobStatus.SUCCEEDED, "finished_at": now})
    return cached


# ── Listing + artefacts ─────────────────────────────────────────────────────


def list_dag_runs() -> list[JobResponse]:
    with _lock:
        return list(_jobs.values())


def list_artefacts(job_id: UUID) -> list[Artefact] | None:
    """Stub artefact listing — real implementation will fetch MLflow run
    artefacts + XCom outputs from the final task of the DAG."""
    with _lock:
        job = _jobs.get(job_id)
    if job is None:
        return None
    if job.status != JobStatus.SUCCEEDED:
        return []
    now = datetime.now(tz=UTC)
    return [
        Artefact(
            name="run.log",
            kind="log",
            size_bytes=5_242_880,
            url=None,
            created_at=job.finished_at or now,
        ),
        Artefact(
            name="metrics.json",
            kind="json",
            size_bytes=4_096,
            url=None,
            created_at=job.finished_at or now,
        ),
    ]
