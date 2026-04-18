#!/usr/bin/env bash
# Report status of each Angular portal dev server.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

check() {
  local name="$1"
  local port="$2"
  local url="http://localhost:$port"

  if lsof -ti:"$port" >/dev/null 2>&1; then
    local pid
    pid=$(lsof -ti:"$port")
    local http="unknown"
    if command -v curl >/dev/null 2>&1; then
      http=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$url" || echo "compiling")
    fi
    printf "  %-18s  RUNNING  port=%s  pid=%s  http=%s\n" "$name" "$port" "$pid" "$http"
  else
    printf "  %-18s  DOWN     port=%s\n" "$name" "$port"
  fi
}

echo "▶ Portals status:"
check admin_portal     4201
check customer_portal  4202
