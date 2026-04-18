"""Criteria-based and NLP (pg_trgm) product search."""

from __future__ import annotations

from math import ceil
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..db.session import get_session
from ..repository import ProductRepository
from ..schemas import (
    CriteriaSearchRequest,
    NlpSearchHit,
    NlpSearchRequest,
    NlpSearchResponse,
    PaginationMeta,
    Product,
    ProductListResponse,
)

router = APIRouter(prefix="/api/v1/products/search", tags=["search"])


def _repo(session: Session = Depends(get_session)) -> ProductRepository:
    return ProductRepository(session)


@router.post(
    "/criteria",
    response_model=ProductListResponse,
    summary="Criteria-based search (admin + customer portals)",
)
def search_by_criteria(
    req: CriteriaSearchRequest,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=200)] = 20,
    repo: ProductRepository = Depends(_repo),
) -> ProductListResponse:
    items, total = repo.search_criteria(req, page=page, page_size=page_size)
    return ProductListResponse(
        items=[Product.model_validate(r, from_attributes=True) for r in items],
        pagination=PaginationMeta(
            page=page,
            page_size=page_size,
            total_items=total,
            total_pages=max(1, ceil(total / page_size)),
        ),
    )


@router.post(
    "/nlp",
    response_model=NlpSearchResponse,
    summary="Natural-language search (customer portal)",
)
def search_nlp(
    req: NlpSearchRequest,
    repo: ProductRepository = Depends(_repo),
) -> NlpSearchResponse:
    raw_hits = repo.search_nlp(req)
    hits = [
        NlpSearchHit(
            product=Product.model_validate(product, from_attributes=True),
            # pg_trgm similarity is in [0,1]; expose as [0,100] for the UI.
            score=round(score * 100, 2),
            matched_terms=ProductRepository.extract_matched_terms(req.query, product),
        )
        for product, score in raw_hits
    ]
    return NlpSearchResponse(query=req.query, hits=hits, total=len(hits))
