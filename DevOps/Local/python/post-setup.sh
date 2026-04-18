#!/usr/bin/env bash
# Printed after `npm run setup:local:all` — tells the user exactly what to
# do next. Activation itself cannot happen inside this script because it
# runs in an npm subshell; the user has to source the activate file in
# their own shell.
set -euo pipefail

PREFIX="${WEALTHSIGNAL_CONDA_PREFIX:-$HOME/runtime_data/python_venvs/WealthSignal-Decision-Engine}"

cat <<EOF

════════════════════════════════════════════════════════════════════════
  ✔ Setup complete.
════════════════════════════════════════════════════════════════════════

  Conda env  :  $PREFIX
  Repo       :  $(pwd)

  Activate this shell:
      source DevOps/Local/python/activate.sh

  Deactivate later:
      source DevOps/Local/python/deactivate.sh

  Start the full stack (infra + middleware + portals):
      npm run run:local:all

  Inspect status:
      npm run run:local:status

  Tear everything down:
      npm run run:local:shutdown

════════════════════════════════════════════════════════════════════════
EOF
