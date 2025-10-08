# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This directory contains **two implementations** of the garment extraction service:

### 1. FastAPI Implementation (Recommended - Production Quality)
Modern, well-structured FastAPI application with:
- **Clean architecture**: Separation of concerns with services, models, and API layers
- **Type safety**: Full Pydantic schemas and type hints
- **Async operations**: Better performance with async/await
- **Dependency injection**: Proper service lifecycle management
- **Auto documentation**: Interactive API docs at `/docs`
- **Better error handling**: Structured error responses
- **Configuration management**: Environment-based settings

### 2. Flask Implementation (Legacy - Prototype)
Simple Flask application with web UI for prototyping. Includes virtual try-on functionality with MediaPipe pose detection.

---

## Quick Start (FastAPI - Recommended)

### Installation

```bash
# Install dependencies
pip install -r requirements.txt
```

### Running the FastAPI Service

```bash
# Development mode with auto-reload
python -m app.main

# Or using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 5000
```

The API runs on **http://localhost:5000**

### API Documentation

- **Interactive API docs**: http://localhost:5000/docs
- **ReDoc**: http://localhost:5000/redoc
- **Health check**: http://localhost:5000/api/health

### Example Usage

```bash
# Process a garment image
curl -X POST "http://localhost:5000/api/process" \
  -F "file=@/path/to/garment.jpg"
```

Response:
```json
{
  "success": true,
  "message": "Garment processed successfully",
  "classification": {
    "label": "tshirt",
    "confidence": 0.92
  },
  "extraction": {
    "cutout_url": "/static/outputs/cutout_tshirt_a1b2c3d4.png",
    "cutout_path": "outputs/cutout_tshirt_a1b2c3d4.png",
    "original_url": "/static/uploads/garment_a1b2c3d4.png"
  },
  "processing_time_ms": 1234.56
}
```

---

## Quick Start (Flask - Legacy)

### Running the Flask Service

```bash
# Install dependencies manually
pip install flask tensorflow mediapipe rembg pillow opencv-python numpy

# Start the Flask server
python app.py
```

The service runs on http://localhost:5000 by default with a web UI.

---

## Project Structure

### FastAPI Application

```
image-extraction-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                      # FastAPI app entry point
│   ├── config.py                    # Configuration management
│   ├── models/
│   │   ├── __init__.py
│   │   ├── schemas.py               # Pydantic request/response models
│   │   └── classifier.py            # TensorFlow CNN wrapper
│   ├── services/
│   │   ├── __init__.py
│   │   ├── classification.py        # High-level garment service
│   │   └── extraction.py            # Background removal service
│   ├── api/
│   │   ├── __init__.py
│   │   └── endpoints.py             # API routes
│   └── core/
│       ├── __init__.py
│       └── dependencies.py          # Dependency injection
├── models/                          # ML model files (REQUIRED)
│   ├── best_clothing_model.h5       # or clothing_model_final.h5 (TensorFlow CNN)
│   ├── class_labels.json            # {"trousers": 0, "tshirt": 1, "other": 2}
│   ├── model_config.json            # {"head_type": "softmax"}
│   └── rejection_threshold.json     # {"tau": 0.688822329044342}
├── static/
│   ├── uploads/                     # Original uploaded images (auto-created)
│   └── outputs/                     # Processed images (auto-created)
├── templates/                       # Flask templates (legacy)
│   └── index.html
├── app.py                           # Flask app (legacy)
├── requirements.txt                 # Python dependencies
└── CLAUDE.md                        # This file
```

**CRITICAL**: The models must exist before running. The service will fail on startup if `best_clothing_model.h5` or `clothing_model_final.h5` is not found in the `models/` directory.

---

## Architecture

### FastAPI Architecture (Current Implementation)

**Request Flow** - Single Endpoint:

`POST /api/process` - Complete garment processing pipeline:
1. **Upload validation**: Check file type, size (max 10MB), and content
2. **Image loading**: Convert bytes to PIL Image (RGB)
3. **Save original**: Store to `static/uploads/` with UUID
4. **Classification**: TensorFlow CNN predicts garment type
5. **Validation**: Reject if not T-shirt or Trousers
6. **Extraction**: Remove background using rembg (u2net)
7. **Save cutout**: Store to `static/outputs/`
8. **Response**: Return classification + extraction results with processing time

