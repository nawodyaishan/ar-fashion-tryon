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

# IMPORTANT: Force wheel-only installation to prevent compilation
# Railway does not have gcc/g++ compilers
export PIP_NO_BUILD_ISOLATION=1
export PIP_ONLY_BINARY=:all:

# Install mmcv using mim with explicit flags to prevent source builds
log_info "Installing mmcv via mim (wheel-only, no compilation)..."
mim install "mmcv>=2.0.0,<2.3.0" --no-build-isolation 2>&1 | tee /tmp/mim_install.log || {
    log_warn "mim install failed, trying direct pip with pre-built wheel..."
    # Try specific wheel for CPU-only PyTorch 2.x
    pip install --only-binary=:all: mmcv==2.1.0 -f https://download.openmmlab.com/mmcv/dist/cpu/torch2.0/index.html || {
        log_warn "Specific version failed, trying any compatible wheel..."
        pip install --only-binary=mmcv "mmcv>=2.0.0,<2.3.0"
    }
}

# Verify mmcv was installed successfully
if python -c "import mmcv; print(f'mmcv {mmcv.__version__} loaded successfully')" 2>/dev/null; then
    log_info "✓ mmcv installed and verified successfully"
else
    log_warn "⚠ mmcv import failed - keypoint detection may not work"
fi

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
