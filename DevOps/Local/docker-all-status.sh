#!/usr/bin/env bash
# Report the status of every expected local infrastructure container.
set -euo pipefail

EXPECTED=(
  "ws-postgres"
  "ws-airflow-scheduler"
  "ws-airflow-webserver"
  "ws-airflow-triggerer"
  "ws-kafka"
  "ws-prometheus"
  "ws-grafana"
  "ws-elasticsearch"
  "ws-kibana"
  "ws-mlflow"
)

echo "▶ Infrastructure status:"
printf "  %-28s  %-10s  %s\n" "CONTAINER" "STATE" "PORTS"
printf "  %-28s  %-10s  %s\n" "---------" "-----" "-----"

for name in "${EXPECTED[@]}"; do
  info=$(docker ps --filter "name=^/${name}$" --format "{{.State}}|{{.Ports}}" 2>/dev/null || true)
  if [ -z "$info" ]; then
    printf "  %-28s  %-10s  %s\n" "$name" "DOWN" "-"
  else
    state="${info%%|*}"
    ports="${info#*|}"
    printf "  %-28s  %-10s  %s\n" "$name" "$state" "$ports"
  fi
done

echo ""
echo "▶ Docker network:"
docker network inspect wealthsignal-net --format '  {{.Name}} ({{len .Containers}} containers attached)' 2>/dev/null || echo "  wealthsignal-net: MISSING"
