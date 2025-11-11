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

✅ **Root cause**: mmcv tried to compile from source (needs gcc)
✅ **Solution**: Install mmcv using pre-built wheels via mim
✅ **Changes**: requirements.txt, install_mmpose.sh, nixpacks.toml
✅ **Expected result**: Clean build with no compilation errors

The deployment should now succeed on Railway without requiring C++ compilation tools.
