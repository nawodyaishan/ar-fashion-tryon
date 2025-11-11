#!/bin/bash
set -euo pipefail

# Install MMPose dependencies using mim (handles pre-built wheels)
# This avoids compilation issues on Railway

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

log_info "Installing MMPose dependencies with pre-built wheels..."

# Install mmcv using mim (avoids source compilation)
log_info "Installing mmcv via mim..."
mim install "mmcv>=2.0.0,<2.3.0" || {
    log_warn "mim install failed, trying pip with specific version..."
    pip install mmcv==2.1.0 -f https://download.openmmlab.com/mmcv/dist/cpu/torch2.0/index.html
}

log_info "✓ MMPose dependencies installed successfully"