**Service Layer Architecture**:

```
FastAPI App (app/main.py)
    ↓
API Endpoints (app/api/endpoints.py)
    ↓
GarmentService (app/services/classification.py)
    ├─→ GarmentClassifier (app/models/classifier.py)
    │   └─→ TensorFlow CNN Model (best_clothing_model.h5)
    └─→ GarmentExtractor (app/services/extraction.py)
        └─→ rembg (u2net model)
```

**Key Design Patterns**:
- **Dependency Injection**: Services are singleton instances injected via FastAPI dependencies (`get_garment_service`)
- **Configuration Management**: Centralized settings with environment variable support (prefix: `GARMENT_`)
- **Type Safety**: Full Pydantic v2 schemas for requests/responses with validation
- **Async Operations**: All service methods are async for better concurrency
- **Error Handling**: Structured error responses with HTTP status codes (400, 413, 500)
- **Lifespan Management**: Application startup/shutdown hooks for resource management

**API Endpoints**:

1. `GET /api/` - API information and endpoint listing
2. `GET /api/health` - Health check with model status
3. `POST /api/process` - Main garment processing endpoint
4. `GET /docs` - Interactive OpenAPI documentation (Swagger UI)
5. `GET /redoc` - Alternative API documentation (ReDoc)

---

### Model Loading and Configuration

**Model Discovery**:
The system attempts to load models in priority order from `models/` directory:
1. `best_clothing_model.h5` (primary)
2. `clothing_model_final.h5` (fallback)

**Configuration Files** (all in `models/` directory):

1. **`class_labels.json`** (REQUIRED):
   ```json
   {
     "trousers": 0,
     "tshirt": 1,
     "other": 2
   }
   ```
   Maps class names to integer indices for model output interpretation.

2. **`model_config.json`** (REQUIRED):
   ```json
   {
     "head_type": "softmax"
   }
   ```
   Specifies model output head type:
   - `"softmax"`: Multi-class classification with softmax activation (standard)
   - `"sigmoid_ovr"`: One-vs-rest binary classifiers with sigmoid activations

3. **`rejection_threshold.json`** (OPTIONAL):
   ```json
   {
     "tau": 0.688822329044342
   }
   ```
   Confidence threshold for classification. Default: 0.75

**Model Initialization Flow** (`app/models/classifier.py:24-34`):
1. Load TensorFlow model from .h5 file
2. Load class labels and create bidirectional index mapping
3. Load head type configuration (softmax vs sigmoid_ovr)
4. Load rejection threshold tau value
5. Log all configuration for debugging

**Environment Configuration** (`app/config.py`):

All settings can be overridden with environment variables using `GARMENT_` prefix:

```bash
# Server settings
GARMENT_HOST=0.0.0.0
GARMENT_PORT=5000
GARMENT_DEBUG=true

# File upload limits
GARMENT_MAX_FILE_SIZE=10485760  # 10MB in bytes

# Model settings
GARMENT_DEFAULT_TAU=0.75

# CORS settings
GARMENT_CORS_ORIGINS='["http://localhost:3000","http://localhost:3001"]'

# Logging
GARMENT_LOG_LEVEL=INFO
```

---

### Dependency Injection System

**Service Lifecycle** (`app/core/dependencies.py`):

FastAPI uses dependency injection to manage service instances:

```python
@lru_cache()
def get_garment_service() -> GarmentService:
    """Get singleton GarmentService instance"""
    settings = get_settings()
    return GarmentService(settings)
```

**Benefits**:
- **Singleton pattern**: Model loaded once, reused across requests
- **Lazy initialization**: Services created on first use
- **Easy testing**: Dependencies can be overridden in tests
- **Type safety**: Full type hints for IDE support

**Service Dependencies**:
```
get_settings() [cached]
    ↓
get_garment_service() [cached]
    ├─→ GarmentClassifier (loads TensorFlow model)
    └─→ GarmentExtractor (initializes rembg)
```

**Endpoint Injection** (`app/api/endpoints.py:53-56`):
```python
async def process_garment(
    file: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
    garment_service: GarmentService = Depends(get_garment_service)
):
    # Services injected automatically by FastAPI
```

### CORS Configuration

**Default CORS Settings** (`app/config.py:46`):
- Allows all origins: `["*"]`
- Allows credentials: `True`
- Allows all methods: `["*"]`
- Allows all headers: `["*"]`

