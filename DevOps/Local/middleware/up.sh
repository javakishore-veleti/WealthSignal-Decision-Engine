#!/usr/bin/env bash
# Start all FastAPI middleware services in the background.
# PIDs and logs are kept under .local/{pids,logs}/ at the repo root.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

PID_DIR=".local/pids"
LOG_DIR=".local/logs"
mkdir -p "$PID_DIR" "$LOG_DIR"

start_service() {
  local name="$1"
  local module="$2"
  local port="$3"

  if lsof -ti:"$port" >/dev/null 2>&1; then
    echo "  [$name] already running on :$port (PID $(lsof -ti:"$port"))"
    return 0
  fi

  nohup uvicorn "$module" --reload --host 0.0.0.0 --port "$port" \
    > "$LOG_DIR/$name.log" 2>&1 &
  echo $! > "$PID_DIR/$name.pid"
  echo "  [$name] started on :$port (PID $!)  →  $LOG_DIR/$name.log"
}

echo "▶ Starting middleware services..."
start_service admin_api            "middleware.admin_api.app.main:app"            8001
start_service customer_api         "middleware.customer_api.app.main:app"         8002
start_service data_management_api  "middleware.data_management_api.app.main:app"  8003
start_service product_catalog_api  "middleware.product_catalog_api.app.main:app"  8004
echo "✔ Middleware up. Use 'npm run run:local:middleware:status' to inspect."
