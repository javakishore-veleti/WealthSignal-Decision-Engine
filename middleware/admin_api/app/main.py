"""
FastAPI entry-point for the Admin API.

Run locally:
    npm run run:local:middleware:admin        (port 8001)
or:
    uvicorn middleware.admin_api.app.main:app --reload --port 8001

Pairs with admin_portal. Responsibilities:
  - Model Registry operations (list, promote / demote, audit)
  - Product Catalog admin actions (Initial Data Load Setup)
  - Async job polling for long-running DAG triggers
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import health, jobs, mlflow, models, product_catalog

logger = logging.getLogger("admin_api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(
    title="WealthSignal · Admin API",
    description=(
        "Internal operations API consumed by admin_portal. Model registry, "
        "product-catalog admin actions (Initial Data Load Setup), and "
        "async job polling."
    ),
    version="0.1.0",
    openapi_tags=[
        {"name": "health", "description": "Liveness, readiness, build info."},
        {"name": "models", "description": "Model registry — list, inspect, promote."},
        {"name": "product-catalog", "description": "Admin actions for product_catalog_api data."},
        {"name": "mlflow", "description": "MLflow bootstrap + experiment lifecycle triggers."},
        {"name": "jobs", "description": "Async job-status polling."},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://localhost:4201",  # admin_portal
    ],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.include_router(health.router)
app.include_router(models.router)
app.include_router(product_catalog.router)
app.include_router(mlflow.router)
app.include_router(jobs.router)


@app.get("/", include_in_schema=False)
def root() -> dict:
    return {"service": "admin_api", "docs": "/docs"}
