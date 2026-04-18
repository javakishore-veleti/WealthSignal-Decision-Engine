"""
MLflow bootstrap admin actions.

POST /api/v1/mlflow/bootstrap-experiments triggers the
`bootstrap_mlflow_experiments` Airflow DAG, which idempotently creates
the eight experiment slots the decision engine uses (four production +
four mastery-prefixed). Safe to call more than once — the DAG detects
existing experiments and refreshes their tags only.

Consistent with the architecture rule that every operational flow
(MLflow state, DVC pushes, data downloads, training) runs asynchronously
via Airflow — nothing happens inline in the middleware tier.
"""

from __future__ import annotations

from fastapi import APIRouter, status

from ..job_tracker import submit_job
from ..schemas import JobResponse

router = APIRouter(prefix="/api/v1/mlflow", tags=["mlflow"])


@router.post(
    "/bootstrap-experiments",
    response_model=JobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger the bootstrap_mlflow_experiments Airflow DAG",
)
def trigger_bootstrap_experiments() -> JobResponse:
    return submit_job(
        dag_id="bootstrap_mlflow_experiments",
        message=(
            "Ensures the four production (wealth-*) and four mastery "
            "(mastery/wealth-*) MLflow experiments exist. Idempotent."
        ),
    )
