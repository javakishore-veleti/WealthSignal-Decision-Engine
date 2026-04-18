from datetime import date, datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field

from .enums import (
    AssetClass,
    CustomerSegment,
    EsgRating,
    Geography,
    Liquidity,
    ProductType,
    TimeHorizon,
)

# ── Core product schema ──────────────────────────────────────────────────────


class ProductBase(BaseModel):
    """Fields shared across create / update / read."""

    model_config = ConfigDict(str_strip_whitespace=True, use_enum_values=True)

    sku: Annotated[str, Field(pattern=r"^WM-[A-Z]{2,4}-[A-Z0-9]{2,6}-\d{4,}$")]
    name: Annotated[str, Field(min_length=3, max_length=160)]
    short_description: Annotated[str, Field(min_length=10, max_length=280)]
    long_description: Annotated[str, Field(min_length=30, max_length=2000)]

    asset_class: AssetClass
    product_type: ProductType
    risk_level: Annotated[int, Field(ge=1, le=7, description="FCA SRRI 1 (low) – 7 (high)")]
    time_horizon: TimeHorizon
    liquidity: Liquidity

    geography: Geography
    target_segment: CustomerSegment
    esg_rating: EsgRating

    min_investment: Annotated[Decimal, Field(ge=Decimal("0"))]
    currency: Annotated[str, Field(min_length=3, max_length=3, description="ISO 4217")]
    fee_bps: Annotated[int, Field(ge=0, le=1000, description="Management fee in basis points")]
    aum: Annotated[Decimal, Field(ge=Decimal("0"), description="Assets under management")]

    issuer: Annotated[str, Field(min_length=2, max_length=80)]
    ticker: str | None = None
    isin: Annotated[str | None, Field(default=None, min_length=12, max_length=12)] = None
    launch_date: date
    is_active: bool = True
    tags: list[str] = Field(default_factory=list)


class ProductCreate(ProductBase):
    """Admin input for POST /api/v1/products."""


class ProductUpdate(BaseModel):
    """All fields optional — PATCH semantics for PUT."""

    model_config = ConfigDict(str_strip_whitespace=True, use_enum_values=True)

    name: str | None = None
    short_description: str | None = None
    long_description: str | None = None
    risk_level: int | None = None
    time_horizon: TimeHorizon | None = None
    liquidity: Liquidity | None = None
    esg_rating: EsgRating | None = None
    min_investment: Decimal | None = None
    fee_bps: int | None = None
    aum: Decimal | None = None
    is_active: bool | None = None
    tags: list[str] | None = None


class Product(ProductBase):
    """Read model — adds server-side identifiers and audit timestamps."""

    id: UUID = Field(default_factory=uuid4)
    created_at: datetime
    updated_at: datetime


# ── List / pagination envelope ───────────────────────────────────────────────


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int


class ProductListResponse(BaseModel):
    items: list[Product]
    pagination: PaginationMeta


# ── Search requests / responses ──────────────────────────────────────────────


class CriteriaSearchRequest(BaseModel):
    """Criteria-based search — all fields optional, combined with AND."""

    asset_class: AssetClass | None = None
    product_type: ProductType | None = None
    risk_level_min: Annotated[int | None, Field(default=None, ge=1, le=7)] = None
    risk_level_max: Annotated[int | None, Field(default=None, ge=1, le=7)] = None
    time_horizon: TimeHorizon | None = None
    geography: Geography | None = None
    target_segment: CustomerSegment | None = None
    esg_rating: EsgRating | None = None
    min_investment_max: Decimal | None = None
    issuer: str | None = None
    is_active: bool | None = True
    tags_any: list[str] | None = None


class NlpSearchRequest(BaseModel):
    query: Annotated[str, Field(min_length=2, max_length=500)]
    top_k: Annotated[int, Field(default=20, ge=1, le=100)] = 20
    asset_class: AssetClass | None = None
    target_segment: CustomerSegment | None = None


class NlpSearchHit(BaseModel):
    product: Product
    score: float = Field(description="Relevance score in [0, 100]")
    matched_terms: list[str]


class NlpSearchResponse(BaseModel):
    query: str
    hits: list[NlpSearchHit]
    total: int


# ── Categories endpoint ──────────────────────────────────────────────────────


class CategoryCount(BaseModel):
    value: str
    count: int


class CategoriesResponse(BaseModel):
    asset_class: list[CategoryCount]
    product_type: list[CategoryCount]
    risk_level: list[CategoryCount]
    geography: list[CategoryCount]
    target_segment: list[CategoryCount]
    esg_rating: list[CategoryCount]
    total_products: int
