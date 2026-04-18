"""Category distribution endpoint — powers Admin Portal facets + Customer Portal filters."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db.session import get_session
from ..repository import ProductRepository
from ..schemas import CategoriesResponse, CategoryCount

router = APIRouter(prefix="/api/v1/categories", tags=["categories"])


def _repo(session: Session = Depends(get_session)) -> ProductRepository:
    return ProductRepository(session)


@router.get(
    "",
    response_model=CategoriesResponse,
    summary="Distribution of active products across every categorical field",
)
def list_categories(repo: ProductRepository = Depends(_repo)) -> CategoriesResponse:
    raw = repo.category_counts()
    total = raw["_total"][0][1] if raw.get("_total") else 0

    def pairs(key: str) -> list[CategoryCount]:
        return [CategoryCount(value=v, count=c) for v, c in raw.get(key, [])]

    return CategoriesResponse(
        asset_class=pairs("asset_class"),
        product_type=pairs("product_type"),
        risk_level=pairs("risk_level"),
        geography=pairs("geography"),
        target_segment=pairs("target_segment"),
        esg_rating=pairs("esg_rating"),
        total_products=total,
    )
