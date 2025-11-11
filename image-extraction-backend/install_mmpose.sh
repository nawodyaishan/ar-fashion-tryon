#!/bin/bash
set -euo pipefail

# Install MMPose dependencies using mim (handles pre-built wheels)
# This avoids compilation issues on Railway

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

log_info "Installing complete MMPose ecosystem with NumPy 1.x compatibility..."
log_info "This installs: openmim, mmengine, mmcv, mmpose, mmdet"

# Step 1: Verify NumPy is at 1.x BEFORE we start
INITIAL_NUMPY=$(python -c "import numpy; print(numpy.__version__)")
log_info "Initial NumPy version: $INITIAL_NUMPY"

# Step 2: Install openmim (package manager for OpenMMLab)
log_info "Installing openmim..."
pip install openmim

# Step 3: Install mmengine with strict NumPy 1.x requirement
log_info "Installing mmengine with NumPy 1.x constraint..."
pip install "mmengine>=0.8.0,<0.11.0" "numpy<2.0.0"

# Step 4: Install mmcv directly from OpenMMLab wheels (NumPy 1.x compatible)
log_info "Installing mmcv from OpenMMLab wheel repository..."
log_info "Platform: linux, CPU-only, PyTorch 2.x, NumPy 1.x"
pip install --no-cache-dir mmcv==2.1.0 \
  -f https://download.openmmlab.com/mmcv/dist/cpu/torch2.0/index.html \
  "numpy<2.0.0"

INSTALL_STATUS=$?
if [ $INSTALL_STATUS -ne 0 ]; then
    log_warn "Direct mmcv install failed, trying mim as fallback..."
    mim install "mmcv==2.1.0"
fi

# Step 5: CRITICAL - Check if NumPy was upgraded
log_info "Checking NumPy version after mmcv installation..."
NUMPY_AFTER_MMCV=$(python -c "import numpy; print(numpy.__version__)")
log_info "NumPy version after mmcv: $NUMPY_AFTER_MMCV"

if [[ "$NUMPY_AFTER_MMCV" == 2.* ]]; then
    log_warn "⚠ CRITICAL: NumPy was upgraded to 2.x! Forcing downgrade..."
    pip install --force-reinstall "numpy>=1.20.0,<2.0.0"
    NUMPY_FIXED=$(python -c 'import numpy; print(numpy.__version__)')
    log_info "NumPy forcefully downgraded to: $NUMPY_FIXED"
fi

# Step 6: Install mmpose and mmdet with NumPy constraints
log_info "Installing mmpose and mmdet..."
pip install "mmpose>=1.0.0,<1.4.0" "mmdet>=3.0.0,<3.4.0" "numpy<2.0.0"

# Step 7: FINAL NumPy check
FINAL_NUMPY=$(python -c "import numpy; print(numpy.__version__)")
log_info "Final NumPy version: $FINAL_NUMPY"

if [[ "$FINAL_NUMPY" == 2.* ]]; then
    log_warn "⚠ FATAL: NumPy is still at 2.x after all installations!"
    log_warn "Performing aggressive downgrade..."
    pip uninstall -y numpy
    pip install "numpy==1.26.4"
    log_info "Final NumPy: $(python -c 'import numpy; print(numpy.__version__)')"
fi

# Step 8: Check for multiple NumPy installations
log_info "Checking for multiple NumPy installations..."
pip list | grep numpy || true

# Step 9: Verify mmcv loads correctly
log_info "Verifying mmcv installation..."
if python -c "import mmcv; print(f'✓ mmcv {mmcv.__version__} loaded successfully')"; then
    log_info "✓ mmcv installed and verified successfully"

    # Detailed verification
    python -c "import numpy; print(f'NumPy version: {numpy.__version__}, dtype size: {numpy.dtype(numpy.float64).itemsize}')"
    python -c "import numpy; import sys; print(f'NumPy location: {numpy.__file__}')"
    python -c "import mmengine; print(f'mmengine version: {mmengine.__version__}')"
    python -c "import mmpose; print(f'mmpose version: {mmpose.__version__}')"
    python -c "import mmdet; print(f'mmdet version: {mmdet.__version__}')"
else
    log_warn "⚠ mmcv import failed - checking error details..."
    python -c "import mmcv" || true
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
