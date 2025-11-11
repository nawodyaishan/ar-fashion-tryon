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

# Fix OpenCV conflict: MMPose dependencies may install opencv-python (with GUI)
# Railway needs opencv-python-headless (no GUI/OpenGL dependencies)
log_info "Fixing OpenCV dependencies for headless environment..."
if pip show opencv-python &>/dev/null; then
    log_warn "Found opencv-python (with GUI support), uninstalling..."
    pip uninstall -y opencv-python
    log_info "Ensuring opencv-python-headless is installed..."
    pip install --force-reinstall opencv-python-headless
else
    log_info "opencv-python not found, opencv-python-headless is already in use"
fi

log_info "✓ MMPose dependencies installed successfully"
