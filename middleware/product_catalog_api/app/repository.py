"""
Data-access layer for the Product Catalog service.

Routes never compose SQL directly — they call methods on `ProductRepository`
so we can swap the storage backend later (e.g. read-through cache) without
touching HTTP code.

Search implementation:
  - Criteria search runs as a straightforward SQL filter with pagination.
  - NLP search uses Postgres pg_trgm similarity() over name + short/long
    description. pg_trgm handles typos, partial matches, and reordering
    without an embedding pipeline — middleware stays fast and free of
    heavy ML deps (which live in Airflow by monorepo convention).
"""

from __future__ import annotations

import re
from uuid import UUID

from sqlalchemy import delete, func, literal, select, update
from sqlalchemy.orm import Session

from .db.models import Product
from .schemas import (
    CriteriaSearchRequest,
    NlpSearchRequest,
)


class ProductRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    # ── Reads ────────────────────────────────────────────────────────────────

    def get_by_id(self, product_id: UUID) -> Product | None:
        return self._session.get(Product, product_id)

    def get_by_sku(self, sku: str) -> Product | None:
        stmt = select(Product).where(Product.sku == sku)
        return self._session.execute(stmt).scalar_one_or_none()

    def list_paginated(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "name",
        sort_dir: str = "asc",
        active_only: bool = True,
    ) -> tuple[list[Product], int]:
        stmt = select(Product)
        if active_only:
            stmt = stmt.where(Product.is_active.is_(True))

        # Safe-list sortable columns.
        sort_map = {
            "name": Product.name,
            "sku": Product.sku,
            "aum": Product.aum,
            "fee_bps": Product.fee_bps,
            "risk_level": Product.risk_level,
            "launch_date": Product.launch_date,
            "created_at": Product.created_at,
        }
        order_col = sort_map.get(sort_by, Product.name)
        stmt = stmt.order_by(order_col.desc() if sort_dir.lower() == "desc" else order_col.asc())

        # Total count — share the where clause.
        count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        total = int(self._session.execute(count_stmt).scalar_one())

        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        items = list(self._session.execute(stmt).scalars().all())
        return items, total

    # ── Criteria search ──────────────────────────────────────────────────────

    def search_criteria(
        self,
        req: CriteriaSearchRequest,
        *,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Product], int]:
        stmt = select(Product)

        if req.asset_class is not None:
            stmt = stmt.where(Product.asset_class == req.asset_class.value)
        if req.product_type is not None:
            stmt = stmt.where(Product.product_type == req.product_type.value)
        if req.risk_level_min is not None:
            stmt = stmt.where(Product.risk_level >= req.risk_level_min)
        if req.risk_level_max is not None:
            stmt = stmt.where(Product.risk_level <= req.risk_level_max)
        if req.time_horizon is not None:
            stmt = stmt.where(Product.time_horizon == req.time_horizon.value)
        if req.geography is not None:
            stmt = stmt.where(Product.geography == req.geography.value)
        if req.target_segment is not None:
            stmt = stmt.where(Product.target_segment == req.target_segment.value)
        if req.esg_rating is not None:
            stmt = stmt.where(Product.esg_rating == req.esg_rating.value)
        if req.min_investment_max is not None:
            stmt = stmt.where(Product.min_investment <= req.min_investment_max)
        if req.issuer is not None:
            stmt = stmt.where(Product.issuer.ilike(f"%{req.issuer}%"))
        if req.is_active is not None:
            stmt = stmt.where(Product.is_active.is_(req.is_active))
        if req.tags_any:
            # PG ARRAY overlap: tags && ARRAY[...]
            stmt = stmt.where(Product.tags.op("&&")(req.tags_any))

        stmt = stmt.order_by(Product.name.asc())

        count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        total = int(self._session.execute(count_stmt).scalar_one())

        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        items = list(self._session.execute(stmt).scalars().all())
        return items, total

    # ── NLP search (pg_trgm similarity) ──────────────────────────────────────

    def search_nlp(self, req: NlpSearchRequest) -> list[tuple[Product, float]]:
        """Return (product, score) tuples ranked by pg_trgm similarity."""
        q = req.query.strip()

        score_expr = func.greatest(
            func.similarity(Product.name, q),
            func.similarity(Product.short_description, q) * literal(0.7),
            func.similarity(Product.long_description, q) * literal(0.3),
        ).label("score")

        stmt = select(Product, score_expr).where(
            Product.name.op("%")(q)
            | Product.short_description.op("%")(q)
            | Product.long_description.op("%")(q)
        )

        if req.asset_class is not None:
            stmt = stmt.where(Product.asset_class == req.asset_class.value)
        if req.target_segment is not None:
            stmt = stmt.where(Product.target_segment == req.target_segment.value)

        stmt = stmt.where(Product.is_active.is_(True))
        stmt = stmt.order_by(score_expr.desc()).limit(req.top_k)

        return [(row.Product, float(row.score)) for row in self._session.execute(stmt)]

    @staticmethod
    def extract_matched_terms(query: str, product: Product) -> list[str]:
        """Surface which query tokens actually appear in the product text."""
        tokens = {t for t in re.split(r"\W+", query.lower()) if len(t) >= 3}
        haystack = " ".join(
            [
                product.name.lower(),
                product.short_description.lower(),
                product.long_description.lower(),
            ]
        )
        return sorted(t for t in tokens if t in haystack)

    # ── Writes ───────────────────────────────────────────────────────────────

    def create(self, product: Product) -> Product:
        self._session.add(product)
        self._session.commit()
        self._session.refresh(product)
        return product

    def update_partial(self, product_id: UUID, changes: dict) -> Product | None:
        if not changes:
            return self.get_by_id(product_id)
        stmt = update(Product).where(Product.id == product_id).values(**changes).returning(Product)
        row = self._session.execute(stmt).scalar_one_or_none()
        self._session.commit()
        return row

    def soft_delete(self, product_id: UUID) -> bool:
        """Deactivate a product rather than removing the row (audit trail)."""
        stmt = (
            update(Product)
            .where(Product.id == product_id)
            .values(is_active=False, updated_at=func.now())
        )
        result = self._session.execute(stmt)
        self._session.commit()
        return result.rowcount > 0

    def hard_delete(self, product_id: UUID) -> bool:
        """Destructive delete — reserved for admin clean-up; not exposed by default."""
        stmt = delete(Product).where(Product.id == product_id)
        result = self._session.execute(stmt)
        self._session.commit()
        return result.rowcount > 0

    # ── Aggregates for /categories ───────────────────────────────────────────

    def category_counts(self) -> dict[str, list[tuple[str, int]]]:
        """Return distribution counts for every categorical field."""
        fields = {
            "asset_class": Product.asset_class,
            "product_type": Product.product_type,
            "geography": Product.geography,
            "target_segment": Product.target_segment,
            "esg_rating": Product.esg_rating,
        }
        out: dict[str, list[tuple[str, int]]] = {}
        for key, col in fields.items():
            stmt = (
                select(col, func.count())
                .where(Product.is_active.is_(True))
                .group_by(col)
                .order_by(func.count().desc())
            )
            out[key] = [(str(value), int(count)) for value, count in self._session.execute(stmt)]

        # risk_level is numeric — report in level order, not frequency.
        risk_stmt = (
            select(Product.risk_level, func.count())
            .where(Product.is_active.is_(True))
            .group_by(Product.risk_level)
            .order_by(Product.risk_level.asc())
        )
        out["risk_level"] = [
            (str(level), int(count)) for level, count in self._session.execute(risk_stmt)
        ]

        total_stmt = select(func.count()).select_from(Product).where(Product.is_active.is_(True))
        out["_total"] = [("total", int(self._session.execute(total_stmt).scalar_one()))]
        return out
