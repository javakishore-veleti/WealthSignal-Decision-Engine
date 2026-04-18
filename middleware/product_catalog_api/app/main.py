"""
FastAPI application entry-point for the Product Catalog service.

Run locally via the root package.json:
    npm run run:local:middleware:product-catalog   (port 8004)

or directly:
    uvicorn middleware.product_catalog_api.app.main:app --reload --port 8004
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import categories, health, products, search

logger = logging.getLogger("product_catalog_api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(
    title="WealthSignal · Product Catalog API",
    description=(
        "Catalogue of wealth-management products — CRUD, criteria search, and "
        "natural-language search (pg_trgm). Consumed by the Customer Portal "
        "(signup / browse) and the Admin Portal (Domain Services → Product Catalog)."
    ),
    version="0.1.0",
    openapi_tags=[
        {"name": "health", "description": "Liveness, readiness, and build info."},
        {"name": "products", "description": "CRUD and listing."},
        {"name": "search", "description": "Criteria-based and natural-language search."},
        {
            "name": "categories",
            "description": "Categorical distribution — powers UI filters and dashboards.",
        },
    ],
)

# Portals (served from :4201 / :4202 in local dev) consume this API directly;
# narrow the allowlist in staging / production via env var.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://localhost:4201",
        "http://localhost:4202",
    ],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    allow_credentials=False,
)

app.include_router(health.router)
app.include_router(products.router)
app.include_router(search.router)
app.include_router(categories.router)


@app.get("/", include_in_schema=False)
def root() -> dict:
    return {
        "service": "product_catalog_api",
        "docs": "/docs",
        "openapi": "/openapi.json",
    }
