# admin_portal — Internal Operations Console

Angular 17 standalone-component application for internal operations. Consumes `admin_api` for domain-specific actions and `product_catalog_api` (read + write) for the product catalogue.

## Tech stack

- Angular 17 · TypeScript (strict mode)
- Angular Material · SCSS design tokens (shared with `customer_portal` via `portals/shared/`)
- NgRx (signals flavour) for global app state (auth, selected org, feature flags)
- Feature-level services + signals for view-local state
- Jest (unit) · Playwright (e2e)
- Managed as an npm workspace from the root `package.json`

## Top-level navigation

Single top bar across the whole app:

```
┌────────────────────────────────────────────────────────────────────────────┐
│  WealthSignal   Dashboard   Domain Services   Compliance   Settings   👤  │
└────────────────────────────────────────────────────────────────────────────┘
```

Clicking **Domain Services** reveals a persistent left nav tree scoped to the Domain Services area.

## Domain Services → left nav

```
Domain Services
└── Product Catalog
    ├── View All                   (paginated grid + facets)
    ├── Create                     (form)
    ├── Search                     (criteria-based search UI)
    └── Initial Data Load Setup    (async action — triggers Airflow DAG)
```

Further top-level domain folders (Customer Segments, Campaigns, Offers, Model Registry, etc.) are added the same way as separate collapsible nodes.

## Product Catalog screens

| Screen | Route | API | Notes |
|---|---|---|---|
| **View All** | `/domain-services/product-catalog` | `GET /api/v1/products` (paginated) | Material data-grid, server-side sort + pagination, facet chips (asset class / product type / risk level / ESG) driven by `GET /api/v1/categories` |
| **Create** | `/domain-services/product-catalog/create` | `POST /api/v1/products` | Reactive form validated against the OpenAPI-generated TypeScript `ProductCreate` model; success banner + redirect to detail page |
| **Search** | `/domain-services/product-catalog/search` | `POST /api/v1/products/search/criteria` | Same criteria UX as customer portal but with admin-only fields (`is_active`, issuer wildcard) |
| **Detail** | `/domain-services/product-catalog/{sku}` | `GET /api/v1/products/sku/{sku}` | Full field view, edit drawer (`PUT /api/v1/products/{id}`), soft-delete button (`DELETE /api/v1/products/{id}`) |
| **Initial Data Load Setup** | `/domain-services/product-catalog/initial-load` | `POST /api/v1/admin/product-catalog/initial-load` (on `admin_api`) | Shows a "Start Load" button. On click, admin_api triggers the `load_product_catalog` Airflow DAG and returns `{job_id}`. The UI then polls `GET /api/v1/admin/jobs/{job_id}` every 3 s and renders status (queued → running → succeeded / failed) plus the inserted / updated counts from the DAG's summary task. **Idempotent** — safe to click twice; the DAG UPSERTs on `sku`. |

## OpenAPI client generation

The API clients for `admin_api`, `customer_api`, `data_management_api`, and `product_catalog_api` are generated from their OpenAPI specs into `src/app/api/` via `openapi-typescript` (or `ng-openapi-gen`). Run:

```bash
npm run api:generate --workspace=portals/admin_portal
```

This keeps the front-end types honest without hand-maintaining TypeScript interfaces.

## Local development

```bash
npm run run:local:docker:all          # infrastructure
npm run run:local:middleware:all      # all four FastAPI services
npm run run:local:portals:admin       # admin_portal on :4201
```

## Scaffolding

When the Angular app is scaffolded (`ng new admin-portal --routing --style=scss --standalone`), drop the generated files into this directory, wire it into `portals:install` / `portals:build` / `portals:lint` / `portals:test` (already in root `package.json`), and update the design-tokens path.

## Related

- [`customer_portal`](../customer_portal/README.md) — the customer-facing counterpart.
- [`middleware/product_catalog_api`](../../middleware/product_catalog_api/) — the FastAPI service this portal talks to.
- [`airflow/dags/ingestion/load_product_catalog.py`](../../airflow/dags/ingestion/load_product_catalog.py) — the DAG triggered by "Initial Data Load Setup".
