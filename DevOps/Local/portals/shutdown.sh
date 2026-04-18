#!/usr/bin/env bash
# Gracefully stop every Angular portal dev server.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

PID_DIR=".local/pids"

stop_portal() {
  local name="$1"
  local port="$2"
  local pid_file="$PID_DIR/$name.pid"

  if [ -f "$pid_file" ]; then
    local pid
    pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      # ng serve spawns child processes — kill the process group.
      kill -- -"$(ps -o pgid= "$pid" | tr -d ' ')" 2>/dev/null \
        || kill "$pid" 2>/dev/null \
        || true
      echo "  [$name] stopped PID $pid"
    fi
    rm -f "$pid_file"
  fi

  local port_pid
  port_pid=$(lsof -ti:"$port" 2>/dev/null || true)
  if [ -n "$port_pid" ]; then
    kill "$port_pid" 2>/dev/null || true
    echo "  [$name] cleaned up port :$port (PID $port_pid)"
  fi
}

echo "▶ Shutting down Angular portals..."
stop_portal admin_portal     4201
stop_portal customer_portal  4202
echo "✔ Portals shutdown complete."
