# WealthSignal Decision Engine

[![CI](https://github.com/javakishore-veleti/WealthSignal-Decision-Engine/actions/workflows/ci.yml/badge.svg)](https://github.com/javakishore-veleti/WealthSignal-Decision-Engine/actions/workflows/ci.yml)
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
| **`customer_portal`** | Customer-facing digital-form UI |
| **`admin_portal`** | Internal operations console (model registry, promotions, audit) |
| **`customer_api`** (FastAPI) | Real-time scoring + offer trigger — pairs with `customer_portal` |
| **`admin_api`** (FastAPI) | Model registry ops, promotions, audit trail — pairs with `admin_portal` |
| **`data_management_api`** (FastAPI, async) | Submits Airflow DAG runs for ingestion, downloads, PyTorch training; streams job status; exposes artefacts |
| **Apache Airflow** | Executes all heavy compute (Kaggle ingestion, PyTorch training, batch scoring, DVC commits) |
| **`engine/wealthsignal`** | ML core — PyTorch models, training loops, MLflow helpers |
| **Kafka** | Event bus for async job events, drift alerts, audit logs |
| **Postgres** | Airflow metadata + application schemas |
| **Grafana / Prometheus / Kibana** | Observability stack (metrics, dashboards, logs) |

## Tech stack

- **ML core:** PyTorch 2.3, Hugging Face Transformers 4.40, TRL 0.8 (SFT+GRPO), PEFT 0.10, bitsandbytes (4-bit NF4)
- **Experiment tracking:** MLflow 2.13 (Model Registry + Artifact Store)
- **Data & pipelines:** DVC 3.50, Great Expectations 0.18, Hydra-core 1.3
- **HPO:** Optuna 3.6
- **Serving:** FastAPI 0.111, Uvicorn, Pydantic v2
- **Quality:** Black, Ruff, mypy, pre-commit, pytest

## Repository structure

```
middleware/
├── admin_api/                 ↔ admin_portal
├── customer_api/              ↔ customer_portal
└── data_management_api/       async orchestration → Airflow

portals/
├── admin_portal/
└── customer_portal/

airflow/
├── dags/{ingestion,training,scoring}/
├── plugins/
└── config/

engine/wealthsignal/
├── config/      data/      models/
├── training/    serving/   tracking.py

DevOps/Local/
├── docker-all-{up,down,status}.sh
├── airflow/docker-compose.yml
├── postgres/docker-compose.yml
├── kafka/docker-compose.yml
└── Observability/{Grafana,Prometheus,Kibana}/

tests/       docs/       .github/
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full conventions — branch naming, commit scopes, FastAPI patterns, Airflow DAG rules, and the async job protocol used by `data_management_api`.

### Quick local start

```bash
./DevOps/Local/docker-all-up.sh
# Airflow: http://localhost:8080   MLflow: http://localhost:5000
# Grafana: http://localhost:3000   Kibana: http://localhost:5601
```

## Research anchor

This engine operationalises [**Customer-R1** (arXiv:2510.07230)](https://arxiv.org/abs/2510.07230): SFT + RL for personalised customer-behaviour simulation with LLM agents. The `rl_policy` module adapts the paper's SFT+GRPO recipe to the wealth-management form-action domain.

## Related services

- [`clientoffer-advisory-platform`](https://github.com/javakishore-veleti/clientoffer-advisory-platform) — LangGraph multi-agent offer pipeline (consumes this engine)
- [`wealthadvisor-agent-platform`](https://github.com/javakishore-veleti/wealthadvisor-agent-platform) — Google ADK + Vertex AI agent platform (consumes this engine via A2A)

## License

Licensed under the [Apache License 2.0](LICENSE).
