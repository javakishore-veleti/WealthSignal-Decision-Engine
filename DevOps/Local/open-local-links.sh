#!/usr/bin/env bash
# Open README_Local_Links.html in the user's default browser.
#
# Invoked as the final step of `npm run run:local:all`. Because the npm
# chain uses `npm-run-all -s` (serial with fail-fast), this script only
# executes when every prior step succeeded — docker infra up, middleware
# running, portals running. Any failure short-circuits before we get here.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FILE="$REPO_ROOT/README_Local_Links.html"

if [ ! -f "$FILE" ]; then
  echo "  ⚠ README_Local_Links.html not found at $FILE"
  exit 0
fi

URL="file://$FILE"

case "$(uname -s)" in
  Darwin)
    open "$FILE" >/dev/null 2>&1 || open -a "Safari" "$FILE" || true
    ;;
  Linux)
    if command -v xdg-open >/dev/null 2>&1; then
      xdg-open "$FILE" >/dev/null 2>&1 || true
    else
      echo "  Open manually: $URL"
    fi
    ;;
  MINGW*|MSYS*|CYGWIN*)
    start "" "$FILE" || true
    ;;
  *)
    echo "  Open manually: $URL"
    ;;
esac

echo "▶ Opened $FILE"
