# MMPose Installation Order Fix

## Critical Issue Discovered

### Problem
Even though NumPy 1.26.4 was installed, the keypoint detection was still failing with:
```
ERROR: numpy.dtype size changed, may indicate binary incompatibility
Expected 96 from C header, got 88 from PyObject
```

### Root Cause
The issue was **installation order** in nixpacks.toml:

```toml
[phases.install]
cmds = [
  "pip install -r requirements.txt",      # ← INSTALLED mmpose, mmdet, mmengine HERE
  "bash install_mmpose.sh"                # ← Tried to fix it here (too late!)
]
```

**What was happening:**
1. `requirements.txt` installed mmpose, mmdet, mmengine
2. These packages **upgraded NumPy to 2.x** during their installation
3. `install_mmpose.sh` ran afterward and installed mmcv
4. mmcv found NumPy 2.x and used incompatible binaries
5. At runtime, binary incompatibility caused the error

**Evidence from build logs:**
```
Successfully installed numpy-1.26.4 ...  ← Installed 1.x initially
[After mmpose/mmdet/mmengine installed]
numpy-2.x now present                     ← Silently upgraded!
[install_mmpose.sh runs]
mmcv installed with NumPy 2.x binaries    ← Wrong binaries!
```

## The Fix

### Changed Architecture

**Before (BROKEN):**
```
requirements.txt: numpy<2.0.0, mmengine, mmpose, mmdet
  ↓
  mmpose/mmdet/mmengine upgrade NumPy to 2.x
  ↓
install_mmpose.sh: Install mmcv (finds NumPy 2.x)
  ↓
  RESULT: Binary incompatibility
```

**After (FIXED):**
```
requirements.txt: numpy<2.0.0 ONLY
  ↓
  NumPy 1.26.4 installed and STAYS at 1.x
  ↓
install_mmpose.sh:
  1. Install openmim
  2. Install mmengine with "numpy<2.0.0" constraint
  3. Install mmcv with "numpy<2.0.0" constraint
  4. Install mmpose with "numpy<2.0.0" constraint
  5. Install mmdet with "numpy<2.0.0" constraint
  6. Check NumPy version after EACH step
  7. Force downgrade if NumPy becomes 2.x
  ↓
  RESULT: All packages use NumPy 1.x consistently
```

### Files Modified

#### 1. requirements.txt
**Removed:**
```python
openmim
mmengine>=0.8.0,<0.11.0
mmpose>=1.0.0,<1.4.0
mmdet>=3.0.0,<3.4.0
```

**Added comment:**
```python
# MMPose for garment keypoint detection
# NOTE: MMPose ecosystem packages are installed via install_mmpose.sh
# to ensure proper NumPy version compatibility. Do NOT add them here:
# - openmim
# - mmengine
# - mmcv
# - mmpose
# - mmdet
```

#### 2. install_mmpose.sh
Complete rewrite with 8-step process:

1. **Check initial NumPy version**
   ```bash
   INITIAL_NUMPY=$(python -c "import numpy; print(numpy.__version__)")
   log_info "Initial NumPy version: $INITIAL_NUMPY"
   ```

2. **Install openmim** (OpenMMLab package manager)

3. **Install mmengine** with NumPy constraint
   ```bash
   pip install "mmengine>=0.8.0,<0.11.0" "numpy<2.0.0"
   ```

4. **Install mmcv** from OpenMMLab wheels
   ```bash
   pip install mmcv==2.1.0 \
     -f https://download.openmmlab.com/mmcv/dist/cpu/torch2.0/index.html \
     "numpy<2.0.0"
   ```

5. **Check NumPy after mmcv** and force downgrade if needed

6. **Install mmpose and mmdet** with NumPy constraint

7. **Final NumPy check** with aggressive downgrade if still 2.x

8. **Verify all packages** import correctly

### Verbose Logging

All installation output now goes to `/tmp/mmpose_full_install.log` for debugging.

