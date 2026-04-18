# WealthSignal Decision Engine

[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.3-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org/)
[![MLflow](https://img.shields.io/badge/MLflow-2.13-0194E2?logo=mlflow&logoColor=white)](https://mlflow.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Hugging Face](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-Transformers-FFD21E)](https://huggingface.co/)
[![DVC](https://img.shields.io/badge/DVC-3.50-13ADC7?logo=dvc&logoColor=white)](https://dvc.org/)
[![Optuna](https://img.shields.io/badge/Optuna-3.6-4B8BBE)](https://optuna.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Code Style: Black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)
[![Linter: Ruff](https://img.shields.io/badge/linter-ruff-D7FF64?logo=ruff)](https://github.com/astral-sh/ruff)
[![Pre-commit](https://img.shields.io/badge/pre--commit-enabled-FAB040?logo=pre-commit&logoColor=white)](https://pre-commit.com/)
[![Type-checked: mypy](https://img.shields.io/badge/type--checked-mypy-1F5082)](http://mypy-lang.org/)
[![Tests: pytest](https://img.shields.io/badge/tests-pytest-0A9EDC?logo=pytest&logoColor=white)](https://docs.pytest.org/)

[![Status](https://img.shields.io/badge/status-active%20development-FFA500)]()
[![Domain](https://img.shields.io/badge/domain-Wealth%20Management-1B3A5C)]()
[![Compliance](https://img.shields.io/badge/compliance-FCA%20aware-006633)]()

---

Production decision engine for the wealth-management division. When a customer begins but does not complete a wealth-product application form, this engine ingests the partial form data and returns the signals that downstream advisory agents use to generate a personalised offer and email.

## What it returns

| Signal | Model | Purpose |
|---|---|---|
| **Form-completion probability** | `FormCompletionPredictor` (MLP + Focal Loss) | Prioritises outreach to customers likely to convert |
| **Customer segment** | `WealthAutoencoder` + KMeans | Routes customer to the right product family (e.g. High-Wealth-Prospect → premium advisory) |
| **Next form action** | `FormActionLSTM` | Enables real-time contextual nudges on the digital form UI |
| **Policy recommendation** | Customer-R1 SFT+RL policy (Phi-3-mini + QLoRA) | Personalises the next-best action per customer persona |

## Architecture role

```
  Digital Form UI
        │
        ▼
  ┌──────────────────────────────┐
  │  wealthsignal-decision-engine│  ◄── THIS REPO
  │  (PyTorch + MLflow + FastAPI)│
  └──────────────┬───────────────┘
                 │  /predict/form-completion
                 │  /predict/segment
                 │  /predict/next-action
                 │  /predict/policy
                 ▼
  ┌──────────────────────────────┐       ┌──────────────────────────────┐
  │ clientoffer-advisory-platform│       │ wealthadvisor-agent-platform │
  │        (LangGraph)           │       │   (Google ADK + Vertex AI)   │
  └──────────────────────────────┘       └──────────────────────────────┘
                 │                                        │
                 └────────── Personalised Offer ──────────┘
                                      │
                                      ▼
                             Customer Email
```

## Tech stack

- **ML core:** PyTorch 2.3, Hugging Face Transformers 4.40, TRL 0.8 (SFT+GRPO), PEFT 0.10, bitsandbytes (4-bit NF4)
- **Experiment tracking:** MLflow 2.13 (Model Registry + Artifact Store)
- **Data & pipelines:** DVC 3.50, Great Expectations 0.18, Hydra-core 1.3
- **HPO:** Optuna 3.6
- **Serving:** FastAPI 0.111, Uvicorn, Pydantic v2
- **Quality:** Black, Ruff, mypy, pre-commit, pytest

## Repository structure

```
src/wealthsignal/
├── config/              # Hydra experiment configs
├── data/                # Loaders, datasets, feature engineering
├── models/              # Form classifier, segmentation, sequence, RL policy
├── training/            # Trainer loop + Optuna HPO
├── serving/             # FastAPI inference router
└── tracking.py          # MLflow helpers
```

## Research anchor

This engine operationalises [**Customer-R1** (arXiv:2510.07230)](https://arxiv.org/abs/2510.07230): SFT + RL for personalised customer-behaviour simulation with LLM agents. The `rl_policy` module adapts the paper's SFT+GRPO recipe to the wealth-management form-action domain.

## Related services

- [`clientoffer-advisory-platform`](https://github.com/javakishore-veleti/clientoffer-advisory-platform) — LangGraph multi-agent offer pipeline (consumes this engine)
- [`wealthadvisor-agent-platform`](https://github.com/javakishore-veleti/wealthadvisor-agent-platform) — Google ADK + Vertex AI agent platform (consumes this engine via A2A)

## License

Licensed under the [Apache License 2.0](LICENSE).
