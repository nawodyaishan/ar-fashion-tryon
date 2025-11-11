# Debug: Verbose Output Fix

## Issue

The previous deployment still showed the NumPy binary incompatibility error, but the build logs only showed:
```
[INFO] ✓ MMPose dependencies installed successfully
```

All the detailed logging was being piped to `/tmp/mmpose_full_install.log` and **not showing in Railway build logs**.

## Changes Made

### Removed `tee` Commands
All `2>&1 | tee /tmp/mmpose_full_install.log` commands were removed to let output show directly in Railway logs.

**Before:**
```bash
pip install openmim 2>&1 | tee /tmp/mmpose_full_install.log
```

**After:**
```bash
pip install openmim  # Output goes directly to stdout
```

### Added Diagnostic Commands

Added diagnostic checks to identify the root cause:

1. **Check for multiple NumPy installations:**
   ```bash
   pip list | grep numpy
   ```

2. **Show NumPy file location:**
   ```bash
   python -c "import numpy; print(f'NumPy location: {numpy.__file__}')"
   ```

3. **Verify all package versions:**
   ```bash
   python -c "import mmengine; print(f'mmengine version: {mmengine.__version__}')"
   python -c "import mmpose; print(f'mmpose version: {mmpose.__version__}')"
   python -c "import mmdet; print(f'mmdet version: {mmdet.__version__}')"
   ```

## Expected Build Output

With these changes, the next Railway build should show **complete verbose output**:

```bash
[INFO] Installing complete MMPose ecosystem with NumPy 1.x compatibility...
[INFO] This installs: openmim, mmengine, mmcv, mmpose, mmdet
[INFO] Initial NumPy version: 1.26.4

[INFO] Installing openmim...
Collecting openmim
  ...
Successfully installed openmim-x.x.x

[INFO] Installing mmengine with NumPy 1.x constraint...
Collecting mmengine>=0.8.0,<0.11.0
  ...
Successfully installed mmengine-x.x.x

[INFO] Installing mmcv from OpenMMLab wheel repository...
[INFO] Platform: linux, CPU-only, PyTorch 2.x, NumPy 1.x
Looking in links: https://download.openmmlab.com/mmcv/dist/cpu/torch2.0/index.html
Collecting mmcv==2.1.0
  ...
Successfully installed mmcv-2.1.0

[INFO] Checking NumPy version after mmcv installation...
[INFO] NumPy version after mmcv: 1.26.4  ← CRITICAL: Should NOT be 2.x

[INFO] Installing mmpose and mmdet...
Collecting mmpose>=1.0.0,<1.4.0
  ...
Successfully installed mmpose-x.x.x mmdet-x.x.x

[INFO] Final NumPy version: 1.26.4  ← CRITICAL: Should NOT be 2.x

[INFO] Checking for multiple NumPy installations...
numpy                1.26.4  ← Should only see ONE entry

[INFO] Verifying mmcv installation...
✓ mmcv 2.1.0 loaded successfully
NumPy version: 1.26.4, dtype size: 8  ← Should be 8, NOT 16
NumPy location: /opt/venv/lib/python3.10/site-packages/numpy/__init__.py
mmengine version: x.x.x
mmpose version: x.x.x
mmdet version: x.x.x

[INFO] ✓ mmcv installed and verified successfully
```

## What to Look For

### 🟢 Success Indicators

1. **NumPy version stays at 1.26.4** throughout entire process
2. **dtype size is 8** (NumPy 1.x uses 8 bytes for float64)
3. **Only ONE NumPy entry** in `pip list | grep numpy`
4. **mmcv imports successfully** during verification

### 🔴 Failure Indicators

1. **NumPy version becomes 2.x** at any step
   - Should trigger warning: "⚠ CRITICAL: NumPy was upgraded to 2.x!"
   - Should see forced downgrade

2. **dtype size is 16** (NumPy 2.x uses different internal structure)
   - This would cause the binary incompatibility error

3. **Multiple NumPy entries** in pip list
   - Could indicate conflicting installations

4. **mmcv import fails**
   - Will see error details in output

## Debugging

If the error persists after this deployment:

1. **Check NumPy version progression** in build logs:
   - Initial: Should be 1.26.4
   - After mmcv: Should still be 1.26.4
   - Final: Should still be 1.26.4

2. **Check if NumPy gets upgraded** during any pip install:
   - Look for "Upgrading numpy" in pip output
   - Look for "Installing numpy-2.x"

3. **Check NumPy file location**:
   - Should be in `/opt/venv/lib/python3.10/site-packages/`
   - Should NOT be multiple locations

4. **Check dtype size**:
   - Should be 8 during build verification
   - If 16, that's NumPy 2.x and will cause runtime error

## Next Steps

After deployment:

1. **Review complete build logs** - All output should now be visible
2. **Check for any "WARNING" or "CRITICAL" messages**
3. **Verify dtype size is 8** in build verification
4. **Check runtime startup logs** for MMPose model loading

If the issue still persists with full verbose output, we'll be able to see **exactly** where NumPy gets upgraded to 2.x and fix it at that specific step.

---

**Created:** 2025-11-11
**Purpose:** Enable full verbose output in Railway build logs to debug NumPy version issues
**Expected:** Complete visibility into MMPose installation process
