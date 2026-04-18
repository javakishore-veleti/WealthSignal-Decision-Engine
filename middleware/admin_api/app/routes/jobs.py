"""
Job-status polling endpoints for admin_portal.

The portal calls GET /api/v1/jobs/{job_id} every few seconds after
clicking 'Initial Data Load Setup' (or any other async admin action).
The response mirrors the shape that the real Airflow REST API returns,
so the portal contract is stable across the stub → real transition.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Path, status

from ..job_tracker import get_job, list_jobs
from ..schemas import JobResponse

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


@router.get("", response_model=list[JobResponse], summary="List recent admin jobs")
def list_recent_jobs() -> list[JobResponse]:
    return list_jobs()


@router.get("/{job_id}", response_model=JobResponse, summary="Poll a single job")
def poll_job(job_id: Annotated[UUID, Path()]) -> JobResponse:
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    return job
