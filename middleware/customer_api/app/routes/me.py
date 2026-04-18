"""
/me endpoint — customer self-view. Stub until auth lands.

In production, the authenticated customer's JWT (or session cookie) will
be read from the request and the row looked up from the customer schema.
For now this returns a deterministic stub so portal developers can wire
up the UI without waiting on auth.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from ..schemas import CustomerSelf

router = APIRouter(prefix="/api/v1", tags=["customer"])


@router.get(
    "/me",
    response_model=CustomerSelf,
    summary="Authenticated customer self-view (stub)",
)
def get_me() -> CustomerSelf:
    return CustomerSelf(
        customer_id=UUID("00000000-0000-0000-0000-000000000001"),
        email="demo.customer@wealthsignal.local",
        full_name="Demo Customer",
        segment="Mid-Tier-Saver",
    )
