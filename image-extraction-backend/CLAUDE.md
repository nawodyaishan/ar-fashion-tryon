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
1. **Upload validation**: Check file type, size, and content
2. **Image loading**: Convert bytes to PIL Image (RGB)
3. **Save original**: Store to `static/uploads/` with UUID
4. **Classification**: TensorFlow CNN predicts garment type
5. **Validation**: Reject if not T-shirt or Trousers
6. **Extraction**: Remove background using rembg (u2net)
7. **Save cutout**: Store to `static/outputs/`
8. **Response**: Return classification + extraction results

**Service Layer Architecture**:

```
FastAPI App
    ↓
API Endpoints (app/api/endpoints.py)
    ↓
GarmentService (app/services/classification.py)
    ├─→ GarmentClassifier (app/models/classifier.py)
    │   └─→ TensorFlow CNN Model
    └─→ GarmentExtractor (app/services/extraction.py)
        └─→ rembg (u2net)
```

**Key Design Patterns**:
- **Dependency Injection**: Services are singleton instances injected via FastAPI dependencies
- **Configuration Management**: Centralized settings with environment variable support
- **Type Safety**: Full Pydantic schemas for requests/responses
- **Async Operations**: All service methods are async for better concurrency
- **Error Handling**: Structured error responses with HTTP status codes

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

**Classification Model**:
- Input: 224x224 RGB images (resized with LANCZOS)
- Preprocessing: Normalized to [0, 1] range
- Output: Softmax probabilities over classes (trousers=0, tshirt=1, other=2)
- Rejection: Predictions below tau threshold (0.688) are marked as "UNKNOWN"
- The model supports both "softmax" and "sigmoid_ovr" heads (configured in model_config.json)

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

### Image Processing Pipeline

1. **Background Removal**: Uses `rembg` library with default u2net model
2. **Alpha Compositing**: Custom `overlay_rgba_on_rgb()` function handles:
   - Scaling garment to match body proportions
   - Centering at calculated pose landmarks
   - Alpha blending with proper bounds checking

### Error Handling

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

### No Package Management

This service has **no requirements.txt or setup.py**. Dependencies must be manually installed:
- Flask 3.0+
- TensorFlow 2.x (Keras included)
- MediaPipe
- rembg
- Pillow (PIL)
- OpenCV (cv2)
- NumPy

### Configuration Files

- `class_labels.json`: Maps class names to integer indices
- `model_config.json`: Specifies model head type (softmax vs sigmoid_ovr)
- `rejection_threshold.json`: Confidence threshold (tau) for classification

### Limitations

- Only supports 2 garment types (T-shirt, Trousers)
- No real-time camera support (static images only)
- No 3D rendering (simple 2D overlay)
- No user authentication or session management
- Single-threaded Flask development server (not production-ready)
- No tests or CI/CD setup

### Debugging Tips

- Set `debug=True` in `app.run()` for auto-reload (already enabled)
- Check console logs for MediaPipe pose detection failures
- Verify model files exist and are valid TensorFlow SavedModel format
- Ensure uploaded images contain clear, unobstructed bodies for pose detection
- If garments appear incorrectly sized, adjust scaling factors in `place_garment()`

## Relationship to Main Project

This service is **independent** from the main AR Fashion Try-On system documented in `/CLAUDE.md`. The main system uses:
- FastAPI (not Flask) for ML backend
- NestJS for web backend
- Next.js for frontend
- YOLO v8 segmentation (not CNN classification)

This Flask service appears to be an earlier prototype or alternative implementation focused on simplicity over scalability.
