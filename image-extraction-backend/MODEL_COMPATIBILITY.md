# Model Compatibility Issues

## Problem

The TensorFlow model (`models/best_clothing_model.h5`) was saved with an **older version of TensorFlow** (likely TF 2.3-2.10) and cannot be loaded with **newer versions** (TF 2.13+).

### Error Messages

**Local (TF 2.15.0):**
```
TypeError: Error when deserializing class 'InputLayer' using config={...}.
Exception encountered: Unrecognized keyword arguments: ['batch_shape']
```

**Railway (TF 2.20.0):**
```
RuntimeError: Model not loaded: Unable to synchronously open file (file signature not found)
```

## Current Status

The API is running in **degraded mode**:
- ✅ `/health` - Working
- ✅ `/classify_garment` - Working (returns "UNKNOWN" for classification, but background removal works)
- ✅ `/classify_garment_by_url` - Working (same as above)
- ✅ `/virtual_tryon` - **Fully working** (WebP conversion, Gradio API, Cloudinary uploads all work)
- ❌ `/detect_garment_type` - Returns 500 error (requires classification)
- ❌ `/construct_outfit` - Returns 500 error (requires classification)

## Solutions

### Option 1: Re-train Model (Recommended)

Re-train the model with current TensorFlow version:

```bash
# Install current TensorFlow
pip install tensorflow==2.20.0  # or tensorflow-cpu==2.20.0

# Train your model
python train.py

# Model will be saved in compatible format
```

### Option 2: Convert Existing Model

Use an older TensorFlow version to load and re-save the model:

```bash
# Create conversion environment
conda create -n tf_convert python=3.9
conda activate tf_convert
pip install tensorflow==2.10.0

# Load and re-save model
python << EOF
import tensorflow as tf

# Load with old TF
model = tf.keras.models.load_model('models/best_clothing_model.h5')
print("✅ Model loaded with TF 2.10")

# Save in new format
model.save('models/best_clothing_model_new.h5')
print("✅ Model re-saved")
EOF

# Replace old model
mv models/best_clothing_model.h5 models/best_clothing_model_old.h5
mv models/best_clothing_model_new.h5 models/best_clothing_model.h5

# Verify with new TF
conda deactivate
conda activate catvton
python test_model_load.py
```

### Option 3: Accept Degraded Mode

If classification isn't critical:

1. Remove `/detect_garment_type` and `/construct_outfit` endpoints
2. Let `/classify_garment` return "UNKNOWN" (background removal still works)
3. Focus on `/virtual_tryon` which is fully functional

## Verification

After fixing the model, run:

```bash
python test_model_load.py
```

Expected output:
```
✅ SUCCESS: Model loaded
   Classes: 3
   Labels: ['trousers', 'tshirt', 'other']
   Input shape: (None, 224, 224, 3)
   Output shape: (None, 3)
✅ Prediction successful
✅ ALL TESTS PASSED - Model is ready for deployment
```

## Technical Details

### Why This Happens

TensorFlow/Keras changed the model serialization format:

- **Old TF (2.3-2.10)**: Used `batch_shape` in InputLayer config
- **New TF (2.13+)**: Uses `input_shape` (without batch dimension)

The model file uses the old format, causing deserialization errors.

### Files Affected

- `models/best_clothing_model.h5` (152 MB) - Main model file
- `models/class_labels.json` - Class names mapping
- `models/model_config.json` - Model configuration
- `models/rejection_threshold.json` - Classification confidence threshold

### Code Changes Made

Added comprehensive diagnostics in `services/classifier.py`:
- File path verification
- File size checking
- Detailed error messages
- Graceful degradation

## Railway Deployment

### Current Issue

Railway successfully builds and deploys, but model loading fails. This could be:

1. **Model file not deployed** - Check if Railway includes the 152MB file
2. **File corruption during deployment** - Git LFS might be needed
3. **TensorFlow version mismatch** - Railway uses TF 2.20.0

### Check Railway Logs

Look for these diagnostic messages in Railway logs:

```
=== Model Loading Diagnostics ===
Current working directory: /app
Models directory contents: [...]
Model file size: 151.58 MB
TensorFlow version: 2.20.0
```

If "Model file size" is missing → model file wasn't deployed
If error occurs during loading → version incompatibility

### Git LFS for Large Files

If model file is too large for regular git:

```bash
# Install Git LFS
git lfs install

# Track model file
git lfs track "*.h5"
git add .gitattributes

# Commit and push
git add models/best_clothing_model.h5
git commit -m "Add model with Git LFS"
git push
```

## Next Steps

1. **Immediate**: Deploy current code to Railway (will run in degraded mode)
2. **Short-term**: Re-save model with current TensorFlow version
3. **Long-term**: Consider migrating to ONNX format for better compatibility

```bash
# Deploy to Railway
git add .
git commit -m "feat: add model compatibility diagnostics and graceful degradation"
git push

# Check Railway logs for diagnostics
railway logs
```
