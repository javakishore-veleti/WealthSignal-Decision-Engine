"""
SQLAlchemy ORM model for the wealth-management product catalogue.

One table: product_catalog.products. Indexes are chosen around the access
patterns the API exposes — single-field criteria filters, issuer look-ups,
tag-array containment, and fuzzy name search (GIN + pg_trgm).

The Pydantic request/response schemas in `..schemas` are independent of
these ORM models; conversion happens at the route layer.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import (
    ARRAY,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Integer,
    MetaData,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# Every table owned by this service lives inside the product_catalog schema
# (created by DevOps/Local/postgres/init.sql in local dev and provisioned by
# the deployment target's admin migration in cloud environments).
SCHEMA = "product_catalog"

metadata = MetaData(schema=SCHEMA)


class Base(DeclarativeBase):
    metadata = metadata


class Product(Base):
    """A wealth-management product available on the shelf."""

    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("risk_level BETWEEN 1 AND 7", name="ck_products_risk_level_range"),
        CheckConstraint("fee_bps BETWEEN 0 AND 1000", name="ck_products_fee_bps_range"),
        CheckConstraint("min_investment >= 0", name="ck_products_min_investment_nonneg"),
        CheckConstraint("aum >= 0", name="ck_products_aum_nonneg"),
        {"schema": SCHEMA},
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    sku: Mapped[str] = mapped_column(String(40), nullable=False, unique=True, index=True)

    name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    short_description: Mapped[str] = mapped_column(String(280), nullable=False)
    long_description: Mapped[str] = mapped_column(Text, nullable=False)

    # Classification — all stored as strings for portability; enum enforcement
    # is handled in the API layer via Pydantic.
    asset_class: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    product_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    risk_level: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    time_horizon: Mapped[str] = mapped_column(String(16), nullable=False)
    liquidity: Mapped[str] = mapped_column(String(16), nullable=False)

    geography: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    target_segment: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    esg_rating: Mapped[str] = mapped_column(String(16), nullable=False, index=True)

    # Commercials
    min_investment: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    fee_bps: Mapped[int] = mapped_column(Integer, nullable=False)
    aum: Mapped[Decimal] = mapped_column(Numeric(22, 2), nullable=False)

    # Issuer + market identifiers
    issuer: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    ticker: Mapped[str | None] = mapped_column(String(16), nullable=True)
    isin: Mapped[str | None] = mapped_column(String(12), nullable=True, unique=True)

    launch_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)

    tags: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    def __repr__(self) -> str:  # pragma: no cover — debugging aid
        return f"<Product {self.sku} {self.name!r}>"
