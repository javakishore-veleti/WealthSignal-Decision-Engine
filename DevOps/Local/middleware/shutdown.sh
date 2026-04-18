#!/usr/bin/env bash
# Gracefully stop every middleware FastAPI service.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

PID_DIR=".local/pids"

stop_service() {
  local name="$1"
  local port="$2"
  local pid_file="$PID_DIR/$name.pid"

  if [ -f "$pid_file" ]; then
    local pid
    pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" && echo "  [$name] sent SIGTERM to PID $pid"
    fi
    rm -f "$pid_file"
  fi

  # Belt-and-braces: also kill whatever else is on the port (uvicorn
  # --reload spawns multiple listeners; stale PIDs from prior sessions
  # can linger). `xargs -r` is a no-op when the pipe is empty.
  if lsof -ti:"$port" >/dev/null 2>&1; then
    local port_pids
    port_pids=$(lsof -ti:"$port" | paste -sd "," -)
    lsof -ti:"$port" | xargs -r kill 2>/dev/null || true
    echo "  [$name] cleaned up port :$port (PIDs $port_pids)"
  fi
}

echo "▶ Shutting down middleware services..."
stop_service admin_api            8001
stop_service customer_api         8002
stop_service data_management_api  8003
stop_service product_catalog_api  8004
echo "✔ Middleware shutdown complete."
