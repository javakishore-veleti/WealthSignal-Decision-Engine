"""
Alembic environment.

The database URL is read from `WEALTHSIGNAL_DB_URL`, falling back to the local
Postgres URL used by `DevOps/Local/postgres/docker-compose.yml`. Production
deployments (AWS / Azure / GCP) set this via GitHub Environment secrets —
see `.github/workflows/db-migrate.yml`.

Target metadata: currently empty. Each middleware service will import its
SQLAlchemy models here as they are added (e.g. product_catalog). This keeps
a single Alembic timeline across the monorepo; split per-service later if
services diverge.
"""

from __future__ import annotations

import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

config = context.config

# Interpret logging config from alembic.ini.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── Database URL resolution ──────────────────────────────────────────────────

DEFAULT_LOCAL_URL = "postgresql+psycopg://wealthsignal:wealthsignal@localhost:5432/wealthsignal"
DB_URL = os.environ.get("WEALTHSIGNAL_DB_URL", DEFAULT_LOCAL_URL)
config.set_main_option("sqlalchemy.url", DB_URL)

# ── Target metadata ──────────────────────────────────────────────────────────
# Import service-owned SQLAlchemy MetaData objects here as they come online.
# Example (once Product Catalog lands):
#     from middleware.product_catalog_api.app.db.models import metadata as product_catalog_md
#     target_metadata = product_catalog_md
target_metadata = None


def run_migrations_offline() -> None:
    """Emit SQL without connecting — useful for reviewing migration output."""
    context.configure(
        url=DB_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Connect and run migrations against the live database."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            include_schemas=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
