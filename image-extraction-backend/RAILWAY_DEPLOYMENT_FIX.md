# Railway Deployment Fix - MMPose Installation

## Problem

The deployment was failing during the `pip install` phase with this error:

```
error: command 'gcc' failed: No such file or directory
```

**Root Cause**: The `mmcv>=2.0.0` package was trying to **compile from source** (using legacy `setup.py install`), which requires:
- C++ compiler (gcc/g++)
- CUDA development tools
- Build tools and headers

Railway's Nixpacks build environment doesn't include these compilation tools by default, causing the build to fail.

## Solution

Instead of compiling `mmcv` from source, we now use **pre-built wheels** via `mim` (OpenMMLab's package manager).

### Changes Made

1. **Updated `requirements.txt`**:
   - Removed `mmcv>=2.0.0` from pip dependencies
   - Added comment explaining mmcv is installed separately

2. **Created `install_mmpose.sh`**:
   - Installs `mmcv` using `mim` (handles pre-built wheels)
   - Falls back to specific wheel URL if mim fails
   - Avoids source compilation entirely

3. **Updated `nixpacks.toml`**:
   - Added `install_mmpose.sh` execution step
   - Runs after pip install but before model download

### Build Order (Railway)

```
1. Install base Python packages (requirements.txt)
   ├─ openmim ✓
   ├─ mmengine ✓
   ├─ mmpose ✓
   └─ mmdet ✓

2. Install mmcv via mim (install_mmpose.sh)
   └─ Uses pre-built wheel (no compilation)

3. Download TensorFlow model (download_models_railway_v2.sh)
   └─ Existing script unchanged
```

## Why This Works

### Problem with Source Compilation

When pip tries to install `mmcv` from source:
```python
# mmcv setup.py tries to compile CUDA extensions
gcc -Wno-unused-result -Wsign-compare -DNDEBUG -g -fwrapv -O3 -Wall \
  -I/opt/venv/lib/python3.10/site-packages/torch/include \
  -c ./mmcv/ops/csrc/pytorch/active_rotated_filter.cpp \
  -o build/temp.linux-x86_64-3.10/./mmcv/ops/csrc/pytorch/active_rotated_filter.o \
  -std=c++17 -DTORCH_API_INCLUDE_EXTENSION_H -DTORCH_EXTENSION_NAME=_ext

# ERROR: gcc not found
```

### Solution with Pre-built Wheels

Using `mim`:
```bash
mim install "mmcv>=2.0.0,<2.3.0"
# Downloads pre-compiled .whl file from OpenMMLab
# No compilation needed
```

Or direct wheel URL (fallback):
```bash
pip install mmcv==2.1.0 \
  -f https://download.openmmlab.com/mmcv/dist/cpu/torch2.0/index.html
```

## Testing Locally

Before pushing to Railway, test locally:

```bash
cd image-extraction-backend

# Clean environment
rm -rf /opt/venv
python -m venv /opt/venv
source /opt/venv/bin/activate

# Install in same order as Railway
pip install -r requirements.txt
bash install_mmpose.sh

# Verify mmcv installed
python -c "import mmcv; print(mmcv.__version__)"
# Should output: 2.1.0 (or similar)

# Test keypoint service
python -c "from services.keypoint_service import load_keypoint_model; load_keypoint_model()"
```

## Alternative Solutions (if this still fails)

### Option 1: Install build tools in Nixpacks

Add to `nixpacks.toml`:
```toml
[phases.setup]
nixPkgs = ["python310", "unzip", "gcc", "stdenv.cc"]
```

**Pros**: Allows source compilation
**Cons**:
- Much longer build times (5-10 minutes)
- Larger image size
- Not recommended for this use case

### Option 2: Use CPU-only mmcv

```bash
pip install mmcv==2.1.0 -f https://download.openmmlab.com/mmcv/dist/cpu/torch2.0/index.html
```

Already included as fallback in `install_mmpose.sh`.

### Option 3: Skip keypoint detection on Railway

If MMPose continues to cause issues, you can make it optional:

In `app.py`:
```python
# Gracefully skip keypoint model loading on deployment
try:
    load_keypoint_model()
except Exception as e:
    logger.warning(f"Keypoint model not loaded: {e}")
    logger.info("Keypoint detection will not be available")
```

The app will start successfully, and keypoint endpoints will return 503.

## Expected Build Output (Success)

After this fix, Railway build should show:

```
✓ Installing dependencies from requirements.txt
✓ Installing MMPose dependencies with pre-built wheels...
✓ Installing mmcv via mim...
✓ MMPose dependencies installed successfully
✓ Downloading TensorFlow model...
✓ All checks passed - Models ready for deployment
```

## Deployment Checklist

Before deploying to Railway:

- [x] Updated `requirements.txt` (removed mmcv)
- [x] Created `install_mmpose.sh`
- [x] Updated `nixpacks.toml`
- [x] Made script executable (`chmod +x`)
- [ ] Test locally (optional but recommended)
- [ ] Commit and push to git
- [ ] Monitor Railway build logs
- [ ] Test `/health` endpoint shows `keypoint_model_loaded: true`

## Troubleshooting

### If build still fails with gcc error

The `mim install` command might not be working. Check Railway logs for:
```
Installing mmcv via mim...
```

If that step is missing or failing, the fallback pip install should run.

### If mmcv installs but model fails to load

Check Railway logs during startup:
```
Loading MMPose keypoint detection model...
```

If you see errors about missing dependencies, it might be a runtime issue (not build).

### If everything builds but /health shows keypoint_model_loaded: false

This means the build succeeded but runtime loading failed. Check application logs:
```
railway logs
```

Look for MMPose-related errors after "Starting up application...".

## Summary

✅ **Root cause 1**: mmcv tried to compile from source (needs gcc)
✅ **Solution 1**: Install mmcv using pre-built wheels via mim

✅ **Root cause 2**: MMPose dependencies installed opencv-python (with GUI support)
✅ **Solution 2**: Force use of opencv-python-headless (no OpenGL dependencies)

✅ **Root cause 3**: NumPy binary incompatibility with MMPose (numpy.dtype size changed)
✅ **Solution 3**: Pin numpy<2.0.0 and force wheel-only installation with PIP_ONLY_BINARY

✅ **Changes**: requirements.txt, install_mmpose.sh, nixpacks.toml
✅ **Expected result**: Clean build with no compilation errors, proper OpenCV headless support, and working keypoint detection

The deployment should now succeed on Railway without requiring C++ compilation tools or OpenGL libraries.

---

## OpenCV Conflict Fix (Update)

### Problem

After fixing the mmcv compilation issue, a second error appeared:

```
ImportError: libGL.so.1: cannot open shared object file: No such file or directory
  File "/app/services/classifier.py", line 14, in <module>
    import cv2
```

**Root Cause**: When installing MMPose dependencies (mmcv, mmdet, mmengine), the regular `opencv-python` package gets installed as a transitive dependency. This package includes GUI support and requires OpenGL libraries (libGL.so.1), which don't exist in Railway's headless environment.

### Solution

The `install_mmpose.sh` script now includes an OpenCV conflict check:

```bash
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
```

**How it works:**
1. After installing mmcv via mim, check if `opencv-python` was installed
2. If found, uninstall it
3. Reinstall `opencv-python-headless` (which was already in requirements.txt)
4. This ensures cv2 imports without requiring OpenGL libraries

### Expected Build Output (Updated)

```
✓ Installing dependencies from requirements.txt
✓ Installing MMPose dependencies with pre-built wheels...
✓ Installing mmcv via mim...
✓ Fixing OpenCV dependencies for headless environment...
[WARN] Found opencv-python (with GUI support), uninstalling...
✓ Ensuring opencv-python-headless is installed...
✓ MMPose dependencies installed successfully
✓ Downloading TensorFlow model...
✓ All checks passed - Models ready for deployment
```

---

## NumPy Binary Incompatibility Fix (Update 2)

### Problem

After fixing OpenCV, a third error appeared at runtime:

```
2025-11-11 10:33:13,850 | ERROR | services.keypoint_service | Failed to load MMPose model: numpy.dtype size changed, may indicate binary incompatibility. Expected 96 from C header, got 88 from PyObject
2025-11-11 10:33:13,851 | WARNING | services.keypoint_service | Keypoint detection will not be available. Service continues without it.
```

**Root Cause**:
1. MMPose and its dependencies were compiled against NumPy 1.x (with dtype size 96)
2. Railway installed NumPy 2.x (with dtype size 88), causing binary incompatibility
3. Additionally, `mim install` was still attempting to compile from source despite our script

### Solution

**Three-part fix in `install_mmpose.sh`:**

1. **Force wheel-only installation** with environment variables:
   ```bash
   export PIP_NO_BUILD_ISOLATION=1
   export PIP_ONLY_BINARY=:all:
   ```

2. **Add verification step** after mmcv installation:
   ```bash
   if python -c "import mmcv; print(f'mmcv {mmcv.__version__} loaded successfully')" 2>/dev/null; then
       log_info "✓ mmcv installed and verified successfully"
   else
       log_warn "⚠ mmcv import failed - keypoint detection may not work"
   fi
   ```

3. **Pin NumPy version** in `requirements.txt`:
   ```python
   numpy<2.0.0  # Pin to avoid binary incompatibility with MMPose
   ```

### Expected Runtime Output (Updated)

After successful deployment, the `/health` endpoint should show:

```json
{
  "status": "OK",
  "model_loaded": true,
  "keypoint_model_loaded": true,  ← Should be true now!
  "rejection_threshold": 0.75
}
```

And the startup logs should show:

```
2025-11-11 10:33:13 | INFO | services.keypoint_service | ✅ MMPose model loaded successfully
2025-11-11 10:33:13 | INFO | services.keypoint_service | RTMPose model ready for inference
```

Instead of the previous error.
