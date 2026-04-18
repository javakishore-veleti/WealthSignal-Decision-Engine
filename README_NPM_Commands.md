# NPM Commands Reference

Every orchestration command in this repo lives in the root [`package.json`](package.json). This file groups them by **when** you use them so a new contributor can get productive in minutes.

> Activation must happen in your own shell (npm cannot modify the parent shell). Whenever a command begins with `source …`, copy-paste and run it yourself.

---

## 🆕 First-time setup (run once per machine)

One command bootstraps everything: conda env, package scaffold, Python deps, portal deps, pre-commit hooks, and a next-step cheat-sheet banner.

| Command | What it does |
|---|---|
| `npm run setup:local:all` | **Full bootstrap.** Chains all the steps below in order. |
| `npm run setup:local:conda` | Creates (or updates) the conda env at `$HOME/runtime_data/python_venvs/WealthSignal-Decision-Engine`. Idempotent. |
| `npm run setup:local:scaffold` | Creates `engine/wealthsignal/{config,data,models,training,serving,utils,tracking}/__init__.py`. Never overwrites existing files. |
| `npm run setup:local:python` | `pip install -e .[dev,db,seed]` inside the conda env. |
| `npm run setup:local:portals` | Installs npm workspace dependencies for `admin_portal` + `customer_portal`. |
| `npm run setup:local:precommit` | Wires `pre-commit` hooks for ruff + black. |
| `npm run setup:local:airflow` | Runs the Airflow DB migration + admin-user bootstrap (needs Postgres up). |
| `npm run setup:local:post` | Prints the final banner with next-step commands. |

**Right after setup finishes:**

```bash
source DevOps/Local/python/activate.sh   # activate the conda env in THIS shell
```

---

## 🔄 Daily driver commands

Things you run every session.

| Command | What it does |
|---|---|
| `source DevOps/Local/python/activate.sh` | Activate the project's conda env (must be sourced, not run). |
| `source DevOps/Local/python/deactivate.sh` | Deactivate when done. |
| `npm run env:activate` | Prints the source command above (useful if you forget the path). |
| `npm run env:deactivate` | Prints the deactivation command. |
| `npm run run:local:all` | Bring up the full stack — Docker infra → middleware → portals. |
| `npm run run:local:status` | One-line health per service across every tier. |
| `npm run run:local:shutdown` | Reverse-order tear-down — portals → middleware → Docker. |

---

## 🧪 Ad-hoc commands

Use when you need to control individual tiers, run a single service, or execute one-off tasks.

### Docker infrastructure

| Command | Target |
|---|---|
| `npm run run:local:docker:all` | All infra containers in order (network → Postgres → Kafka → Airflow → Observability → MLflow). |
| `npm run run:local:docker:status` | Per-container state + port mapping. |
| `npm run run:local:docker:shutdown` | Stop every infra container. |
| `npm run run:local:docker:airflow` | Airflow scheduler + webserver + triggerer only. |
| `npm run run:local:docker:postgres` | Shared Postgres only. |
| `npm run run:local:docker:kafka` | Kafka + Kafka UI only. |
| `npm run run:local:docker:observability` | Prometheus + Grafana + Elasticsearch + Kibana. |
| `npm run run:local:docker:mlflow` | MLflow tracking server only. |

### Middleware (FastAPI, ports 8001–8004)

| Command | Target |
|---|---|
| `npm run run:local:middleware:all` | All four APIs in background (logs in `.local/logs/`). |
| `npm run run:local:middleware:status` | Per-API `/health` probe. |
| `npm run run:local:middleware:shutdown` | Stop all four APIs. |
| `npm run run:local:middleware:admin` | `admin_api` foreground on `:8001`. |
| `npm run run:local:middleware:customer` | `customer_api` foreground on `:8002`. |
| `npm run run:local:middleware:data-management` | `data_management_api` foreground on `:8003`. |
| `npm run run:local:middleware:product-catalog` | `product_catalog_api` foreground on `:8004`. |

### Portals (Angular, ports 4201–4202)

| Command | Target |
|---|---|
| `npm run run:local:portals:all` | Both portals in background. |
| `npm run run:local:portals:status` | Port + HTTP probe per portal. |
| `npm run run:local:portals:shutdown` | Stop both portals. |
| `npm run run:local:portals:admin` | `admin_portal` foreground on `:4201`. |
| `npm run run:local:portals:customer` | `customer_portal` foreground on `:4202`. |

### Data ops

| Command | Target |
|---|---|
| `npm run seed:products` | Regenerates `data/product_catalog/products_seed.json` (10,000 products). |

### Quality & tests

| Command | Target |
|---|---|
| `npm run lint:python` | `ruff check .` + `black --check .`. |
| `npm run lint:portals` | Angular lint across workspaces. |
| `npm run lint:all` | Both of the above. |
| `npm run format:python` | Auto-fix: `ruff --fix` + `black`. |
| `npm run test:python` | Pytest over `engine/` + `middleware/` (excluding DAG tests). |
| `npm run test:portals` | Jest tests across portal workspaces. |
| `npm run test:airflow` | Pytest on `tests/airflow/` (DAG parse + import checks). |
| `npm run test:all` | All three test suites in sequence. |

### Build

| Command | Target |
|---|---|
| `npm run build:portals` | Production Angular builds (both portals). |

### Conda env management

| Command | Target |
|---|---|
| `npm run env:path` | Prints the conda-env prefix path. |
| `npm run env:remove` | Delete the conda env entirely. |
| `npm run env:recreate` | Remove + recreate + pip-install in one shot. |

---

## Typical workflows

### Brand-new machine

```bash
git clone git@github.com:javakishore-veleti/WealthSignal-Decision-Engine.git
cd WealthSignal-Decision-Engine

npm run setup:local:all                   # full bootstrap (~5-10 min first time)
source DevOps/Local/python/activate.sh    # activate the env in this shell
npm run run:local:all                     # start every tier
```

### Starting a working session

```bash
source DevOps/Local/python/activate.sh
npm run run:local:all
# … work …
npm run run:local:shutdown
source DevOps/Local/python/deactivate.sh
```

### Iterating on a single middleware service

```bash
npm run run:local:docker:postgres          # only what the service needs
npm run run:local:middleware:product-catalog  # foreground reload on file change
```

### Resetting a broken env

```bash
npm run env:recreate                       # remove + recreate conda env + reinstall deps
```

---

## Pointers

- **Root `package.json`** is operational only — no runtime JavaScript lives at the root.
- **Angular portals** are managed as npm workspaces under `portals/`.
- **Conda env prefix** is overridable via `$WEALTHSIGNAL_CONDA_PREFIX` if the default `$HOME/runtime_data/python_venvs/WealthSignal-Decision-Engine` clashes with your setup.
- **Background processes** (middleware + portal `*:all` scripts) write PIDs to `.local/pids/` and logs to `.local/logs/` — both gitignored.
- **Database migrations** are Alembic, triggered manually via the `Database Migration` GitHub Actions workflow (`target_env`: local / aws / azure / gcp). See [`db/README.md`](db/README.md).

## Related docs

- [`README.md`](README.md) — service architecture, design decisions, quick start
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — monorepo conventions, branch naming, code style
- [`db/README.md`](db/README.md) — database migration workflow
