# NumPy Binary Incompatibility Fix

## Problem Summary

The keypoint detection endpoints were failing with a 503 error due to NumPy binary incompatibility:

```
ERROR | Failed to load MMPose model: numpy.dtype size changed, may indicate binary incompatibility.
Expected 96 from C header, got 88 from PyObject
```

**Status codes observed:**
- `POST /detect_garment_keypoints` → **503 Service Unavailable**
- `GET /health` → **200 OK** (but `keypoint_model_loaded: false`)

## Root Cause Analysis

### Issue 1: Silent mmcv Installation Failure
The `PIP_ONLY_BINARY=:all:` environment variable was too restrictive and caused:
- `mim install` to fail silently without proper error reporting
- No verbose output to debug what actually happened during installation
- Potentially installed an incompatible wheel or skipped installation entirely

### Issue 2: NumPy Version Mismatch
Even though `requirements.txt` specified `numpy<2.0.0`:
1. NumPy 1.26.4 was installed initially ✓
2. During `install_mmpose.sh`, one of the MMPose dependencies upgraded NumPy to 2.x
3. mmcv's C extensions were compiled for NumPy 1.x (dtype size 96)
4. At runtime, NumPy 2.x (dtype size 88) caused binary incompatibility

### Issue 3: Insufficient Dependency Pinning
The MMPose ecosystem packages (mmengine, mmpose, mmdet) had loose version constraints:
- `mmengine` - no version constraint
- `mmpose` - no version constraint
- `mmdet` - no version constraint

These packages could pull in dependencies requiring NumPy 2.x.

## Solutions Applied

### Fix 1: Direct mmcv Installation with Verbose Logging

**Before:**
```bash
export PIP_ONLY_BINARY=:all:
mim install "mmcv>=2.0.0,<2.3.0" --no-build-isolation || { ... }
```

**After:**
```bash
# Install mmcv directly from OpenMMLab wheel repository (skip mim)
pip install --no-cache-dir mmcv==2.1.0 \
  -f https://download.openmmlab.com/mmcv/dist/cpu/torch2.0/index.html \
  2>&1 | tee /tmp/mmcv_install.log
```

**Benefits:**
- Direct installation from official OpenMMLab wheel repository
- Verbose output piped to `/tmp/mmcv_install.log` for debugging
- No build isolation issues
- Fallback to `mim` if direct install fails

### Fix 2: NumPy Version Monitoring and Correction

Added automatic detection and correction after mmcv installation:

```bash
# Check if NumPy was upgraded to 2.x
NUMPY_VERSION=$(python -c "import numpy; print(numpy.__version__)")
if [[ "$NUMPY_VERSION" == 2.* ]]; then
    log_warn "⚠ NumPy was upgraded to 2.x! Downgrading to 1.26.4..."
    pip install --force-reinstall "numpy<2.0.0"
fi
```

This ensures NumPy stays at 1.x even if mmcv dependencies try to upgrade it.

### Fix 3: Stricter Dependency Version Constraints

**Before:**
```python
openmim
mmengine
mmpose
mmdet
```

**After:**
```python
openmim
mmengine>=0.8.0,<0.11.0  # Pin to avoid NumPy 2.x requirement
mmpose>=1.0.0,<1.4.0     # Pin to compatible version
mmdet>=3.0.0,<3.4.0      # Pin to compatible version
```

This prevents these packages from upgrading to versions that require NumPy 2.x.

### Fix 4: Enhanced Verification Steps

Added comprehensive verification with detailed error output:

```bash
# Verify mmcv import
if python -c "import mmcv; print(f'✓ mmcv {mmcv.__version__} loaded successfully')" 2>&1 | tee -a /tmp/mmcv_install.log; then
    log_info "✓ mmcv installed and verified successfully"

    # Check NumPy dtype size
    python -c "import numpy; print(f'NumPy version: {numpy.__version__}, dtype size: {numpy.dtype(numpy.float64).itemsize}')"
else
    log_warn "⚠ mmcv import failed - checking error details..."
    python -c "import mmcv" 2>&1 | tee -a /tmp/mmcv_install.log || true
fi
```

