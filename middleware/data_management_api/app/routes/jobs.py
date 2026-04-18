"""
Generic job submission + polling.

Any internal caller (admin_api, scheduled workflows, etc.) that needs to
trigger an Airflow DAG goes through POST /api/v1/jobs. This API is the
single seam between the middleware tier and Airflow — by convention no
other service talks to Airflow directly.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Path, status

from ..airflow_client import get_dag_run, list_dag_runs, submit_dag
from ..schemas import JobResponse, JobSubmitRequest

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


@router.post(
    "",
    response_model=JobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit an Airflow DAG run",
)
def submit_job(payload: JobSubmitRequest) -> JobResponse:
    return submit_dag(dag_id=payload.dag_id, params=payload.params, note=payload.note)


@router.get("", response_model=list[JobResponse], summary="List recent DAG runs")
def list_jobs() -> list[JobResponse]:
    return list_dag_runs()


@router.get("/{job_id}", response_model=JobResponse, summary="Poll a single DAG run")
def poll_job(job_id: Annotated[UUID, Path()]) -> JobResponse:
    job = get_dag_run(job_id)
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    return job