**Production CORS Setup**:
```bash
# Restrict to specific origins
export GARMENT_CORS_ORIGINS='["http://localhost:3000","https://yourapp.com"]'
```

**CORS Middleware** (`app/main.py:75-83`):
- Added via FastAPI middleware
- Handles preflight requests automatically
- Applies to all routes

---

### Flask Architecture (Legacy Implementation)

**Request Flow** - Two-Step Process:

1. **Step 1: Garment Classification** (`POST /classify_garment`)
   - Upload garment image
   - CNN model classifies as "tshirt" or "trousers" (rejects "other" or low confidence)
   - Background removal using rembg
   - Returns classification label, confidence, and cutout image URL

2. **Step 2: Virtual Try-On** (`POST /try_on`)
   - Upload body image + provide cutout_path from Step 1
   - MediaPipe Pose detects 33 keypoints on body
   - Garment overlay positioned using pose landmarks (shoulders/hips/ankles)
   - Returns composite image URL

### Model Architecture

**Classification Model** (`app/models/classifier.py`):

**Input Specification**:
- **Input shape**: 224x224x3 RGB images
- **Resampling**: LANCZOS filter for high-quality resizing
- **Preprocessing**: Pixel values normalized to [0, 1] range (divide by 255.0)
- **Batch dimension**: Added automatically (shape becomes 1x224x224x3)

**Model Output Heads** (configured via `model_config.json`):

1. **Softmax Head (Standard)**:
   - Output: 3-dimensional softmax probabilities [P(trousers), P(tshirt), P(other)]
   - Decision logic (`app/models/classifier.py:122-132`):
     ```python
     idx = argmax(probabilities)
     confidence = probabilities[idx]
     if confidence < tau:
         return UNKNOWN
     return class_labels[idx]
     ```
   - Rejection threshold: Predictions with confidence < tau (default 0.688 or 0.75)
   - Example: `[0.05, 0.92, 0.03]` → "tshirt" with 92% confidence

2. **Sigmoid OVR Head (One-vs-Rest)**:
   - Output: 2-dimensional sigmoid probabilities [P(trousers), P(tshirt)]
   - Decision logic (`app/models/classifier.py:134-156`):
     ```python
     p0, p1 = probabilities
     if (p0 >= tau) and (p1 < tau):
         return trousers
     if (p1 >= tau) and (p0 < tau):
         return tshirt
     return UNKNOWN  # ambiguous or both below threshold
     ```
   - Rejection cases:
     - Both below tau: Low confidence for both classes
     - Both above tau: Ambiguous classification
   - Example: `[0.15, 0.88]` → "tshirt" with 88% confidence

**Rejection Threshold (tau) Mechanism**:
- Purpose: Filter out low-confidence predictions and "other" category garments
- Default value: 0.75 (can be overridden in `rejection_threshold.json`)
- Applied per-class in sigmoid_ovr mode for better rejection of ambiguous cases
- Returns `GarmentType.UNKNOWN` for rejected predictions

**Class Mapping**:
```python
class_labels = {
    "trousers": 0,  # Lower body garments
    "tshirt": 1,    # Upper body garments
    "other": 2      # Rejected category (dresses, jackets, etc.)
}
```

**Validation Rules** (`app/models/classifier.py:182-184`):
- Only `tshirt` and `trousers` are accepted as valid garments
- `unknown` and `other` classifications trigger rejection responses
- Client receives 200 OK with `success: false` for rejected garments

**Pose Detection**:
- MediaPipe Pose (model_complexity=1, static_image_mode=True)
- Key landmarks used:
  - Shoulders (LEFT_SHOULDER, RIGHT_SHOULDER)
  - Hips (LEFT_HIP, RIGHT_HIP)
  - Ankles (LEFT_ANKLE, RIGHT_ANKLE)

### Garment Placement Logic

**T-shirt placement** (`app.py:165-179`):
- Width: Scaled to 2.0× shoulder width
- Height: Centered at chest (35% down from shoulders toward hips)
- Scale factor: `target_width / garment_width`

**Trousers placement** (`app.py:181-195`):
- Height: Scaled to match hip→ankle distance
- Width: Scaled to 1.6× hip width
- Centered vertically at thighs (midpoint between hips and ankles)

## Key Implementation Details