**Expected output during build:**
```
[INFO] Installing complete MMPose ecosystem with NumPy 1.x compatibility...
[INFO] This installs: openmim, mmengine, mmcv, mmpose, mmdet
[INFO] Initial NumPy version: 1.26.4
[INFO] Installing openmim...
[INFO] Installing mmengine with NumPy 1.x constraint...
[INFO] Installing mmcv from OpenMMLab wheel repository...
[INFO] Platform: linux, CPU-only, PyTorch 2.x, NumPy 1.x
[INFO] Checking NumPy version after mmcv installation...
[INFO] NumPy version after mmcv: 1.26.4  ← Should NOT be 2.x
[INFO] Installing mmpose and mmdet...
[INFO] Final NumPy version: 1.26.4  ← Should NOT be 2.x
[INFO] Verifying mmcv installation...
✓ mmcv 2.1.0 loaded successfully
NumPy version: 1.26.4, dtype size: 8
mmengine version: 0.10.x
mmpose version: 1.3.x
[INFO] ✓ mmcv installed and verified successfully
```

### Safety Mechanisms

1. **Triple NumPy checks** - Before mmcv, after mmcv, after all packages
2. **Explicit constraints** - Every pip install includes "numpy<2.0.0"
3. **Aggressive downgrade** - If NumPy is still 2.x, uninstall and reinstall 1.26.4
4. **Comprehensive verification** - Test all package imports before declaring success

## Expected Results

### Build Success Indicators

✅ **NumPy stays at 1.26.4** throughout entire installation
✅ **mmcv imports without error** during verification step
✅ **dtype size is 8** (correct for NumPy 1.x float64)
✅ **All packages verified**: mmcv, mmengine, mmpose

### Runtime Success Indicators

✅ **Startup logs show:**
```
INFO | ✅ MMPose model loaded successfully
INFO | RTMPose model ready for inference
```

✅ **NOT:**
```
ERROR | Failed to load MMPose model: numpy.dtype size changed  ← Should NOT appear!
```

✅ **Health endpoint:**
```json
{
  "keypoint_model_loaded": true  ← Should be true!
}
```

✅ **Keypoint endpoint:**
```
POST /detect_garment_keypoints → 200 OK (NOT 503!)
```

## Debugging

If issues persist after this fix:

1. **Check build logs for NumPy version progression:**
   ```
   Initial NumPy version: 1.26.4
   NumPy version after mmcv: X.X.X  ← Should be 1.26.4
   Final NumPy version: X.X.X       ← Should be 1.26.4
   ```

2. **If NumPy becomes 2.x, look for which package upgraded it:**
   - Check pip install output in /tmp/mmpose_full_install.log
   - Look for "Upgrading numpy" or "Installing numpy-2.x"

3. **If mmcv import fails, check the dtype size:**
   ```
   NumPy version: X.X.X, dtype size: X
   ```
   - Should be: `1.26.4, dtype size: 8`
   - NOT: `2.x.x, dtype size: 16` (would cause incompatibility)

4. **SSH into Railway container and check installed versions:**
   ```bash
   python -c "import numpy; print(f'NumPy: {numpy.__version__}')"
   python -c "import mmcv; print(f'mmcv: {mmcv.__version__}')"
   python -c "import mmengine; print(f'mmengine: {mmengine.__version__}')"
   python -c "import mmpose; print(f'mmpose: {mmpose.__version__}')"
   ```

## Deployment

```bash
git add requirements.txt install_mmpose.sh MMPOSE_INSTALL_ORDER_FIX.md
git commit -m "fix: correct MMPose installation order to prevent NumPy upgrade"
git push origin main
```

**Critical:** This fix changes the fundamental installation architecture. All MMPose packages are now installed via the shell script, NOT via requirements.txt.

---

**Created:** 2025-11-11
**Issue:** MMPose packages in requirements.txt were upgrading NumPy to 2.x before mmcv installation
**Solution:** Install ALL MMPose packages via install_mmpose.sh with explicit NumPy constraints
**Expected Outcome:** Keypoint detection endpoints return 200 instead of 503
