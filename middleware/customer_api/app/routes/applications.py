"""
Application draft + submission endpoints.

Partial-form persistence is the heart of the product — every keystroke from
the customer_portal flows through POST /api/v1/applications/draft, which
in turn is what the Decision Engine scores when a customer abandons the
form. Submissions transition the draft to status=submitted and hand off
to downstream offer-generation (LangGraph / ADK).
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Path, status

from ..schemas import (
    ApplicationDraft,
    ApplicationDraftIn,
    ApplicationSubmitResponse,
)
from ..store import get_draft, submit_draft, upsert_draft

router = APIRouter(prefix="/api/v1/applications", tags=["applications"])


@router.post(
    "/draft",
    response_model=ApplicationDraft,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new application draft (every keystroke-save from the portal)",
)
def create_draft(payload: ApplicationDraftIn) -> ApplicationDraft:
    return upsert_draft(None, payload)


@router.put(
    "/draft/{draft_id}",
    response_model=ApplicationDraft,
    summary="Update an existing application draft",
)
def update_draft(
    draft_id: Annotated[UUID, Path()],
    payload: ApplicationDraftIn,
) -> ApplicationDraft:
    if get_draft(draft_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Draft not found")
    return upsert_draft(draft_id, payload)


@router.get(
    "/draft/{draft_id}",
    response_model=ApplicationDraft,
    summary="Retrieve a single application draft",
)
def fetch_draft(draft_id: Annotated[UUID, Path()]) -> ApplicationDraft:
    draft = get_draft(draft_id)
    if draft is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Draft not found")
    return draft


@router.post(
    "/{draft_id}/submit",
    response_model=ApplicationSubmitResponse,
    summary="Submit a completed application",
)
def submit_application(draft_id: Annotated[UUID, Path()]) -> ApplicationSubmitResponse:
    draft = submit_draft(draft_id)
    if draft is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Draft not found")
    return ApplicationSubmitResponse(
        application_id=draft.id,
        status=draft.status,
        submitted_at=datetime.now(tz=UTC),
    )
