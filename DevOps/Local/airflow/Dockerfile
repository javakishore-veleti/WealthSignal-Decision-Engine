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
#   - mlflow 2.13.* — used by airflow/dags/bootstrap/create_mlflow_experiments.py
#   (apache-airflow-providers-postgres + psycopg2 already ship in the base
#    image since Airflow 2.9, so they aren't repeated here.)

FROM apache/airflow:2.9.3-python3.11

# Run pip as the 'airflow' user so installed packages land in the user's
# site-packages — the default Airflow security posture.
USER airflow

RUN pip install --no-cache-dir "mlflow==2.13.*"

# Future additions go here — add package, commit, `docker compose build`.
# Examples held off until a DAG actually imports them:
#   torch==2.3.*                 # needed once training DAGs land
#   great-expectations==0.18.*   # needed once data-quality DAGs land
