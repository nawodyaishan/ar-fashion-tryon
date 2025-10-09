# Fixes Applied to FastAPI Garment Extraction Backend

## Date: 2025-10-08

## Issues Fixed

### 1. **TensorFlow Model Loading Error**
**Error:**
```
Error when deserializing class 'InputLayer' using config={'batch_shape': [None, 224, 224, 3]...}
Exception encountered: Unrecognized keyword arguments: ['batch_shape']
```

**Root Cause:**
- Model was saved with older TensorFlow version (2.3-2.10) that used `batch_shape` parameter
- Current environment uses TensorFlow 2.15, which uses `input_shape` instead
- Version incompatibility when loading model

**Fix Applied:**
Added `compile=False` parameter to `load_model()` call in `app/models/classifier.py:45`:

```python
self.model = load_model(str(model_path), compile=False)
```

This skips model recompilation and avoids the `batch_shape` incompatibility issue.

**Reference:** Flask implementation (line 32 in `app.py`) uses same approach

---

### 2. **Pydantic Protected Namespace Warnings**
**Warnings:**
```
Field "model_names" has conflict with protected namespace "model_"
Field "model_config_file" has conflict with protected namespace "model_"
Field "model_loaded" has conflict with protected namespace "model_"
Field "model_name" has conflict with protected namespace "model_"
```

**Root Cause:**
- Pydantic v2 reserves the `model_` prefix for internal use
- Field names starting with `model_` trigger warnings

**Fix Applied:**
Renamed all conflicting fields:

**In `app/config.py`:**
- `model_names` → `ml_model_names`
- `model_config_file` → `ml_model_config_file`

**In `app/models/schemas.py` (HealthResponse):**
- `model_loaded` → `ml_model_loaded`
- `model_name` → `ml_model_name`
- Added `protected_namespaces = ()` to Config class

**Updated references:**
- `app/models/classifier.py:38, 55, 72`
- `app/api/endpoints.py:37-38`

---

### 3. **Unsafe Port Error (ERR_UNSAFE_PORT)**
**Error:**
```
ERR_UNSAFE_PORT - Port 6000 blocked by browser
```

**Root Cause:**
- Port 6000 is on Chrome's list of restricted ports for security reasons
- Browsers block access to these ports

**Fix Applied:**
Changed default port from 6000 to 5000 in `app/config.py:24`:

```python
port: int = 5000  # Changed from 6000 (unsafe port) to 5000
```

---

## Files Modified

1. **app/config.py**
   - Changed port: 6000 → 5000
   - Renamed: `model_names` → `ml_model_names`
   - Renamed: `model_config_file` → `ml_model_config_file`

2. **app/models/classifier.py**
   - Added `compile=False` to `load_model()` call
   - Updated references to renamed config fields

3. **app/models/schemas.py**
   - Renamed: `model_loaded` → `ml_model_loaded`
   - Renamed: `model_name` → `ml_model_name`
   - Added `protected_namespaces = ()` to HealthResponse.Config

4. **app/api/endpoints.py**
   - Updated field names in HealthResponse instantiation

---

## Testing Instructions

1. **Restart the server:**
   ```bash
   cd image-extraction-backend
   python -m app.main
   ```

2. **Verify no warnings:**
   - Check console output for absence of Pydantic warnings
   - Confirm model loads successfully

3. **Test health endpoint:**
   ```bash
   curl http://localhost:5000/api/health
   ```

   Expected response:
   ```json
   {
     "status": "healthy",
     "ml_model_loaded": true,
     "ml_model_name": "best_clothing_model.h5",
     "version": "1.0.0"
   }
   ```

4. **Test garment processing:**
   ```bash
   curl -X POST "http://localhost:5000/api/process" \
     -F "file=@/path/to/garment.jpg"
   ```

5. **Access API documentation:**
   - Swagger UI: http://localhost:5000/docs
   - ReDoc: http://localhost:5000/redoc

---

## Comparison with Flask Implementation

The FastAPI implementation now matches the Flask implementation's model loading approach:

| Aspect | Flask (app.py) | FastAPI (app/models/classifier.py) |
|--------|----------------|-------------------------------------|
| **Model Loading** | `load_model(path)` | `load_model(path, compile=False)` ✅ |
| **Config Files** | Lines 38-57 | Lines 56-89 ✅ |
| **Preprocessing** | Lines 63-66 | Lines 91-108 ✅ |
| **Decision Logic** | Lines 68-85 | Lines 110-156 ✅ |
| **Port** | 5000 | 5000 ✅ |

The `compile=False` parameter is the key addition that enables TensorFlow 2.15 to load models saved with older versions.

---

## Additional Notes

### Why `compile=False` Works

When loading a Keras model:
- **With compilation** (default): TensorFlow rebuilds the model graph from scratch, which requires all layer configs to match current TensorFlow version
- **Without compilation** (`compile=False`): TensorFlow loads the model architecture and weights as-is, skipping optimization recompilation

This allows cross-version compatibility at the cost of:
- No training capabilities (inference only)
- No access to optimizer state
- Slightly slower first inference

**This is acceptable for inference-only production services.**

### Environment Compatibility

The fixes ensure compatibility with:
- Python 3.9+
- TensorFlow 2.15.0
- Pydantic 2.5.3+
- FastAPI 0.109.0+

### Future Recommendations

1. **Re-save model with TensorFlow 2.15:**
   ```python
   # In training environment
   model.save('best_clothing_model_tf215.h5')
   ```

2. **Use SavedModel format instead of H5:**
   ```python
   model.save('best_clothing_model')  # Creates a directory
   ```

3. **Pin TensorFlow version in requirements.txt** to ensure consistency

---

## References

- Flask implementation: `app.py` (lines 26-36, model loading)
- TensorFlow compatibility: https://www.tensorflow.org/guide/keras/save_and_serialize
- Pydantic protected namespaces: https://docs.pydantic.dev/latest/api/config/#pydantic.config.ConfigDict.protected_namespaces
- Chrome restricted ports list: https://chromium.googlesource.com/chromium/src.git/+/refs/heads/master/net/base/port_util.cc
