#!/usr/bin/env bash
# SOURCE this file to deactivate the project's conda env:
#
#     source DevOps/Local/python/deactivate.sh

if ! command -v conda >/dev/null 2>&1; then
  echo "conda not on PATH — nothing to deactivate."
  return 0 2>/dev/null || exit 0
fi

eval "$(conda shell.bash hook)"
conda deactivate

echo "✔ Deactivated."