### Image Processing Pipeline (FastAPI)

**Background Removal** (`app/services/extraction.py`):
- Uses `rembg` library with default **u2net** model
- Automatic model download on first run (cached locally)
- Converts input to RGBA format before processing
- Returns PNG with transparent background (alpha channel)
- Async wrapper for non-blocking execution

**Processing Flow** (`app/services/classification.py:93-160`):
```python
1. Load image from bytes → PIL Image (RGB)
2. Save original → static/uploads/garment_{uuid}.png
3. Classify → TensorFlow model inference
4. Validate → Check if tshirt or trousers
5. Extract → rembg background removal (RGBA)
6. Save cutout → static/outputs/cutout_{label}_{uuid}.png
7. Return → URLs, classification, confidence, processing time
```

**Image Format Handling**:
- Input: Accepts JPEG, PNG, WEBP
- Processing: Converts all to RGB for classification
- Background Removal: Converts to RGBA for rembg
- Output: Saves as PNG to preserve transparency

**UUID Generation**: 8-character hex UUID for unique filenames (prevents collisions)

### Image Processing Pipeline (Flask - Legacy)

1. **Background Removal**: Uses `rembg` library with default u2net model
2. **Alpha Compositing**: Custom `overlay_rgba_on_rgb()` function handles:
   - Scaling garment to match body proportions
   - Centering at calculated pose landmarks
   - Alpha blending with proper bounds checking

### Error Handling

**FastAPI Error Responses** (`app/api/endpoints.py`):

HTTP status codes:
- **200 OK**: Request processed, check `success` field in JSON
  - `success: true` - Garment accepted (tshirt or trousers)
  - `success: false` - Garment rejected (unknown or other)
- **400 Bad Request**: Invalid input (file type, empty file, corrupted image)
- **413 Payload Too Large**: File exceeds 10MB limit
- **500 Internal Server Error**: Unexpected processing error

Common error responses:
```json
// Invalid garment type
{
  "success": false,
  "message": "Garment must be a T-shirt or Trousers. Detected: unknown",
  "classification": {
    "label": "unknown",
    "confidence": 0.45
  },
  "extraction": null,
  "processing_time_ms": 523.12
}

// File too large
{
  "detail": "File too large. Maximum size is 10.0MB"
}

// Invalid file type
{
  "detail": "Invalid file type. Must be an image (JPEG, PNG, WEBP)."
}
```

**Error Logging**:
- All errors logged with full stack traces
- Request-level logging for debugging
- Model inference errors captured and returned to client

**Flask Error Responses (Legacy)**:
- Returns 400 errors with descriptive JSON messages
- Common failures:
  - "Could not detect body pose" → Use clearer full-body images
  - "Garment must be a T-shirt or Trousers" → Model rejected classification
  - "Cutout image not found" → Step 2 called before Step 1 completes

### File Management

- All uploads saved to `static/uploads/` with UUID-based filenames
- All outputs saved to `static/outputs/` with descriptive prefixes
- Paths normalized to POSIX format (forward slashes) for cross-platform compatibility
- Images served via Flask's `send_from_directory` at `/static/<path>`

## Development Notes

### Dependencies (FastAPI)

**Package Management**: Full `requirements.txt` provided with pinned versions:

```txt
# FastAPI and server
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6

# Pydantic for settings
pydantic==2.5.3
pydantic-settings==2.1.0

# ML and Computer Vision
tensorflow==2.15.0
numpy==1.24.3
pillow==10.2.0
opencv-python==4.9.0.80

# Background Removal
rembg==2.0.55

# Logging and utilities
python-json-logger==2.0.7
```

**Installation**:
```bash
pip install -r requirements.txt
```

**Python Version**: Python 3.9+ recommended (TensorFlow 2.15 requirement)

**GPU Support**: TensorFlow will auto-detect CUDA if available, otherwise runs on CPU

### Configuration Files

- `class_labels.json`: Maps class names to integer indices (REQUIRED)
- `model_config.json`: Specifies model head type (softmax vs sigmoid_ovr) (REQUIRED)
- `rejection_threshold.json`: Confidence threshold (tau) for classification (OPTIONAL, defaults to 0.75)

### Limitations

