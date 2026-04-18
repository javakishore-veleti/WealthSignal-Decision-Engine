"""
Airflow DAG — load_product_catalog

Idempotent one-time data-load DAG that reads `data/product_catalog/products_seed.json`
and UPSERTs every record into `product_catalog.products`. Safe to re-run:
on subsequent executions, existing rows are updated in-place while any new
rows in the JSON are inserted.

Trigger point:
  Admin Portal → Domain Services → Product Catalog → Initial Data Load Setup
    └─▶ POST to admin_api (or data_management_api) which calls the Airflow
        REST API to start this DAG, returns a job_id for the portal to poll.

This DAG runs inside Airflow, where all heavy compute lives by convention.
FastAPI middleware never performs this bulk-load directly.
"""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime, timedelta
from pathlib import Path

from airflow.decorators import dag, task
from airflow.providers.postgres.hooks.postgres import PostgresHook

log = logging.getLogger("wealthsignal.load_product_catalog")

# Inside the Airflow container the repo is mounted at /opt/airflow with
# engine/ available as a Python package. See DevOps/Local/airflow/docker-compose.yml.
SEED_PATH = Path("/opt/airflow/data/product_catalog/products_seed.json")
POSTGRES_CONN_ID = "wealthsignal_postgres"

TARGET_SCHEMA = "product_catalog"
TARGET_TABLE = "products"

# All non-PK columns that should be overwritten on conflict. `id` is kept as
# the existing DB value (UPSERT matches on sku, which is a stable business key).
UPSERT_COLUMNS: list[str] = [
    "name",
    "short_description",
    "long_description",
    "asset_class",
    "product_type",
    "risk_level",
    "time_horizon",
    "liquidity",
    "geography",
    "target_segment",
    "esg_rating",
    "min_investment",
    "currency",
    "fee_bps",
    "aum",
    "issuer",
    "ticker",
    "isin",
    "launch_date",
    "is_active",
    "tags",
    "updated_at",
]

ALL_COLUMNS: list[str] = [
    "id",
    "sku",
    *UPSERT_COLUMNS[:-1],  # everything above except updated_at
    "created_at",
    "updated_at",
]

INSERT_SQL = f"""
    INSERT INTO {TARGET_SCHEMA}.{TARGET_TABLE} (
        {", ".join(ALL_COLUMNS)}
    ) VALUES ({", ".join(["%s"] * len(ALL_COLUMNS))})
    ON CONFLICT (sku) DO UPDATE SET
        {", ".join(f"{col} = EXCLUDED.{col}" for col in UPSERT_COLUMNS)}
"""


DEFAULT_ARGS = {
    "owner": "wealthsignal",
    "depends_on_past": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=2),
    "email_on_failure": False,
    "email_on_retry": False,
    "sla": timedelta(minutes=10),
}


@dag(
    dag_id="load_product_catalog",
    description=(
        "Idempotent UPSERT of the wealth-product seed JSON into "
        "product_catalog.products. Triggered from the Admin Portal's "
        "'Initial Data Load Setup' action."
    ),
    start_date=datetime(2026, 4, 18, tzinfo=UTC),
    schedule=None,  # manual trigger only
    catchup=False,
    max_active_runs=1,
    default_args=DEFAULT_ARGS,
    tags=["ingestion", "product_catalog", "wealthsignal"],
    doc_md=__doc__,
)
def load_product_catalog() -> None:

    # ── Task 1 : read the seed JSON ───────────────────────────────────────────
    @task(task_id="read_seed")
    def read_seed() -> dict:
        if not SEED_PATH.exists():
            raise FileNotFoundError(
                f"Seed file not found at {SEED_PATH}. "
                f"Run `npm run seed:products` before triggering this DAG."
            )
        with SEED_PATH.open(encoding="utf-8") as f:
            records: list[dict] = json.load(f)
        log.info("Loaded %d records from %s", len(records), SEED_PATH)
        return {"count": len(records), "path": str(SEED_PATH)}

    # ── Task 2 : UPSERT in a single transaction ───────────────────────────────
    @task(task_id="upsert_products")
    def upsert_products(manifest: dict) -> dict:
        # manifest is passed in only to enforce task ordering (XCom dependency);
        # we re-read the JSON here to keep memory off the scheduler.
        del manifest
        with SEED_PATH.open(encoding="utf-8") as f:
            records: list[dict] = json.load(f)

        hook = PostgresHook(postgres_conn_id=POSTGRES_CONN_ID)
        rows = [_to_db_tuple(r) for r in records]

        log.info(
            "Beginning UPSERT of %d products into %s.%s", len(rows), TARGET_SCHEMA, TARGET_TABLE
        )

        with hook.get_conn() as conn:
            with conn.cursor() as cur:
                # Capture pre-state for the summary.
                cur.execute(f"SELECT COUNT(*) FROM {TARGET_SCHEMA}.{TARGET_TABLE}")
                pre_count = int(cur.fetchone()[0])

                cur.executemany(INSERT_SQL, rows)

                cur.execute(f"SELECT COUNT(*) FROM {TARGET_SCHEMA}.{TARGET_TABLE}")
                post_count = int(cur.fetchone()[0])
            conn.commit()

        inserted = max(0, post_count - pre_count)
        updated = len(rows) - inserted
        log.info(
            "UPSERT complete — inserted=%d updated=%d total_after=%d",
            inserted,
            updated,
            post_count,
        )
        return {
            "inserted": inserted,
            "updated": updated,
            "total_records_processed": len(rows),
            "total_rows_after": post_count,
        }

    # ── Task 3 : summary (visible in the Airflow UI + logs) ───────────────────
    @task(task_id="summary")
    def summary(counts: dict) -> dict:
        log.info("Product Catalog load summary: %s", counts)
        return counts

    summary(upsert_products(read_seed()))


def _to_db_tuple(record: dict) -> tuple:
    """Project a JSON record onto the ALL_COLUMNS tuple in the exact order
    expected by the INSERT statement."""
    return (
        record["id"],
        record["sku"],
        record["name"],
        record["short_description"],
        record["long_description"],
        record["asset_class"],
        record["product_type"],
        record["risk_level"],
        record["time_horizon"],
        record["liquidity"],
        record["geography"],
        record["target_segment"],
        record["esg_rating"],
        record["min_investment"],
        record["currency"],
        record["fee_bps"],
        record["aum"],
        record["issuer"],
        record.get("ticker"),
        record.get("isin"),
        record["launch_date"],
        record["is_active"],
        record["tags"],
        record["created_at"],
        record["updated_at"],
    )


dag_instance = load_product_catalog()
