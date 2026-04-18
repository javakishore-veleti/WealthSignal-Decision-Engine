"""
Model-registry endpoints.

Thin façade over MLflow — for now returns deterministic stub data so the
admin_portal's Model Registry screens can be wired up. When MLflow is
actually running in the observability stack, this becomes a pass-through
using the `mlflow.tracking.MlflowClient`.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, status

from ..schemas import (
    ModelStage,
    ModelSummary,
    ModelVersion,
    PromoteRequest,
    PromotionResult,
)

router = APIRouter(prefix="/api/v1/models", tags=["models"])


def _stub_models() -> list[ModelSummary]:
    now = datetime.now(tz=UTC)
    return [
        ModelSummary(
            name="FormCompletionPredictor",
            tags={"owner": "decision-engine", "domain": "wealth"},
            latest_versions=[
                ModelVersion(
                    name="FormCompletionPredictor",
                    version="3",
                    stage=ModelStage.PRODUCTION,
                    run_id="e3f1a1b2c3d4",
                    created_at=now - timedelta(days=2),
                    description="SRRI-aware MLP with focal loss.",
                ),
                ModelVersion(
                    name="FormCompletionPredictor",
                    version="4",
                    stage=ModelStage.STAGING,
                    run_id="f4a2b3c4d5e6",
                    created_at=now - timedelta(hours=4),
                    description="Re-trained on Q2 partial-form dataset.",
                ),
            ],
        ),
        ModelSummary(
            name="WealthAutoencoder",
            tags={"owner": "decision-engine"},
            latest_versions=[
                ModelVersion(
                    name="WealthAutoencoder",
                    version="1",
                    stage=ModelStage.PRODUCTION,
                    run_id="aaaa1111bbbb",
                    created_at=now - timedelta(days=30),
                    description="Customer-segmentation autoencoder.",
                ),
            ],
        ),
        ModelSummary(
            name="CustomerR1Policy",
            tags={"owner": "decision-engine", "paper": "arXiv:2510.07230"},
            latest_versions=[
                ModelVersion(
                    name="CustomerR1Policy",
                    version="2",
                    stage=ModelStage.STAGING,
                    run_id="cccc2222dddd",
                    created_at=now - timedelta(days=1),
                    description="SFT+GRPO policy on Phi-3-mini with 4-bit QLoRA.",
                ),
            ],
        ),
    ]


@router.get("", response_model=list[ModelSummary], summary="List registered models")
def list_models() -> list[ModelSummary]:
    return _stub_models()


@router.get(
    "/{name}",
    response_model=ModelSummary,
    summary="Fetch a single registered model and its recent versions",
)
def get_model(name: Annotated[str, Path(min_length=1)]) -> ModelSummary:
    for model in _stub_models():
        if model.name == name:
            return model
    raise HTTPException(status.HTTP_404_NOT_FOUND, f"Model '{name}' not found")


@router.post(
    "/{name}/promote",
    response_model=PromotionResult,
    summary="Promote a model version to a new stage",
)
def promote_model(
    name: Annotated[str, Path(min_length=1)],
    payload: PromoteRequest,
) -> PromotionResult:
    for model in _stub_models():
        if model.name == name:
            match = next(
                (v for v in model.latest_versions if v.version == payload.version),
                None,
            )
            if match is None:
                raise HTTPException(
                    status.HTTP_404_NOT_FOUND,
                    f"Version '{payload.version}' not found for '{name}'",
                )
            # Stub — real implementation will call MLflow transition_model_version_stage.
            return PromotionResult(
                name=name,
                version=payload.version,
                previous_stage=match.stage,
                new_stage=payload.to_stage,
                actor="admin-portal-user",
                timestamp=datetime.now(tz=UTC),
            )
    raise HTTPException(status.HTTP_404_NOT_FOUND, f"Model '{name}' not found")
