#!/usr/bin/env bash
set -euo pipefail

# In Lefthook 2.1.15 this flag also disables implicit unstaged-change stashing.
# Checks read the Git index directly and never need to hide working changes.
if [ "${1:-}" = run ]; then
  exec lefthook "$@" --no-stage-fixed
fi
exec lefthook "$@"
