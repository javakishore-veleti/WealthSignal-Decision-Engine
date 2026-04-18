"""
In-memory job tracker used to fake async DAG submission end-to-end.

The admin_portal's 'Initial Data Load Setup' button hits admin_api, which
records a job here and kicks off an Airflow DAG run (real integration
follow-up — for now the store advances the status lazily on each poll so
the portal flow can be exercised without a live Airflow).

When the real Airflow REST client lands, this module becomes a thin cache
in front of Airflow — the job record plus a pointer to the Airflow run ID.
"""

from __future__ import annotations

import random
from datetime import UTC, datetime
from threading import Lock
from uuid import UUID, uuid4

from .schemas import JobResponse, JobStatus

_jobs: dict[UUID, JobResponse] = {}
_lock = Lock()


def submit_job(dag_id: str, message: str | None = None) -> JobResponse:
    job_id = uuid4()
    job = JobResponse(
        job_id=job_id,
        dag_id=dag_id,
        status=JobStatus.QUEUED,
        submitted_at=datetime.now(tz=UTC),
        message=message,
    )
    with _lock:
        _jobs[job_id] = job
    return job


def get_job(job_id: UUID) -> JobResponse | None:
    """Fetch the current status, advancing the stub state machine by one step
    on each call so the portal sees progression without a real Airflow."""
    with _lock:
        job = _jobs.get(job_id)
        if job is None:
            return None

        now = datetime.now(tz=UTC)
        if job.status == JobStatus.QUEUED:
            job = job.model_copy(update={"status": JobStatus.RUNNING, "started_at": now})
        elif job.status == JobStatus.RUNNING:
            # Simulate a realistic UPSERT summary — matches the shape the
            # real load_product_catalog DAG emits from its summary task.
            counts = {
                "inserted": random.randint(0, 500),
                "updated": random.randint(9500, 10000),
                "total_records_processed": 10000,
            }
            job = job.model_copy(
                update={
                    "status": JobStatus.SUCCEEDED,
                    "finished_at": now,
                    "counts": counts,
                }
            )
        # SUCCEEDED / FAILED are terminal — leave as-is.
        _jobs[job.job_id] = job
        return job


def list_jobs() -> list[JobResponse]:
    with _lock:
        return list(_jobs.values())
