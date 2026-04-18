"""
Artefact browsing for completed DAG runs.

The portal renders a 'Download artefacts' button on completed jobs. This
endpoint returns the list of files a DAG produced (model weights, metrics
JSON, Great Expectations report, etc.) plus the signed URLs to fetch them.
Real URLs come from MLflow + GCS/S3 once the storage layer is wired.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Path, status

from ..airflow_client import get_dag_run, list_artefacts
from ..schemas import ArtefactList

router = APIRouter(prefix="/api/v1/jobs", tags=["artefacts"])


@router.get(
    "/{job_id}/artefacts",
    response_model=ArtefactList,
    summary="List artefacts produced by a successful DAG run",
)
def get_artefacts(job_id: Annotated[UUID, Path()]) -> ArtefactList:
    job = get_dag_run(job_id)
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")

    items = list_artefacts(job_id) or []
    return ArtefactList(job_id=job_id, dag_id=job.dag_id, items=items)
