#!/usr/bin/env bash
# Remove the project's conda env entirely. Safe to re-run.
set -euo pipefail

PREFIX="${WEALTHSIGNAL_CONDA_PREFIX:-$HOME/runtime_data/python_venvs/WealthSignal-Decision-Engine}"

if [ -d "$PREFIX/conda-meta" ]; then
  echo "▶ Removing conda env at $PREFIX ..."
  conda env remove --prefix "$PREFIX" -y
  echo "✔ Removed."
else
  echo "Nothing to remove — no env at $PREFIX."
fi
