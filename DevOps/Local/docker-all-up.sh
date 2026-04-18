#!/usr/bin/env bash
# Bring up the full local infrastructure stack:
#   shared network → Postgres → Airflow → Kafka → Observability
# Order matters because Airflow's metadata DB lives in the shared Postgres.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

NET="wealthsignal-net"

echo "▶ Ensuring shared docker network '$NET' exists..."
docker network inspect "$NET" >/dev/null 2>&1 || docker network create "$NET"

echo "▶ Starting Postgres (shared metadata + app schemas)..."
docker compose -f postgres/docker-compose.yml up -d

# Wait for Postgres to accept connections BEFORE starting anything that
# depends on it. Previously Airflow's migration sometimes raced Postgres
# startup, half-migrated the schema, and left the scheduler in a crash
# loop on 'No log_template entry found'.
echo "▶ Waiting for Postgres to accept connections..."
for _ in $(seq 1 30); do
  if docker exec ws-postgres pg_isready -U wealthsignal -d wealthsignal >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "▶ Starting Kafka (event bus)..."
docker compose -f kafka/docker-compose.yml up -d

echo "▶ Starting Airflow (scheduler, webserver, triggerer)..."
# Build the custom Airflow image on first boot (idempotent — Docker's layer
# cache makes subsequent runs ~instant once all deps are baked in).
if ! docker image inspect wealthsignal/airflow:2.9.3 >/dev/null 2>&1; then
  echo "  (first boot — building wealthsignal/airflow:2.9.3 image, ~2-3 min)"
  docker compose -f airflow/docker-compose.yml build
fi
docker compose -f airflow/docker-compose.yml up -d

echo "▶ Starting Observability (Prometheus + Grafana + Elasticsearch + Kibana)..."
docker compose -f Observability/docker-compose.yml up -d

echo "▶ Starting MLflow tracking server..."
docker compose -f mlflow/docker-compose.yml up -d

# ── Simulate the GitHub 'Database Migration' workflow locally ───────────────
# In cloud environments, .github/workflows/db-migrate.yml runs Alembic against
# AWS / Azure / GCP. Here we apply the same migrations against the local
# docker-compose Postgres so developer laptops converge on the same schema.
# (Postgres readiness was already waited on above.)

REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
if command -v alembic >/dev/null 2>&1 && [ -f "$REPO_ROOT/db/alembic.ini" ]; then
  echo "▶ Applying Alembic migrations (simulating db-migrate workflow)..."
  (cd "$REPO_ROOT/db" && alembic upgrade head) || {
    echo "  ⚠ Alembic upgrade failed — inspect the output above. Stack is still up."
  }
else
  echo "  ⚠ Alembic not found on PATH — skipping migrations."
  echo "    Run 'npm run setup:local:all' first, or 'pip install -e \".[db]\"' to enable migrations."
fi

echo ""
echo "✔ Stack is up. Use 'npm run run:local:docker:status' to watch readiness."
echo ""
echo "  Airflow UI   →  http://localhost:8080   (user: admin / pass: admin)"
echo "  MLflow UI    →  http://localhost:5050"
echo "  Grafana      →  http://localhost:3000   (user: admin / pass: admin)"
echo "  Prometheus   →  http://localhost:9090"
echo "  Kibana       →  http://localhost:5601"
echo "  Postgres     →  localhost:5432          (user: wealthsignal)"
echo "  Kafka        →  localhost:9092"
