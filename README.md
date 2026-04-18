# WealthSignal Decision Engine

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-active%20development-FFA500)]()
[![Domain](https://img.shields.io/badge/domain-Wealth%20Management-1B3A5C)]()
[![Compliance](https://img.shields.io/badge/compliance-FCA%20aware-006633)]()

**ML & modelling**
[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.3-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org/)
[![MLflow](https://img.shields.io/badge/MLflow-2.13-0194E2?logo=mlflow&logoColor=white)](https://mlflow.org/)
[![Hugging Face](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-Transformers-FFD21E)](https://huggingface.co/)
[![DVC](https://img.shields.io/badge/DVC-3.50-13ADC7?logo=dvc&logoColor=white)](https://dvc.org/)
[![Optuna](https://img.shields.io/badge/Optuna-3.6-4B8BBE)](https://optuna.org/)

**Middleware & orchestration**
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Airflow](https://img.shields.io/badge/Airflow-2.9-017CEE?logo=apacheairflow&logoColor=white)](https://airflow.apache.org/)
[![Kafka](https://img.shields.io/badge/Kafka-3.7-231F20?logo=apachekafka&logoColor=white)](https://kafka.apache.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

**Portals**
[![Angular](https://img.shields.io/badge/Angular-17-DD0031?logo=angular&logoColor=white)](https://angular.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![npm workspaces](https://img.shields.io/badge/npm-workspaces-CB3837?logo=npm&logoColor=white)](https://docs.npmjs.com/cli/v10/using-npm/workspaces)

**Observability**
[![Grafana](https://img.shields.io/badge/Grafana-dashboards-F46800?logo=grafana&logoColor=white)](https://grafana.com/)
[![Prometheus](https://img.shields.io/badge/Prometheus-metrics-E6522C?logo=prometheus&logoColor=white)](https://prometheus.io/)
[![Kibana](https://img.shields.io/badge/Kibana-logs-005571?logo=kibana&logoColor=white)](https://www.elastic.co/kibana/)

**Quality**
[![Code Style: Black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)
[![Linter: Ruff](https://img.shields.io/badge/linter-ruff-D7FF64?logo=ruff)](https://github.com/astral-sh/ruff)
[![Pre-commit](https://img.shields.io/badge/pre--commit-enabled-FAB040?logo=pre-commit&logoColor=white)](https://pre-commit.com/)
[![Type-checked: mypy](https://img.shields.io/badge/type--checked-mypy-1F5082)](http://mypy-lang.org/)
[![Tests: pytest](https://img.shields.io/badge/tests-pytest-0A9EDC?logo=pytest&logoColor=white)](https://docs.pytest.org/)

---

Production decision engine for the wealth-management division. When a customer begins but does not complete a wealth-product application form, this engine ingests the partial form data and returns the signals that downstream advisory agents use to generate a personalised offer and email.

## What it returns

| Signal | Model | Purpose |
|---|---|---|
| **Form-completion probability** | `FormCompletionPredictor` (MLP + Focal Loss) | Prioritises outreach to customers likely to convert |
| **Customer segment** | `WealthAutoencoder` + KMeans | Routes customer to the right product family (e.g. High-Wealth-Prospect → premium advisory) |
| **Next form action** | `FormActionLSTM` | Enables real-time contextual nudges on the digital form UI |
| **Policy recommendation** | Customer-R1 SFT+RL policy (Phi-3-mini + QLoRA) | Personalises the next-best action per customer persona |

## Monorepo architecture

```
  ┌──────────────────┐         ┌──────────────────┐
  │  customer_portal │         │   admin_portal   │
  └────────┬─────────┘         └─────────┬────────┘
           │                             │
           ▼                             ▼
  ┌──────────────────┐         ┌──────────────────┐        ┌─────────────────────────┐
  │   customer_api   │         │    admin_api     │        │  data_management_api    │
  │    (FastAPI)     │         │    (FastAPI)     │        │   (FastAPI, async)      │
  └────────┬─────────┘         └─────────┬────────┘        └────────────┬────────────┘
           │                             │                              │ submit DAG run
           │  /predict/*                 │  model registry,             │ poll /jobs/{id}
           │                             │  promotions, audit           ▼
           │                             │                   ┌─────────────────────────┐
           └──────────┬──────────────────┘                   │    Apache Airflow       │
                      ▼                                      │  ingestion · training · │
             ┌──────────────────────┐                        │  scoring DAGs           │
             │  engine/wealthsignal │ ◄──── imported by ───► │  (PyTorch heavy compute)│
             │  PyTorch · MLflow    │                        └────────────┬────────────┘
             └──────────────────────┘                                     │
                      │                                                   │
                      │   runs logged to                                  │
                      ▼                                                   ▼
             ┌──────────────────────┐                        ┌─────────────────────────┐
             │   MLflow Registry    │ ◄───────────────────── │    Artefacts (GCS/S3)   │
             └──────────────────────┘                        └─────────────────────────┘

  Shared infra (DevOps/Local):  Postgres · Kafka · Grafana · Prometheus · Kibana

  Downstream consumers (sibling repos):
    clientoffer-advisory-platform  (LangGraph)   →  calls customer_api
    wealthadvisor-agent-platform   (Google ADK)  →  calls customer_api via A2A
```

> **All PyTorch code runs in Apache Airflow.** FastAPI services never execute model training or bulk feature engineering — they orchestrate Airflow DAGs (via `data_management_api`) or serve cached artefacts from the MLflow Model Registry. This keeps the middleware tier stateless, fast, and horizontally scalable.

### Component responsibilities

| Component | Role |
|---|---|
| **`customer_portal`** | Customer-facing digital-form UI + product search |
| **`admin_portal`** | Internal operations console (model registry, product catalog, audit) |
| **`customer_api`** (FastAPI, :8002) | Real-time scoring + offer trigger — pairs with `customer_portal` |
| **`admin_api`** (FastAPI, :8001) | Model registry ops, promotions, audit — pairs with `admin_portal` |
| **`data_management_api`** (FastAPI, :8003, async) | Submits Airflow DAG runs for ingestion, downloads, PyTorch training; streams job status; exposes artefacts |
| **`product_catalog_api`** (FastAPI, :8004) | CRUD + criteria + NLP (pg_trgm) search over ~10K wealth products; consumed by both portals |
| **Apache Airflow** | Executes all heavy compute (Kaggle ingestion, PyTorch training, batch scoring, DVC commits, product-catalog UPSERT) |
| **`engine/wealthsignal`** | ML core — PyTorch models, training loops, MLflow helpers |
| **`db/`** | Cloud-agnostic Alembic migration timeline (local / AWS / Azure / GCP) |
| **Kafka** | Event bus for async job events, drift alerts, audit logs |
| **Postgres** | Airflow metadata + per-service application schemas (product_catalog, customer, admin_ops, data_management) |
| **Grafana / Prometheus / Kibana / MLflow** | Observability stack (metrics, dashboards, logs, experiment tracking) |

## Tech stack

- **ML core:** PyTorch 2.3, Hugging Face Transformers 4.40, TRL 0.8 (SFT+GRPO), PEFT 0.10, bitsandbytes (4-bit NF4)
- **Experiment tracking:** MLflow 2.13 (Model Registry + Artifact Store)
- **Data & pipelines:** DVC 3.50, Great Expectations 0.18, Hydra-core 1.3
- **HPO:** Optuna 3.6
- **Serving:** FastAPI 0.111, Uvicorn, Pydantic v2
- **Quality:** Black, Ruff, mypy, pre-commit, pytest

## Repository layout

Top-level folders: `middleware/` (FastAPI APIs), `portals/` (Angular apps), `airflow/` (DAGs), `engine/` (PyTorch ML core), `DevOps/Local/` (Docker + lifecycle scripts), plus standard `tests/`, `docs/`, `.github/`.

The **full folder tree, pairing rules, and naming conventions** live in [CONTRIBUTING.md](CONTRIBUTING.md) — that keeps this README focused on *what the system does*, not *where each file sits*.

## Key design decisions

- **Monorepo**, managed by the root `package.json` (operational only — npm workspaces point at the Angular portals).
- **Middleware = FastAPI.** Every API (`admin_api`, `customer_api`, `data_management_api`, and the upcoming `product_catalog_api`) is built on FastAPI + Pydantic v2.
- **Portals = Angular 17.** TypeScript strict; two standalone Angular apps (`admin_portal`, `customer_portal`) managed as npm workspaces.
- **All PyTorch compute runs in Apache Airflow.** Middleware never trains or does heavy feature engineering — it serves cached Model Registry artefacts or submits Airflow DAG runs.
- **`data_management_api` is async-only.** Every heavy operation returns a `job_id` and defers execution to Airflow; clients poll for status.
- **DB migrations via Alembic (cloud-agnostic).** `db/alembic/` is the single migration timeline. A manual GitHub Actions workflow (`Database Migration`) applies it to `local`, `aws`, `azure`, or `gcp` — each is a GitHub Environment with its own `WEALTHSIGNAL_DB_URL` secret. `docker-all-up.sh` simulates the same workflow locally after Postgres becomes healthy.
- **DevOps at the repo root.** `DevOps/Local/` ships docker-compose stacks for Airflow, Postgres, Kafka, Grafana, Prometheus, Elasticsearch, Kibana, and MLflow, plus `up`/`status`/`shutdown` lifecycle scripts used by the `npm run run:local:*` commands. All containers attach to a shared `wealthsignal-net` Docker network.
- **Product Catalog**: a dedicated FastAPI service on port 8004 with CRUD, criteria search, and NLP search (Postgres pg_trgm similarity) over ~10,000 wealth-management products. Data is generated programmatically (no per-product hardcoding) and written to `data/product_catalog/products_seed.json` as the source of truth. The Admin Portal's **Initial Data Load Setup** action triggers the `load_product_catalog` Airflow DAG, which **UPSERTs** on `sku` — idempotent, safe to click twice. See [`middleware/product_catalog_api/`](middleware/product_catalog_api/) and [`airflow/dags/ingestion/load_product_catalog.py`](airflow/dags/ingestion/load_product_catalog.py).
- **GitHub Actions are manual-only.** There is no auto-triggered CI. The only workflow in the repo is `db-migrate.yml` (manual dispatch, target env = local / aws / azure / gcp). Run `ruff check .` and `black --check .` locally before pushing.
- **Chat log preserved** in [README_Claude_Kishore_ChatLog.md](README_Claude_Kishore_ChatLog.md) — running record of collaboration decisions.

## Quick local start

```bash
# One-time setup (conda env, Python deps, npm deps, pre-commit)
npm run setup:local:all

# Bring the entire stack up (infra → middleware → portals)
npm run run:local:all

# Tier-level lifecycle
npm run run:local:docker:{all,status,shutdown}
npm run run:local:middleware:{all,status,shutdown}
npm run run:local:portals:{all,status,shutdown}

# Whole-stack tear-down
npm run run:local:shutdown
```

Background processes write PIDs to `.local/pids/` and logs to `.local/logs/` (both gitignored). `status` probes ports + `/health`; `shutdown` sends SIGTERM and falls back to port cleanup.

### Infrastructure endpoints

| Service     | URL                       |
|-------------|---------------------------|
| Airflow UI  | http://localhost:8080     |
| MLflow UI   | http://localhost:5000     |
| Grafana     | http://localhost:3000     |
| Prometheus  | http://localhost:9090     |
| Kibana      | http://localhost:5601     |
| Postgres    | localhost:5432            |
| Kafka       | localhost:9092            |

### Middleware + portal ports

| Tier | Service | Port |
|---|---|---|
| Middleware | `admin_api` | 8001 |
| Middleware | `customer_api` | 8002 |
| Middleware | `data_management_api` | 8003 |
| Portal | `admin_portal` | 4201 |
| Portal | `customer_portal` | 4202 |

## Research anchor

This engine operationalises [**Customer-R1** (arXiv:2510.07230)](https://arxiv.org/abs/2510.07230): SFT + RL for personalised customer-behaviour simulation with LLM agents. The `rl_policy` module adapts the paper's SFT+GRPO recipe to the wealth-management form-action domain.

## Related services

- [`clientoffer-advisory-platform`](https://github.com/javakishore-veleti/clientoffer-advisory-platform) — LangGraph multi-agent offer pipeline (consumes this engine)
- [`wealthadvisor-agent-platform`](https://github.com/javakishore-veleti/wealthadvisor-agent-platform) — Google ADK + Vertex AI agent platform (consumes this engine via A2A)

## License

Licensed under the [Apache License 2.0](LICENSE).
