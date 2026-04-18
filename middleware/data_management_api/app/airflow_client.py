"""
Airflow REST client — stub implementation.

In production, this module submits DAG runs to the Airflow 2.9 REST API
(POST /api/v1/dags/{dag_id}/dagRuns) and polls their state. For now it
wraps an in-memory job store that advances status on each poll, so
dependent services and portals can exercise the end-to-end contract
without a live Airflow.

Swap-in path: set `AIRFLOW_API_BASE` + `AIRFLOW_USERNAME` / `AIRFLOW_PASSWORD`
env vars; `_USE_STUB` flips to False; all call sites stay unchanged.
"""

from __future__ import annotations

import os
from datetime import UTC, datetime
from threading import Lock
from uuid import UUID, uuid4

from .schemas import Artefact, JobResponse, JobStatus

_USE_STUB = not os.environ.get("AIRFLOW_API_BASE")

_jobs: dict[UUID, JobResponse] = {}
_lock = Lock()


def submit_dag(dag_id: str, params: dict, note: str | None = None) -> JobResponse:
    if not _USE_STUB:
        raise NotImplementedError(
            "Real Airflow REST integration not yet wired — set AIRFLOW_API_BASE empty for stub."
        )

    job = JobResponse(
        job_id=uuid4(),
        dag_id=dag_id,
        status=JobStatus.QUEUED,
        submitted_at=datetime.now(tz=UTC),
        params=params,
        message=note,
        airflow_run_id=f"manual__stub-{uuid4().hex[:12]}",
    )
    with _lock:
        _jobs[job.job_id] = job
    return job


def get_dag_run(job_id: UUID) -> JobResponse | None:
    """Return the latest status; lazily advance the stub state machine."""
    with _lock:
        job = _jobs.get(job_id)
        if job is None:
            return None

        now = datetime.now(tz=UTC)
        if job.status == JobStatus.QUEUED:
            job = job.model_copy(update={"status": JobStatus.RUNNING, "started_at": now})
        elif job.status == JobStatus.RUNNING:
            job = job.model_copy(update={"status": JobStatus.SUCCEEDED, "finished_at": now})
        _jobs[job.job_id] = job
        return job


def list_dag_runs() -> list[JobResponse]:
    with _lock:
        return list(_jobs.values())


def list_artefacts(job_id: UUID) -> list[Artefact] | None:
    """Stub artefact listing — real implementation reads from MLflow + GCS / S3."""
    job = _jobs.get(job_id)
    if job is None:
        return None
    if job.status != JobStatus.SUCCEEDED:
        return []
    # Shape the portal can render without needing real URLs yet.
    return [
        Artefact(
            name="run.log",
            kind="log",
            size_bytes=5_242_880,
            url=None,
            created_at=job.finished_at or datetime.now(tz=UTC),
        ),
        Artefact(
            name="metrics.json",
            kind="json",
            size_bytes=4_096,
            url=None,
            created_at=job.finished_at or datetime.now(tz=UTC),
        ),
    ]
