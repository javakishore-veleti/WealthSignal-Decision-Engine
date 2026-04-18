#!/usr/bin/env bash
# Start all Angular portals in the background via `ng serve`.
# PIDs and logs are kept under .local/{pids,logs}/ at the repo root.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

PID_DIR=".local/pids"
LOG_DIR=".local/logs"
mkdir -p "$PID_DIR" "$LOG_DIR"

start_portal() {
  local name="$1"
  local workspace="$2"
  local port="$3"

  if lsof -ti:"$port" >/dev/null 2>&1; then
    # `ng serve` spawns Node + watcher children on the same port —
    # collapse the PID list for display.
    local pids
    pids=$(lsof -ti:"$port" | paste -sd "," -)
    echo "  [$name] already running on :$port (PIDs $pids)"
    return 0
  fi

  nohup npm run start --workspace="$workspace" -- --port "$port" \
    > "$LOG_DIR/$name.log" 2>&1 &
  echo $! > "$PID_DIR/$name.pid"
  echo "  [$name] starting on :$port (PID $!)  →  $LOG_DIR/$name.log"
}

echo "▶ Starting Angular portals..."
start_portal admin_portal     portals/admin_portal     4201
start_portal customer_portal  portals/customer_portal  4202
echo "✔ Portals launching. First compile may take ~30s; use 'npm run run:local:portals:status' to check."
