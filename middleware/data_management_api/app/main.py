"""
FastAPI entry-point for the Data Management API.

Run locally:
    npm run run:local:middleware:data-management     (port 8003)
or:
    uvicorn middleware.data_management_api.app.main:app --reload --port 8003

This service is the single seam between the middleware tier and Apache
Airflow. Every heavy operation (Kaggle ingestion, PyTorch training, batch
scoring, the product-catalog initial load) flows through here: a call
returns a job_id immediately, and the caller polls /api/v1/jobs/{id} for
progress. No PyTorch training runs inside the API process — that all
happens in Airflow DAGs by monorepo convention.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import artefacts, health, jobs, shortcuts

logger = logging.getLogger("data_management_api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(
    title="WealthSignal · Data Management API",
    description=(
        "Async orchestration layer. Submits Airflow DAG runs, streams job "
        "status, and exposes artefacts from completed runs. The only part "
        "of the middleware tier that talks to Airflow."
    ),
    version="0.1.0",
    openapi_tags=[
        {"name": "health", "description": "Liveness, readiness, build info."},
        {"name": "jobs", "description": "Generic DAG submission and polling."},
        {
            "name": "shortcuts",
            "description": "Typed shortcuts for common DAGs (Kaggle ingest, PyTorch train).",
        },
        {"name": "artefacts", "description": "Browse files produced by completed DAG runs."},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://localhost:4201",  # admin_portal
        "http://localhost:4202",  # customer_portal (unlikely but harmless)
    ],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.include_router(health.router)
app.include_router(jobs.router)
app.include_router(shortcuts.router)
app.include_router(artefacts.router)


@app.get("/", include_in_schema=False)
def root() -> dict:
    return {"service": "data_management_api", "docs": "/docs"}