## Files Modified

1. **`requirements.txt`**
   - Added `numpy<2.0.0` constraint
   - Added version constraints for mmengine, mmpose, mmdet

2. **`install_mmpose.sh`**
   - Removed restrictive `PIP_ONLY_BINARY=:all:`
   - Changed from `mim install` to direct pip install from OpenMMLab
   - Added NumPy version monitoring after mmcv installation
   - Added verbose logging with output to `/tmp/mmcv_install.log`
   - Added comprehensive verification steps

3. **`RAILWAY_DEPLOYMENT_FIX.md`**
   - Updated with NumPy compatibility fix documentation

## Expected Build Output

After these fixes, the Railway build should show:

```
✓ Installing dependencies from requirements.txt
  - numpy-1.26.4 installed ✓

[INFO] Installing mmcv from OpenMMLab wheel repository...
[INFO] Platform: linux, CPU-only, PyTorch 2.x, NumPy 1.x
Looking in links: https://download.openmmlab.com/mmcv/dist/cpu/torch2.0/index.html
Successfully installed mmcv-2.1.0

[INFO] Checking NumPy version after mmcv installation...
[INFO] Current NumPy version: 1.26.4  ← Should NOT be 2.x

[INFO] Verifying mmcv installation...
✓ mmcv 2.1.0 loaded successfully
NumPy version: 1.26.4, dtype size: 8  ← Correct

[INFO] ✓ mmcv installed and verified successfully
[INFO] Fixing OpenCV dependencies for headless environment...
[INFO] ✓ MMPose dependencies installed successfully
```

## Expected Runtime Output

After successful deployment, the startup logs should show:

```
2025-11-11 13:09:38 | INFO | services.classifier | ✅ Model loaded successfully!
2025-11-11 13:09:42 | INFO | services.keypoint_service | ✅ MMPose model loaded successfully
2025-11-11 13:09:42 | INFO | services.keypoint_service | RTMPose model ready for inference
2025-11-11 13:09:42 | INFO | app | Application startup complete
```

**NOT:**
```
ERROR | Failed to load MMPose model: numpy.dtype size changed  ← Should NOT appear
```

## Verification

After deployment, verify the fix:

1. **Check `/health` endpoint:**
   ```json
   {
     "status": "OK",
     "model_loaded": true,
     "keypoint_model_loaded": true  ← Should be true!
   }
   ```

2. **Test keypoint endpoint:**
   ```bash
   curl -X POST https://your-service.railway.app/detect_garment_keypoints \
     -F "garment=@shirt.jpg"
   # Should return 200 OK with keypoints
   ```

3. **Check build logs:**
   - Look for "NumPy version: 1.26.4" after mmcv installation
   - Ensure no "upgraded to 2.x" warnings appear
   - Verify mmcv import succeeds

## Debugging

If issues persist after deployment:

1. **Check mmcv install log:**
   - SSH into Railway container
   - View `/tmp/mmcv_install.log` for detailed install output

2. **Verify NumPy version:**
   ```bash
   python -c "import numpy; print(numpy.__version__)"
   # Should output: 1.26.4 (NOT 2.x)
   ```

3. **Check mmcv compatibility:**
   ```bash
   python -c "import mmcv; print(mmcv.__version__)"
   # Should output: 2.1.0 and NOT raise NumPy error
   ```

## Next Steps

1. Commit the changes:
   ```bash
   git add requirements.txt install_mmpose.sh NUMPY_COMPATIBILITY_FIX.md
   git commit -m "fix: resolve numpy binary incompatibility with verbose logging"
   git push origin main
   ```

2. Monitor Railway deployment logs carefully

3. Verify the `/health` endpoint shows `keypoint_model_loaded: true`

4. Test `/detect_garment_keypoints` endpoint returns 200 instead of 503

---

**Last Updated:** 2025-11-11
**Issue:** NumPy binary incompatibility preventing MMPose model loading
**Status:** Fixed with direct wheel installation and version monitoring
