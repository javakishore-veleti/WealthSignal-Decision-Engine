"""
Product Catalog admin actions (and related bootstrap triggers).

Primary endpoint: POST /api/v1/product-catalog/initial-load
  Triggered from the admin_portal's 'Domain Services → Product Catalog →
  Initial Data Load Setup' action. Returns a job_id immediately; the portal
  polls GET /api/v1/jobs/{job_id} for progress. When the DAG finishes, the
  response surfaces the UPSERT summary (inserted / updated counts).

Today this is a stub — the job state machine lives in app/job_tracker.py
and advances lazily on each poll. When data_management_api grows a real
Airflow REST client, admin_api will delegate the trigger to it rather
than holding state locally.
"""

from __future__ import annotations

from fastapi import APIRouter, status

from ..job_tracker import submit_job
from ..schemas import InitialLoadRequest, JobResponse

router = APIRouter(prefix="/api/v1/product-catalog", tags=["product-catalog"])


@router.post(
    "/initial-load",
    response_model=JobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger the load_product_catalog Airflow DAG (idempotent UPSERT)",
)
def trigger_initial_load(payload: InitialLoadRequest) -> JobResponse:
    note_parts = ["Triggered by admin_portal Initial Data Load Setup."]
    if payload.seed_path:
        note_parts.append(f"seed_path override: {payload.seed_path}")
    if payload.dry_run:
        note_parts.append("dry_run=True")
    return submit_job(dag_id="load_product_catalog", message=" ".join(note_parts))
