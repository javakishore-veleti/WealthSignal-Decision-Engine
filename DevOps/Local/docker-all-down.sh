#!/usr/bin/env bash
# Tear down the local infrastructure stack in the reverse order of bring-up.
# Pass --volumes (or -v) to also remove named volumes.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

DOWN_FLAGS=()
for arg in "$@"; do
  case "$arg" in
    -v|--volumes) DOWN_FLAGS+=("-v") ;;
  esac
done

echo "▶ Stopping MLflow..."
docker compose -f mlflow/docker-compose.yml down ${DOWN_FLAGS[@]+"${DOWN_FLAGS[@]}"} || true

echo "▶ Stopping Observability..."
docker compose -f Observability/docker-compose.yml down ${DOWN_FLAGS[@]+"${DOWN_FLAGS[@]}"} || true

echo "▶ Stopping Airflow..."
docker compose -f airflow/docker-compose.yml down ${DOWN_FLAGS[@]+"${DOWN_FLAGS[@]}"} || true

echo "▶ Stopping Kafka..."
docker compose -f kafka/docker-compose.yml down ${DOWN_FLAGS[@]+"${DOWN_FLAGS[@]}"} || true

echo "▶ Stopping Postgres..."
docker compose -f postgres/docker-compose.yml down ${DOWN_FLAGS[@]+"${DOWN_FLAGS[@]}"} || true

if [ "${1:-}" = "--prune-network" ]; then
  docker network rm wealthsignal-net 2>/dev/null || true
  echo "▶ Removed shared network wealthsignal-net."
fi

echo "✔ All infrastructure stopped."
