#!/usr/bin/env bash
# Report status of each middleware FastAPI service by port.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

check() {
  local name="$1"
  local port="$2"
  local url="http://localhost:$port/health"

  if lsof -ti:"$port" >/dev/null 2>&1; then
    local pid
    pid=$(lsof -ti:"$port")
    local health="unknown"
    if command -v curl >/dev/null 2>&1; then
      health=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$url" || echo "unreachable")
    fi
    printf "  %-24s  RUNNING  port=%s  pid=%s  /health=%s\n" "$name" "$port" "$pid" "$health"
  else
    printf "  %-24s  DOWN     port=%s\n" "$name" "$port"
  fi
}

echo "▶ Middleware status:"
check admin_api            8001
check customer_api         8002
check data_management_api  8003
check product_catalog_api  8004
