# Database Migrations (Alembic)

The `db/` directory owns the single Alembic migration timeline for the monorepo. Every schema change — whether it belongs to `product_catalog_api`, `admin_api`, `customer_api`, or `data_management_api` — ships as a versioned Alembic revision that runs unchanged against local Postgres, **AWS RDS**, **Azure Postgres**, or **GCP Cloud SQL**.

## Why Alembic

Alembic is the Python equivalent of Liquibase — versioned, cloud-agnostic, reversible, and CI-friendly. The same migration graph is applied everywhere; only the connection string differs per environment.

## Layout

```
db/
├── alembic.ini              # Config (no DB URL — read from env var)
├── alembic/
│   ├── env.py               # Reads WEALTHSIGNAL_DB_URL; imports service metadata
│   ├── script.py.mako       # Template for new revisions
│   └── versions/            # Versioned revision files
└── README.md                # This file
```

## Environment variable

All execution paths read the database URL from `WEALTHSIGNAL_DB_URL`. The fallback for local dev is the shared docker-compose Postgres:

```
postgresql+psycopg://wealthsignal:wealthsignal@localhost:5432/wealthsignal
```

## Running locally

```bash
# Simulated by docker-all-up.sh after Postgres is healthy.
# Manually:
alembic -c db/alembic.ini upgrade head
```

## Running in AWS / Azure / GCP

Use the **Database Migration** GitHub Actions workflow (`.github/workflows/db-migrate.yml`). The workflow is triggered manually and takes two inputs:

| Input | Values | Purpose |
|---|---|---|
| `target_env` | `local`, `aws`, `azure`, `gcp` | Selects the GitHub Environment — which in turn provides the environment-specific `WEALTHSIGNAL_DB_URL` secret |
| `action` | `upgrade`, `downgrade`, `current`, `history`, `stamp` | What Alembic command to run |

Each GitHub Environment (`aws`, `azure`, `gcp`) stores its own `WEALTHSIGNAL_DB_URL` secret, pointing at the respective managed Postgres (RDS, Azure Database for PostgreSQL, Cloud SQL). Required-reviewer and wait-timer protection can be added to the `aws` / `azure` / `gcp` environments for production safety.

## Authoring a new migration

```bash
# Autogenerate a revision based on SQLAlchemy model changes.
alembic -c db/alembic.ini revision --autogenerate -m "add product_catalog.products"

# Manual revision (no autogenerate).
alembic -c db/alembic.ini revision -m "add search_events table"
```

New revision files are auto-formatted with black + ruff via the Alembic `post_write_hooks` configured in `alembic.ini`.

## Conventions

- **One logical change per revision.** Do not bundle schema + data changes; separate them.
- **All tables live in a service-owned schema** (`product_catalog`, `admin_ops`, `customer`, `data_management`). The schemas themselves are created by `DevOps/Local/postgres/init.sql` (they require superuser and are not Alembic's responsibility).
- **Downgrades must be reversible.** Empty `downgrade()` stubs are rejected in review.
- **Data backfills run as Airflow DAGs**, not as Alembic migrations, once the volume exceeds a few thousand rows.
