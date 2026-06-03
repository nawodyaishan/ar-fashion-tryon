#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

export MODELS_DIR="${MODELS_DIR:-$PROJECT_DIR/models}"

exec bash "$SCRIPT_DIR/download_models_railway_v2.sh"
