"""create product_catalog.products table

Revision ID: 001_create_products
Revises:
Create Date: 2026-04-18 12:50:00

First revision in the WealthSignal monorepo. Assumes the `product_catalog`
schema and the `pg_trgm` extension already exist (created by
DevOps/Local/postgres/init.sql locally, and by an admin bootstrap migration
in cloud environments).

Creates:
  - product_catalog.products (25 columns) with standard B-tree indexes on
    every filter column plus unique indexes on sku and isin.
  - GIN indexes for fast tag-array containment and fuzzy name search
    via pg_trgm.
  - Check constraints for risk_level, fee_bps, min_investment, aum.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ARRAY, UUID as PG_UUID

# revision identifiers, used by Alembic.
revision: str = "001_create_products"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SCHEMA = "product_catalog"
TABLE = "products"


def upgrade() -> None:
    op.create_table(
        TABLE,
        sa.Column("id", PG_UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("sku", sa.String(40), nullable=False, unique=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("short_description", sa.String(280), nullable=False),
        sa.Column("long_description", sa.Text(), nullable=False),
        sa.Column("asset_class", sa.String(32), nullable=False),
        sa.Column("product_type", sa.String(32), nullable=False),
        sa.Column("risk_level", sa.Integer(), nullable=False),
        sa.Column("time_horizon", sa.String(16), nullable=False),
        sa.Column("liquidity", sa.String(16), nullable=False),
        sa.Column("geography", sa.String(32), nullable=False),
        sa.Column("target_segment", sa.String(40), nullable=False),
        sa.Column("esg_rating", sa.String(16), nullable=False),
        sa.Column("min_investment", sa.Numeric(18, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("fee_bps", sa.Integer(), nullable=False),
        sa.Column("aum", sa.Numeric(22, 2), nullable=False),
        sa.Column("issuer", sa.String(80), nullable=False),
        sa.Column("ticker", sa.String(16), nullable=True),
        sa.Column("isin", sa.String(12), nullable=True, unique=True),
        sa.Column("launch_date", sa.Date(), nullable=False),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("tags", ARRAY(sa.String()), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "risk_level BETWEEN 1 AND 7", name="ck_products_risk_level_range"
        ),
        sa.CheckConstraint(
            "fee_bps BETWEEN 0 AND 1000", name="ck_products_fee_bps_range"
        ),
        sa.CheckConstraint("min_investment >= 0", name="ck_products_min_investment_nonneg"),
        sa.CheckConstraint("aum >= 0", name="ck_products_aum_nonneg"),
        schema=SCHEMA,
    )

    # ── Standard B-tree indexes for criteria search ───────────────────────────
    for column in (
        "sku",
        "name",
        "asset_class",
        "product_type",
        "risk_level",
        "geography",
        "target_segment",
        "esg_rating",
        "issuer",
        "is_active",
    ):
        op.create_index(
            f"ix_{TABLE}_{column}",
            TABLE,
            [column],
            schema=SCHEMA,
        )

    # ── GIN indexes for high-selectivity lookups ──────────────────────────────
    # Tag array containment queries: `WHERE tags @> ARRAY['esg']`
    op.execute(
        f"CREATE INDEX ix_{TABLE}_tags_gin "
        f"ON {SCHEMA}.{TABLE} USING GIN (tags)"
    )
    # Fuzzy name search via pg_trgm: supports `WHERE name ILIKE '%...%'` and
    # similarity() ranking for the NLP search endpoint.
    op.execute(
        f"CREATE INDEX ix_{TABLE}_name_trgm "
        f"ON {SCHEMA}.{TABLE} USING GIN (name gin_trgm_ops)"
    )
    op.execute(
        f"CREATE INDEX ix_{TABLE}_short_description_trgm "
        f"ON {SCHEMA}.{TABLE} USING GIN (short_description gin_trgm_ops)"
    )


def downgrade() -> None:
    # GIN indexes drop automatically with the table, but be explicit for
    # reviewability and to keep partial-downgrade paths clean.
    op.execute(f"DROP INDEX IF EXISTS {SCHEMA}.ix_{TABLE}_short_description_trgm")
    op.execute(f"DROP INDEX IF EXISTS {SCHEMA}.ix_{TABLE}_name_trgm")
    op.execute(f"DROP INDEX IF EXISTS {SCHEMA}.ix_{TABLE}_tags_gin")
    op.drop_table(TABLE, schema=SCHEMA)
