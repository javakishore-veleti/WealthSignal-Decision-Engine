#!/usr/bin/env bash
# Create (or update) the project's conda environment at a user-scoped
# prefix path so it sits next to other per-project venvs rather than in
# conda's central envs folder.
#
# Idempotent: if the env already exists, `conda env update` refreshes
# dependencies without recreating.
set -euo pipefail

PREFIX="${WEALTHSIGNAL_CONDA_PREFIX:-$HOME/runtime_data/python_venvs/WealthSignal-Decision-Engine}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ENV_FILE="$REPO_ROOT/environment.yml"

if ! command -v conda >/dev/null 2>&1; then
  echo "✖ conda not found on PATH."
  echo "  Install Miniforge or Miniconda first: https://conda-forge.org/miniforge/"
  exit 1
fi

mkdir -p "$(dirname "$PREFIX")"

if [ -d "$PREFIX/conda-meta" ]; then
  echo "▶ Existing env detected at $PREFIX — refreshing..."
  conda env update --prefix "$PREFIX" --file "$ENV_FILE" --prune
else
  echo "▶ Creating new conda env at $PREFIX ..."
  conda env create --prefix "$PREFIX" --file "$ENV_FILE"
fi

echo ""
echo "✔ Conda env ready at $PREFIX"
echo ""
echo "  Activate:    source DevOps/Local/python/activate.sh"
echo "  Deactivate:  source DevOps/Local/python/deactivate.sh"
echo "  Remove:      npm run env:remove"