**FastAPI Implementation**:
- Only supports 2 garment types (T-shirt, Trousers)
- No real-time camera support (static images only)
- No user authentication or session management
- No tests or CI/CD setup currently
- Single model loaded at startup (no hot-swapping)
- Processing is synchronous per request (async endpoint but blocking model inference)

**Flask Implementation (Legacy)**:
- Two-step process (separate classification and try-on endpoints)
- No 3D rendering (simple 2D overlay)
- Single-threaded development server (not production-ready)
- No comprehensive error handling

### Debugging Tips

**FastAPI Debugging**:

1. **Enable Debug Mode**:
   ```bash
   GARMENT_DEBUG=true python -m app.main
   # Or
   uvicorn app.main:app --reload --log-level debug
   ```

2. **Check Logs**:
   - Application startup logs show model loading status
   - Each request logs classification results and timing
   - Errors include full stack traces in console

3. **Verify Model Setup**:
   ```bash
   # Check model files exist
   ls -la models/
   # Should show: best_clothing_model.h5, class_labels.json, model_config.json
   ```

4. **Test Health Endpoint**:
   ```bash
   curl http://localhost:5000/api/health
   # Should return: {"status": "healthy", "model_loaded": true, ...}
   ```

5. **Use Interactive API Docs**:
   - Navigate to http://localhost:5000/docs
   - Test endpoints directly in browser
   - View request/response schemas

6. **Check Static Files**:
   ```bash
   ls -la static/uploads/   # Original uploaded images
   ls -la static/outputs/   # Processed garment cutouts
   ```

7. **Common Issues**:
   - **Model not loading**: Check TensorFlow version compatibility (2.15.0)
   - **Low confidence**: Adjust `GARMENT_DEFAULT_TAU` or `rejection_threshold.json`
   - **CORS errors**: Update `GARMENT_CORS_ORIGINS` environment variable
   - **Slow processing**: First request downloads u2net model (~200MB)

8. **Performance Monitoring**:
   - Response includes `processing_time_ms` for each request
   - Typical times: 1-3 seconds (classification + background removal)

**Flask Debugging (Legacy)**:
- Set `debug=True` in `app.run()` for auto-reload (already enabled)
- Check console logs for MediaPipe pose detection failures
- Verify model files exist and are valid TensorFlow SavedModel format
- Ensure uploaded images contain clear, unobstructed bodies for pose detection
- If garments appear incorrectly sized, adjust scaling factors in `place_garment()`

## Comparison: FastAPI vs Flask

**When to use FastAPI** (Recommended):
- ✅ Production deployment
- ✅ API-only service (no UI needed)
- ✅ Integration with other microservices
- ✅ Need comprehensive error handling
- ✅ Require API documentation
- ✅ Type safety important
- ✅ Better performance with async operations
- ✅ Environment-based configuration

**When to use Flask** (Prototyping only):
- ✅ Quick local testing with web UI
- ✅ Learning/experimentation
- ✅ Need virtual try-on with pose detection
- ⚠️ Not recommended for production

**Key Differences**:

| Feature | FastAPI | Flask |
|---------|---------|-------|
| **Endpoints** | Single `/api/process` | Two-step `/classify_garment` + `/try_on` |
| **Architecture** | Structured (services/models/api layers) | Monolithic single file |
| **Type Safety** | Full Pydantic schemas | Manual validation |
| **Documentation** | Auto-generated OpenAPI | None |
| **Configuration** | Environment variables + Settings class | Hardcoded |
| **Error Handling** | HTTP status codes + structured responses | Generic 400 errors |
| **Testing** | Dependency injection ready | Difficult to test |
| **Virtual Try-On** | ❌ Not included | ✅ MediaPipe pose overlay |
| **Production Ready** | ✅ Yes | ❌ No |

---

## Relationship to Main Project

This service is **independent** from the main AR Fashion Try-On system documented in `/CLAUDE.md`. The main system uses:
- FastAPI (not Flask) for ML backend
- NestJS for web backend
- Next.js for frontend
- YOLO v8 segmentation (not CNN classification)

This Flask service appears to be an earlier prototype or alternative implementation focused on simplicity over scalability.

**Integration Path**:
If integrating the FastAPI garment extraction service with the main AR system:
1. Deploy as a separate microservice on port 5000
2. Main web backend (NestJS) calls `/api/process` endpoint
3. Extracted garment images passed to AR module for rendering
4. Health checks via `/api/health` for monitoring
