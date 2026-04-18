#!/usr/bin/env bash
# SOURCE this file from the repo root to activate the project's conda env:
#
#     source DevOps/Local/python/activate.sh
#
# (Do NOT execute it — activation must happen in the current shell.)

PREFIX="${WEALTHSIGNAL_CONDA_PREFIX:-$HOME/runtime_data/python_venvs/WealthSignal-Decision-Engine}"

if ! command -v conda >/dev/null 2>&1; then
  echo "✖ conda not found on PATH."
  return 1 2>/dev/null || exit 1
fi

if [ ! -d "$PREFIX/conda-meta" ]; then
  echo "✖ conda env not found at $PREFIX"
  echo "  Run: npm run setup:local:conda"
  return 1 2>/dev/null || exit 1
fi

# Make `conda activate` available in a fresh subshell.
eval "$(conda shell.bash hook)"
conda activate "$PREFIX"

echo "✔ Activated: $PREFIX"
echo "  python   → $(command -v python)"
echo "  pip      → $(command -v pip)"
