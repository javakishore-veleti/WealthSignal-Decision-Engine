"""
FastAPI entry-point for the Customer API.

Run locally:
    npm run run:local:middleware:customer        (port 8002)
or:
    uvicorn middleware.customer_api.app.main:app --reload --port 8002

Owns the customer-facing partial-form application flow — this API is what
the customer_portal talks to on every keystroke during sign-up. Delegates
product lookup/search to product_catalog_api and scoring to the Decision
Engine artefacts served from the MLflow Model Registry.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import applications, health, me, offers

logger = logging.getLogger("customer_api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(
    title="WealthSignal · Customer API",
    description=(
        "Customer-facing API. Handles partial application drafts, submissions, "
        "offer landings, and the authenticated self-view consumed by customer_portal."
    ),
    version="0.1.0",
    openapi_tags=[
        {"name": "health", "description": "Liveness, readiness, and build info."},
        {"name": "applications", "description": "Partial drafts and full submissions."},
        {"name": "offers", "description": "Token-based email-offer landing pages."},
        {"name": "customer", "description": "Authenticated self-view."},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://localhost:4202",  # customer_portal
    ],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.include_router(health.router)
app.include_router(applications.router)
app.include_router(offers.router)
app.include_router(me.router)


@app.get("/", include_in_schema=False)
def root() -> dict:
    return {"service": "customer_api", "docs": "/docs"}
