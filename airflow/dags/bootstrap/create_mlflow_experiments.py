"""
Airflow DAG — bootstrap_mlflow_experiments

Creates the eight experiment slots the WealthSignal decision engine uses:

  Production (decision-engine runs)
    wealth-form-classifier
    wealth-segmentation
    wealth-seq-model
    wealth-rl-policy

  Mastery (PyTorch-mastery / learning runs)
    mastery/wealth-form-classifier
    mastery/wealth-segmentation
    mastery/wealth-seq-model
    mastery/wealth-rl-policy

Idempotent: on re-runs, existing experiments are left alone (MLflow's
`create_experiment` raises on conflict; we catch it and log). Triggered
from the Admin Portal or directly via the Airflow UI. Runs inside
Airflow so every lifecycle action against MLflow is traceable and
auditable — matches the wider 'all ML + ops flows are async DAGs' rule.
"""

from __future__ import annotations

import logging
import os
from datetime import UTC, datetime, timedelta

from airflow.decorators import dag, task

log = logging.getLogger("wealthsignal.bootstrap.mlflow")

PRODUCTION_EXPERIMENTS: list[str] = [
    "wealth-form-classifier",
    "wealth-segmentation",
    "wealth-seq-model",
    "wealth-rl-policy",
]

MASTERY_EXPERIMENTS: list[str] = [f"mastery/{name}" for name in PRODUCTION_EXPERIMENTS]

ALL_EXPERIMENTS: list[str] = PRODUCTION_EXPERIMENTS + MASTERY_EXPERIMENTS

# Tags applied to every experiment so ops dashboards can filter reliably.
DEFAULT_TAGS = {
    "owner": "decision-engine",
    "domain": "wealth",
    "managed_by": "airflow:bootstrap_mlflow_experiments",
}


DEFAULT_ARGS = {
    "owner": "wealthsignal",
    "depends_on_past": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=1),
    "email_on_failure": False,
    "email_on_retry": False,
    "sla": timedelta(minutes=5),
}


@dag(
    dag_id="bootstrap_mlflow_experiments",
    description=(
        "One-time (idempotent) bootstrap that ensures the MLflow experiments "
        "the decision engine uses exist. Safe to re-run — existing "
        "experiments are detected and left unchanged."
    ),
    start_date=datetime(2026, 4, 18, tzinfo=UTC),
    schedule=None,
    catchup=False,
    max_active_runs=1,
    default_args=DEFAULT_ARGS,
    tags=["bootstrap", "mlflow", "wealthsignal"],
    doc_md=__doc__,
)
def bootstrap_mlflow_experiments() -> None:
    @task(task_id="ensure_experiments")
    def ensure_experiments() -> dict:
        import mlflow  # imported inside task so DAG parse doesn't need mlflow

        uri = os.environ.get("MLFLOW_TRACKING_URI", "http://ws-mlflow:5000")
        mlflow.set_tracking_uri(uri)
        log.info("Using MLflow tracking URI: %s", uri)

        client = mlflow.MlflowClient(tracking_uri=uri)

        created: list[str] = []
        already_existed: list[str] = []

        for name in ALL_EXPERIMENTS:
            existing = client.get_experiment_by_name(name)
            if existing is not None:
                log.info("exists : %s  (id=%s)", name, existing.experiment_id)
                already_existed.append(name)
                # Idempotent tag refresh in case DEFAULT_TAGS has evolved.
                for k, v in DEFAULT_TAGS.items():
                    client.set_experiment_tag(existing.experiment_id, k, v)
                continue

            experiment_id = client.create_experiment(name=name, tags=DEFAULT_TAGS)
            log.info("created: %s  (id=%s)", name, experiment_id)
            created.append(name)

        return {
            "tracking_uri": uri,
            "total": len(ALL_EXPERIMENTS),
            "created": created,
            "already_existed": already_existed,
        }

    @task(task_id="summary")
    def summary(counts: dict) -> dict:
        log.info("MLflow bootstrap summary: %s", counts)
        return counts

    summary(ensure_experiments())


dag_instance = bootstrap_mlflow_experiments()
