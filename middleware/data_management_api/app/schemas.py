"""Pydantic schemas for the Data Management API."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Annotated
from uuid import UUID

from pydantic import AnyHttpUrl, BaseModel, Field

# ── Job lifecycle ────────────────────────────────────────────────────────────


class JobStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


class JobSubmitRequest(BaseModel):
    """Generic DAG-submission request. `dag_id` must match a DAG registered
    in airflow/dags/. `params` is passed straight through as dag_run conf."""

    dag_id: Annotated[str, Field(min_length=1, max_length=200)]
    params: dict = Field(default_factory=dict)
    note: str | None = None


class JobResponse(BaseModel):
    job_id: UUID
    dag_id: str
    status: JobStatus
    submitted_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    params: dict = Field(default_factory=dict)
    message: str | None = None
    error: str | None = None
    airflow_run_id: str | None = None


# ── Artefacts ────────────────────────────────────────────────────────────────


class Artefact(BaseModel):
    name: str
    kind: str  # e.g. 'parquet', 'json', 'model', 'log'
    size_bytes: int
    url: AnyHttpUrl | None = None
    created_at: datetime


class ArtefactList(BaseModel):
    job_id: UUID
    dag_id: str
    items: list[Artefact]


# ── Convenience payloads ─────────────────────────────────────────────────────


class KaggleIngestRequest(BaseModel):
    """Shortcut for the Kaggle-ingestion DAG — avoids raw dag_id strings
    on the portal."""

    dataset_slug: Annotated[str, Field(min_length=3, max_length=200)]
    competition: bool = False
    file_patterns: list[str] | None = None


class PyTorchTrainRequest(BaseModel):
    """Shortcut for a PyTorch training DAG run."""

    model_name: Annotated[str, Field(min_length=1, max_length=120)]
    dataset_version: Annotated[str, Field(min_length=1, max_length=80)]
    hyperparameters: dict = Field(default_factory=dict)
    mlflow_experiment: Annotated[str | None, Field(default=None, max_length=200)] = None
