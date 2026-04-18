"""
In-memory application-draft store.

Deliberately a stub so the API works end-to-end from day one. When the
customer schema lands (follow-up Alembic revision), swap this for a
SQLAlchemy-backed implementation. The store is module-level so multiple
routes see the same state within a single uvicorn process.
"""

from __future__ import annotations

from datetime import UTC, datetime
from threading import Lock
from uuid import UUID, uuid4

from .schemas import ApplicationDraft, ApplicationDraftIn, ApplicationStatus

_drafts: dict[UUID, ApplicationDraft] = {}
_lock = Lock()


def upsert_draft(
    draft_id: UUID | None,
    payload: ApplicationDraftIn,
) -> ApplicationDraft:
    """Create a new draft or overwrite fields on an existing one."""
    now = datetime.now(tz=UTC)
    with _lock:
        if draft_id is None or draft_id not in _drafts:
            new_id = draft_id or uuid4()
            draft = ApplicationDraft(
                id=new_id,
                created_at=now,
                updated_at=now,
                **payload.model_dump(exclude_none=True),
            )
            _drafts[new_id] = draft
            return draft

        existing = _drafts[draft_id]
        merged = existing.model_dump()
        merged.update(payload.model_dump(exclude_none=True))
        merged["updated_at"] = now
        draft = ApplicationDraft(**merged)
        _drafts[draft_id] = draft
        return draft


def get_draft(draft_id: UUID) -> ApplicationDraft | None:
    return _drafts.get(draft_id)


def submit_draft(draft_id: UUID) -> ApplicationDraft | None:
    with _lock:
        existing = _drafts.get(draft_id)
        if existing is None:
            return None
        merged = existing.model_dump()
        merged["status"] = ApplicationStatus.SUBMITTED
        merged["updated_at"] = datetime.now(tz=UTC)
        draft = ApplicationDraft(**merged)
        _drafts[draft_id] = draft
        return draft


def all_drafts() -> list[ApplicationDraft]:
    return list(_drafts.values())
