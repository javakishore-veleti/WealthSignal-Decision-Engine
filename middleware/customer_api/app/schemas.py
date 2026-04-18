"""Pydantic schemas for the Customer API."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Annotated
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, EmailStr, Field

# ── Enums ────────────────────────────────────────────────────────────────────


class EmploymentStatus(StrEnum):
    EMPLOYED = "Employed"
    SELF_EMPLOYED = "Self-Employed"
    RETIRED = "Retired"
    STUDENT = "Student"
    UNEMPLOYED = "Unemployed"


class ApplicationStatus(StrEnum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    ABANDONED = "abandoned"
    OFFERED = "offered"


# ── Application drafts ───────────────────────────────────────────────────────


class ApplicantIdentity(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    full_name: Annotated[str, Field(min_length=2, max_length=120)] | None = None
    email: EmailStr | None = None
    date_of_birth: str | None = None  # ISO yyyy-mm-dd


class FinancialProfile(BaseModel):
    employment_status: EmploymentStatus | None = None
    annual_income: Decimal | None = None
    existing_wealth: Decimal | None = None
    risk_questionnaire_score: Annotated[int | None, Field(default=None, ge=0, le=100)] = None


class ApplicationDraftIn(BaseModel):
    """Partial form payload — every field is optional so the portal can
    persist on every keystroke."""

    product_sku: str | None = None
    identity: ApplicantIdentity | None = None
    financials: FinancialProfile | None = None
    product_specific: dict | None = None
    current_step: Annotated[int | None, Field(default=None, ge=1, le=10)] = None


class ApplicationDraft(ApplicationDraftIn):
    id: UUID = Field(default_factory=uuid4)
    status: ApplicationStatus = ApplicationStatus.DRAFT
    created_at: datetime
    updated_at: datetime


class ApplicationSubmitResponse(BaseModel):
    application_id: UUID
    status: ApplicationStatus
    submitted_at: datetime


# ── Customer self-view ───────────────────────────────────────────────────────


class CustomerSelf(BaseModel):
    customer_id: UUID
    email: EmailStr
    full_name: str
    segment: str | None = None


# ── Offer landing ────────────────────────────────────────────────────────────


class OfferLanding(BaseModel):
    token: str
    customer_id: UUID
    product_sku: str
    headline: str
    body: str
    call_to_action: str
    expires_at: datetime
