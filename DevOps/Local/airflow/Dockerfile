# WealthSignal Airflow image — extends apache/airflow:2.9.3-python3.11 with
# the pip packages our DAGs actually import.
#
# Why a custom image instead of _PIP_ADDITIONAL_REQUIREMENTS:
#   Airflow's _PIP_ADDITIONAL_REQUIREMENTS env var reruns `pip install` on
#   EVERY container start, across scheduler + webserver + triggerer (+ worker
#   in CeleryExecutor). With heavier deps this pushes cold-boot from ~10 s
#   to 10+ minutes — and on flaky networks it can hang. A baked image is
#   built once (~2-3 min the first time, cached thereafter) and every
#   subsequent `docker compose up -d` starts in seconds.
#
# Deps rationale:
#   - mlflow-skinny 2.13.* — the tracking-client slice of MLflow (no sklearn,
#     no scipy, no pyarrow, no matplotlib). It's all create_mlflow_experiments
#     needs (MlflowClient.create_experiment + tag management) and cuts the
#     pip install from ~3 min to ~30 s. When a training DAG that logs models
#     lands, swap this line to full `mlflow==2.13.*` — the API surface is
#     identical for every call we currently make.
#   (apache-airflow-providers-postgres + psycopg2 already ship in the base
#    image since Airflow 2.9, so they aren't repeated here.)

FROM apache/airflow:2.9.3-python3.11

# Run pip as the 'airflow' user so installed packages land in the user's
# site-packages — the default Airflow security posture.
USER airflow

RUN pip install --no-cache-dir "mlflow-skinny==2.13.*"

# Future additions go here — add package, commit, `npm run build:docker:airflow`.
# Examples held off until a DAG actually imports them:
#   mlflow==2.13.*               # upgrade from skinny when training DAGs log models
#   torch==2.3.*                 # needed once training DAGs land
#   great-expectations==0.18.*   # needed once data-quality DAGs land
