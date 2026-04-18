"""Pydantic schemas for the Admin API."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field

# ── Model Registry ───────────────────────────────────────────────────────────


class ModelStage(StrEnum):
    NONE = "None"
    STAGING = "Staging"
    PRODUCTION = "Production"
    ARCHIVED = "Archived"


class ModelVersion(BaseModel):
    name: str
    version: str
    stage: ModelStage
    run_id: str | None = None
    created_at: datetime
    description: str | None = None


class ModelSummary(BaseModel):
    name: str
    latest_versions: list[ModelVersion]
    tags: dict[str, str] = Field(default_factory=dict)


class PromoteRequest(BaseModel):
    version: Annotated[str, Field(min_length=1, max_length=32)]
    to_stage: ModelStage
    archive_existing: bool = True
    reason: Annotated[str, Field(min_length=5, max_length=400)]


class PromotionResult(BaseModel):
    name: str
    version: str
    previous_stage: ModelStage
    new_stage: ModelStage
    actor: str
    timestamp: datetime


# ── Product Catalog admin actions ────────────────────────────────────────────


class InitialLoadRequest(BaseModel):
    seed_path: str | None = None  # override; default = data/product_catalog/products_seed.json
    dry_run: bool = False


class JobStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


class JobResponse(BaseModel):
    job_id: UUID
    dag_id: str
    status: JobStatus
    submitted_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    counts: dict[str, int] | None = None
    message: str | None = None


# ── Audit trail ──────────────────────────────────────────────────────────────


class AuditEvent(BaseModel):
    id: UUID
    actor: str
    action: str
    subject: str
    details: dict = Field(default_factory=dict)
    timestamp: datetime
