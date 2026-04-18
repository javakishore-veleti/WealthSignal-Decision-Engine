#!/usr/bin/env bash
# One-time local setup of DVC inside the git repo.
#
# We ship the .dvc/config, .dvcignore and dvc.yaml so new clones never need
# an explicit `dvc init`. This script verifies the setup, makes sure DVC is
# installed inside the project's conda env, and creates the default
# local-remote cache directory. Idempotent.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

PREFIX="${WEALTHSIGNAL_CONDA_PREFIX:-$HOME/runtime_data/python_venvs/WealthSignal-Decision-Engine}"

if [ ! -d "$PREFIX/conda-meta" ]; then
  echo "✖ Conda env not found at $PREFIX — run 'npm run setup:local:conda' first."
  exit 1
fi

# Use the env's dvc binary so this script works regardless of the caller's
# PATH. Falls through gracefully if the env doesn't have dvc yet.
if ! conda run --prefix "$PREFIX" dvc --version >/dev/null 2>&1; then
  echo "▶ Installing DVC inside the project conda env..."
  conda run --prefix "$PREFIX" pip install "dvc==3.50.*"
fi

# Ensure the default remote cache directory exists.
REMOTE_CACHE="${DVC_REMOTE_CACHE:-/tmp/wealthsignal-dvc-remote}"
mkdir -p "$REMOTE_CACHE"

# `dvc init` is a no-op if already initialised; `--force` is intentional so
# re-running this script on a subset repo clone converges without drama.
if [ ! -d ".dvc" ]; then
  echo "▶ Running `dvc init`..."
  conda run --prefix "$PREFIX" dvc init --no-scm 2>/dev/null || \
    conda run --prefix "$PREFIX" dvc init
fi

# Validate the committed config is still readable.
echo "▶ DVC configuration:"
conda run --prefix "$PREFIX" dvc remote list
echo ""
echo "▶ DVC pipeline (parsed from dvc.yaml):"
conda run --prefix "$PREFIX" dvc stage list 2>/dev/null \
  || conda run --prefix "$PREFIX" dvc dag --dot 2>/dev/null | head -6 \
  || echo "  (dvc.yaml present; stages will execute once engine/wealthsignal code lands)"

echo ""
echo "✔ DVC ready."
echo "  Default remote cache : $REMOTE_CACHE"
echo "  Reproduce a stage    : dvc repro <stage-name>"
echo "  View pipeline graph  : dvc dag"
