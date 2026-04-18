"""
Convenience endpoints — sugar on top of POST /api/v1/jobs.

Typing raw `{"dag_id": "...", "params": {...}}` works but forces the
portal developer to remember each DAG's exact param schema. These
shortcuts wrap the most common patterns (Kaggle ingestion, PyTorch
training) in strongly-typed endpoints that build the dag_id + params
server-side.
"""

from __future__ import annotations

from fastapi import APIRouter, status

from ..airflow_client import submit_dag
from ..schemas import JobResponse, KaggleIngestRequest, PyTorchTrainRequest

router = APIRouter(prefix="/api/v1", tags=["shortcuts"])


@router.post(
    "/ingest/kaggle",
    response_model=JobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger the Kaggle-ingestion DAG for a dataset",
)
def submit_kaggle_ingest(payload: KaggleIngestRequest) -> JobResponse:
    return submit_dag(
        dag_id="ingest_kaggle_dataset",
        params={
            "dataset_slug": payload.dataset_slug,
            "competition": payload.competition,
            "file_patterns": payload.file_patterns,
        },
        note=f"Kaggle ingest — {payload.dataset_slug}",
    )


@router.post(
    "/train/pytorch",
    response_model=JobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger a PyTorch training DAG",
)
def submit_pytorch_train(payload: PyTorchTrainRequest) -> JobResponse:
    return submit_dag(
        dag_id="train_pytorch_model",
        params={
            "model_name": payload.model_name,
            "dataset_version": payload.dataset_version,
            "hyperparameters": payload.hyperparameters,
            "mlflow_experiment": payload.mlflow_experiment,
        },
        note=f"PyTorch train — {payload.model_name}@{payload.dataset_version}",
    )
