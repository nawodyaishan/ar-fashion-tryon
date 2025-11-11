# MMPose Model Download - CI/CD Integration

## How MMPose Models Work

Unlike your TensorFlow model (152MB, requires manual download), MMPose models are **automatically downloaded on first use** from the MMPose model zoo.

### Default Behavior

When you call `MMPoseInferencer('rtmpose', device='cpu')`, it:
1. Checks if model exists in cache: `~/.cache/mmpose/`
2. If not found, downloads from OpenMMLab model zoo
3. Stores in cache for future use

### Model Size

- **RTMPose model:** ~10-20MB
- **Download time:** ~5-10 seconds
- **Cache location:** `~/.cache/mmpose/`

## For Production Deployment

### Option 1: Auto-download on First Request (Current Implementation)

**Pros:**
- No CI/CD changes needed
- Works out of the box
- Simple to maintain

**Cons:**
- First API request will be slow (~10-15 seconds)
- Requires internet access from production server
- No build-time verification

**Recommendation:** ✅ **This is fine for most use cases**

### Option 2: Pre-download During Build (Optional)

If you want to pre-download models during CI/CD (following your existing pattern):

#### Create Download Script

```bash
# download_mmpose_models.sh
#!/bin/bash
set -euo pipefail

GREEN='\033[0;32m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }

log_info "Pre-downloading MMPose models..."

python - <<EOF
import sys
try:
    from mmpose.apis import MMPoseInferencer

    log_info("Initializing MMPose inferencer (will download model)...")
    inferencer = MMPoseInferencer(pose2d='rtmpose', device='cpu')

    log_info("✅ MMPose model downloaded and cached successfully")
    sys.exit(0)

except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
EOF

if [ $? -eq 0 ]; then
    log_info "✅ MMPose model ready"
else
    log_error "❌ MMPose model download failed"
    exit 1
fi
```

#### Update CI/CD Pipeline

If using Railway, update `nixpacks.toml`:

```toml
[phases.setup]
cmds = [
    "bash download_models_railway_v2.sh",  # Existing
    "bash download_mmpose_models.sh"       # NEW
]
```

## Recommendation

**For your use case, Option 1 (auto-download) is recommended because:**

1. ✅ **Small model size:** Only 10-20MB (vs your 152MB TensorFlow model)
2. ✅ **Fast download:** 5-10 seconds (vs 2-3 minutes for large models)
3. ✅ **Reliable:** OpenMMLab has excellent CDN
4. ✅ **Simpler CI/CD:** No additional scripts needed
5. ✅ **Easier maintenance:** Models update automatically

**When to use Option 2:**
- Production environment has no internet access
- Build-time verification is critical
- You want 100% deterministic builds
- First request latency is absolutely critical

## Handling First Request Latency

If the first request slow-down is a concern, you can **warm up the model** after server startup:

### Add Warmup to `app.py`

```python
@app.on_event("startup")
async def startup_load():
    """Initialize services on startup."""
    logger.info("Starting up application...")

    # Load classification model
    load_model_and_config()

    # Load keypoint detection model
    load_keypoint_model()

    # Warm up keypoint model (optional)
    if is_keypoint_model_loaded():
        logger.info("Warming up keypoint detection model...")
        try:
            # Create a small dummy image
            import tempfile
            from PIL import Image
            import numpy as np

            dummy_img = Image.fromarray(np.zeros((224, 224, 3), dtype=np.uint8))
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
                dummy_img.save(tmp.name)
                tmp_path = Path(tmp.name)

            # Run inference once to trigger model download and caching
            await run_in_threadpool(detect_keypoints, tmp_path)
            tmp_path.unlink(missing_ok=True)

            logger.info("✓ Keypoint model warmed up successfully")
        except Exception as e:
            logger.warning(f"Model warmup failed (not critical): {e}")

    logger.info("Application startup complete")
```

This ensures:
- Model downloads during startup (not on first user request)
- First user request has normal latency
- Build process doesn't need changes

## Verifying Model Cache

### Check if Models are Cached

```bash
# SSH into your production server
ls -lh ~/.cache/mmpose/

# Should show something like:
# rtmpose-m_simcc-body7_pt-body7_420e-256x192-e48f03d0_20230504.pth  (~15MB)
```

### Cache Location

- **Linux/Railway:** `~/.cache/mmpose/`
- **Docker:** `/root/.cache/mmpose/` or `$HOME/.cache/mmpose/`
- **Local dev:** `~/.cache/mmpose/`

## Summary

**Current Implementation:**
- ✅ Models auto-download on first use
- ✅ No CI/CD changes required
- ✅ Works reliably

**If you want pre-download:**
- Use the script above in your CI/CD pipeline
- Follows your existing pattern with `download_models_railway_v2.sh`

**Recommendation:**
Keep current implementation (auto-download). It's simpler, more maintainable, and the small model size makes it negligible.
