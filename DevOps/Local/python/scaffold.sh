#!/usr/bin/env bash
# Create (or refresh) the engine/wealthsignal/ package layout. Idempotent —
# never overwrites existing files, only creates missing directories and
# __init__.py placeholders.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

PKG=engine/wealthsignal
SUBDIRS=(config data models training serving utils tracking)

echo "▶ Scaffolding $PKG/ ..."

mkdir -p "$PKG"
[ -f "$PKG/__init__.py" ] || cat > "$PKG/__init__.py" <<'PY'
"""WealthSignal — ML core imported by Airflow DAGs and (optionally) middleware."""
__version__ = "0.1.0"
PY

for sub in "${SUBDIRS[@]}"; do
  mkdir -p "$PKG/$sub"
  init="$PKG/$sub/__init__.py"
  if [ ! -f "$init" ]; then
    case "$sub" in
      config)   desc="Hydra experiment configuration." ;;
      data)     desc="Datasets, loaders, feature engineering." ;;
      models)   desc="PyTorch nn.Module definitions (classifier, segmentation, LSTM, RL policy)." ;;
      training) desc="Training loops, Optuna HPO, callbacks." ;;
      serving)  desc="Inference helpers for middleware FastAPI services." ;;
      utils)    desc="Shared helpers (logging, seeds, device selection)." ;;
      tracking) desc="MLflow helpers and experiment namespacing." ;;
    esac
    printf '"""%s"""\n' "$desc" > "$init"
    echo "  created $init"
  fi
done

echo "✔ Scaffold ready."
