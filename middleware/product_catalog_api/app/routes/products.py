"""Product CRUD + list endpoints."""

from __future__ import annotations

from datetime import UTC, datetime
from math import ceil
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from ..db.models import Product as ProductOrm
from ..db.session import get_session
from ..repository import ProductRepository
from ..schemas import (
    PaginationMeta,
    Product,
    ProductCreate,
    ProductListResponse,
    ProductUpdate,
)

router = APIRouter(prefix="/api/v1/products", tags=["products"])


def _repo(session: Session = Depends(get_session)) -> ProductRepository:
    return ProductRepository(session)


def _orm_to_schema(row: ProductOrm) -> Product:
    return Product.model_validate(row, from_attributes=True)


# ── LIST ──────────────────────────────────────────────────────────────────────


@router.get("", response_model=ProductListResponse, summary="List products (paginated)")
def list_products(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=200)] = 20,
    sort_by: Annotated[
        str, Query(pattern="^(name|sku|aum|fee_bps|risk_level|launch_date|created_at)$")
    ] = "name",
    sort_dir: Annotated[str, Query(pattern="^(asc|desc)$")] = "asc",
    active_only: bool = True,
    repo: ProductRepository = Depends(_repo),
) -> ProductListResponse:
    items, total = repo.list_paginated(
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_dir=sort_dir,
        active_only=active_only,
    )
    return ProductListResponse(
        items=[_orm_to_schema(r) for r in items],
        pagination=PaginationMeta(
            page=page,
            page_size=page_size,
            total_items=total,
            total_pages=max(1, ceil(total / page_size)),
        ),
    )


# ── READ ──────────────────────────────────────────────────────────────────────


@router.get("/{product_id}", response_model=Product, summary="Get product by UUID")
def get_product(
    product_id: Annotated[UUID, Path()],
    repo: ProductRepository = Depends(_repo),
) -> Product:
    row = repo.get_by_id(product_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return _orm_to_schema(row)


@router.get("/sku/{sku}", response_model=Product, summary="Get product by SKU")
def get_product_by_sku(
    sku: Annotated[str, Path(min_length=5, max_length=40)],
    repo: ProductRepository = Depends(_repo),
) -> Product:
    row = repo.get_by_sku(sku)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return _orm_to_schema(row)


# ── WRITE (admin-authorised in a future PR) ──────────────────────────────────


@router.post(
    "",
    response_model=Product,
    status_code=status.HTTP_201_CREATED,
    summary="Create a product",
)
def create_product(
    payload: ProductCreate,
    repo: ProductRepository = Depends(_repo),
) -> Product:
    if repo.get_by_sku(payload.sku) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, f"SKU '{payload.sku}' already exists")

    now = datetime.now(tz=UTC)
    row = ProductOrm(
        id=uuid4(),
        created_at=now,
        updated_at=now,
        **payload.model_dump(),
    )
    repo.create(row)
    return _orm_to_schema(row)


@router.put("/{product_id}", response_model=Product, summary="Update a product (partial)")
def update_product(
    product_id: Annotated[UUID, Path()],
    payload: ProductUpdate,
    repo: ProductRepository = Depends(_repo),
) -> Product:
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        row = repo.get_by_id(product_id)
        if row is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
        return _orm_to_schema(row)

    changes["updated_at"] = datetime.now(tz=UTC)
    row = repo.update_partial(product_id, changes)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return _orm_to_schema(row)


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete (deactivate) a product",
)
def delete_product(
    product_id: Annotated[UUID, Path()],
    repo: ProductRepository = Depends(_repo),
) -> None:
    if not repo.soft_delete(product_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
