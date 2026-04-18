#!/usr/bin/env bash
# Nuclear recovery for an Airflow metadata DB that's in a half-migrated
# state. Symptoms that call for this:
#   - scheduler in a crash loop with
#       airflow.exceptions.AirflowException: No log_template entry found
#       for ID None
#   - `airflow db migrate` crashes with
#       relation "airflow.serialized_dag" does not exist
#     (legacy AIRFLOW__CORE__SQL_ALCHEMY_SCHEMA leftover — Airflow now
#     owns its own database, not a schema on the shared DB)
#   - tasks stuck queued with 'scheduler heartbeat missing' banner in UI
#   - any situation where you've changed Airflow version or wiped Postgres
#     volume and Airflow still loads an old schema state
#
# What it does:
#   1. Stops all Airflow containers (scheduler/webserver/triggerer/init)
#      and removes the init container specifically — docker-compose's
#      `depends_on: service_completed_successfully` will otherwise re-use
#      a cached successful-but-broken init.
#   2. Waits for Postgres (may not be required but makes the script
#      self-contained).
#   3. Drops and recreates the `airflow` DATABASE (not schema) — guaranteed
#      clean slate for alembic. Also drops the legacy `airflow` schema on
#      the shared `wealthsignal` DB if it's present from an older layout.
#   4. Runs the init container foreground so migration output is visible
#      and failures are loud. Uses --rm so the container is removed after
#      (no cached 'service_completed_successfully' state to trip over).
#   5. Verifies the log_template seed row exists. If it's empty, escalates
#      to `airflow db reset -y` which is documented as the most thorough
#      recovery.
#   6. Starts scheduler + webserver + triggerer.
#   7. Waits for scheduler to come online, prints final status.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

AIRFLOW_COMPOSE=DevOps/Local/airflow/docker-compose.yml
POSTGRES_COMPOSE=DevOps/Local/postgres/docker-compose.yml

echo "━━━ 1. Stop Airflow, remove orphan init container ━━━━━━━━━━━━━"
docker compose -f "$AIRFLOW_COMPOSE" down --remove-orphans

echo "━━━ 2. Ensure Postgres is running and accepting connections ━━━"
docker compose -f "$POSTGRES_COMPOSE" up -d
for _ in $(seq 1 30); do
  if docker exec ws-postgres pg_isready -U wealthsignal -d wealthsignal >/dev/null 2>&1; then
    break
  fi
  echo "  …waiting for Postgres"
  sleep 2
done

echo "━━━ 3. Drop and recreate airflow metadata database ━━━━━━━━━━━━"
# Force-terminate any lingering backend connections to the airflow DB
# so DROP DATABASE doesn't error out with 'database is being accessed'.
docker exec ws-postgres psql -U wealthsignal -d postgres -q -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'airflow' AND pid <> pg_backend_pid();" >/dev/null
docker exec ws-postgres psql -U wealthsignal -d postgres -q -c \
  "DROP DATABASE IF EXISTS airflow;"
docker exec ws-postgres psql -U wealthsignal -d postgres -q -c \
  "CREATE DATABASE airflow OWNER wealthsignal;"
echo "  airflow database recreated"

# Clean up leftover `airflow` schema on the shared wealthsignal DB from
# the earlier dedicated-schema layout. Harmless if it isn't there.
docker exec ws-postgres psql -U wealthsignal -d wealthsignal -q -c \
  "DROP SCHEMA IF EXISTS airflow CASCADE;" >/dev/null
echo "  legacy airflow schema on wealthsignal DB cleared"

echo "━━━ 4. Run airflow-init (migrate + admin user) ━━━━━━━━━━━━━━━"
docker compose -f "$AIRFLOW_COMPOSE" run --rm airflow-init

echo ""
echo "━━━ 5. Verify log_template seed row was created ━━━━━━━━━━━━━━━"
ROWS=$(docker exec ws-postgres psql -U wealthsignal -d airflow -tAc \
       "SELECT COUNT(*) FROM public.log_template;")
echo "  log_template row count: $ROWS"

if [ "$ROWS" = "0" ]; then
  echo ""
  echo "  ⚠ log_template is empty after migrate — falling back to"
  echo "     'airflow db reset -y' which is a more thorough recovery."
  docker compose -f "$AIRFLOW_COMPOSE" run --rm airflow-init \
      bash -lc "airflow db reset -y && airflow users create \
        --role Admin --username admin --password admin \
        --firstname Kishore --lastname Veleti --email admin@wealthsignal.local || true"

  ROWS=$(docker exec ws-postgres psql -U wealthsignal -d airflow -tAc \
         "SELECT COUNT(*) FROM public.log_template;")
  echo "  log_template rows after reset: $ROWS"
fi

echo "━━━ 6. Start Airflow containers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker compose -f "$AIRFLOW_COMPOSE" up -d

echo "━━━ 7. Wait for scheduler to come online (~45 s) ━━━━━━━━━━━━━"
sleep 45
docker ps --filter name=ws-airflow --format 'table {{.Names}}\t{{.Status}}'
echo ""
echo "  Recent scheduler log:"
docker logs ws-airflow-scheduler --tail 15 2>&1 | sed 's/^/    /'

echo ""
echo "✔ Recovery complete. Re-trigger your DAG and it should run."
