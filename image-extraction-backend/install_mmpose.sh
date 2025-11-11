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

# IMPORTANT: DO NOT use PIP_ONLY_BINARY as it's too restrictive
# Instead, install mmcv directly from OpenMMLab's wheel repository

# Install mmcv directly from OpenMMLab (skipping mim to avoid issues)
log_info "Installing mmcv from OpenMMLab wheel repository..."
log_info "Platform: linux, CPU-only, PyTorch 2.x, NumPy 1.x"

# Try installing mmcv with explicit platform wheel
pip install --no-cache-dir mmcv==2.1.0 -f https://download.openmmlab.com/mmcv/dist/cpu/torch2.0/index.html 2>&1 | tee /tmp/mmcv_install.log

INSTALL_STATUS=$?

if [ $INSTALL_STATUS -ne 0 ]; then
    log_warn "Direct mmcv install failed, trying mim as fallback..."
    mim install "mmcv==2.1.0" 2>&1 | tee -a /tmp/mmcv_install.log
fi

# Verify NumPy version hasn't been upgraded
log_info "Checking NumPy version after mmcv installation..."
NUMPY_VERSION=$(python -c "import numpy; print(numpy.__version__)")
log_info "Current NumPy version: $NUMPY_VERSION"

if [[ "$NUMPY_VERSION" == 2.* ]]; then
    log_warn "⚠ NumPy was upgraded to 2.x! Downgrading to 1.26.4..."
    pip install --force-reinstall "numpy<2.0.0" 2>&1 | tee -a /tmp/mmcv_install.log
    log_info "NumPy downgraded to: $(python -c 'import numpy; print(numpy.__version__)')"
fi

# Verify mmcv was installed successfully with detailed error output
log_info "Verifying mmcv installation..."
if python -c "import mmcv; print(f'✓ mmcv {mmcv.__version__} loaded successfully')" 2>&1 | tee -a /tmp/mmcv_install.log; then
    log_info "✓ mmcv installed and verified successfully"

    # Additional verification: check NumPy compatibility
    python -c "import numpy; print(f'NumPy version: {numpy.__version__}, dtype size: {numpy.dtype(numpy.float64).itemsize}')" 2>&1 | tee -a /tmp/mmcv_install.log
else
    log_warn "⚠ mmcv import failed - checking error details..."
    python -c "import mmcv" 2>&1 | tee -a /tmp/mmcv_install.log || true
    log_warn "Full install log saved to /tmp/mmcv_install.log"
    log_warn "Keypoint detection will not be available"
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
