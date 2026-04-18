#!/usr/bin/env bash
# Idempotent Airflow initialisation: ensures the shared Postgres has the
# 'airflow' schema, runs Airflow DB migrations, and creates the admin user.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "▶ Airflow init — ensuring Postgres is up..."
docker compose -f ../postgres/docker-compose.yml up -d
until docker exec ws-postgres pg_isready -U wealthsignal -d wealthsignal >/dev/null 2>&1; do
  sleep 1
done

echo "▶ Running Airflow DB migration + admin user bootstrap..."
docker compose -f docker-compose.yml run --rm airflow-init

echo "✔ Airflow initialised. Login: admin / admin at http://localhost:8080"
