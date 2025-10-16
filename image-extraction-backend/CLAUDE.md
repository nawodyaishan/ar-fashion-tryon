# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a **FastAPI-based garment extraction and virtual try-on microservice** that classifies clothing items, removes backgrounds, constructs full outfits, and performs AI-powered virtual try-on using machine learning. It uses **Cloudinary for image storage** and **Gradio API (CatVTON) for virtual try-on**, making it suitable for cloud deployment.

**Core functionality:**
- **Classification**: TensorFlow CNN model identifies garment type (T-shirt, Trousers, or Other)
- **Background Removal**: Uses rembg (u2net model) to create transparent cutouts
- **Outfit Construction**: Merges upper + lower garments from cutouts (transparent backgrounds)
- **Virtual Try-On**: Integrates with Gradio Space (CatVTON) for realistic garment visualization
- **Cloud Storage**: Uploads originals, cutouts, and try-on results to Cloudinary
- **Dual Input Methods**: Accepts file uploads or image URLs

## Quick Start

### Installation

```bash
# Install dependencies
pip install -r requirements.txt
```

### Environment Setup

**Required environment variables:**
```bash
# Cloudinary credentials (REQUIRED)
export CLOUDINARY_CLOUD_NAME="your-cloud-name"
export CLOUDINARY_API_KEY="your-api-key"
export CLOUDINARY_API_SECRET="your-api-secret"

# HuggingFace Token (OPTIONAL - only if Gradio space is private)
export HF_TOKEN="hf_your_token_here"

# Optional configuration
export CLOUDINARY_FOLDER="garments"          # Base folder in Cloudinary
export MAX_CONTENT_MB="16"                   # Max upload size (default: 16MB)
export CORS_ALLOW_ORIGINS="*"                # CORS origins (default: *)
```

### Running the Service

```bash
# Development mode with auto-reload
uvicorn app:app --reload --host 0.0.0.0 --port 5000

# Production mode (Railway/Heroku deployment)
gunicorn -k uvicorn.workers.UvicornWorker -w 1 -b 0.0.0.0:$PORT app:app
```

The API runs on **http://localhost:5000** (or `$PORT` in production).

## API Endpoints

### Core Endpoints

1. **`GET /health`** - Health check with service status
2. **`POST /classify_garment`** - Classify garment + remove background
3. **`POST /classify_garment_by_url`** - Process image from URL
4. **`POST /detect_garment_type`** - Lightweight classification only (no background removal)
5. **`POST /construct_outfit`** - Merge upper + lower garments into full outfit
6. **`POST /virtual_tryon`** - AI-powered virtual try-on

### Example: Classify Garment

```bash
curl -X POST "http://localhost:5000/classify_garment" \
  -F "garment=@/path/to/shirt.jpg"
```

**Response:**
```json
{
  "label": "tshirt",
  "confidence": 0.9234,
  "garment_url": "https://res.cloudinary.com/.../garments/originals/garment_a1b2c3d4.jpg",
  "cutout_url": "https://res.cloudinary.com/.../garments/cutouts/cutout_a1b2c3d4.png",
  "cutout_path": "garments/cutouts/cutout_a1b2c3d4.png",
  "garment_public_id": "garments/originals/garment_a1b2c3d4",
  "cutout_public_id": "garments/cutouts/cutout_a1b2c3d4"
}
```

### Example: Construct Outfit (NEW - Uses Cutouts!)

```bash
curl -X POST "http://localhost:5000/construct_outfit" \
  -F "upper_garment=@shirt.jpg" \
  -F "lower_garment=@pants.jpg"
```

**Response:**
```json
{
  "success": true,
  "upper_garment": {
    "label": "tshirt",
    "confidence": 0.9534,
    "url": "https://res.cloudinary.com/.../upper_a1b2c3d4.jpg",
    "cutout_url": "https://res.cloudinary.com/.../upper_cutout_a1b2c3d4.png",
    "public_id": "garments/originals/upper_a1b2c3d4",
    "cutout_public_id": "garments/cutouts/upper_cutout_a1b2c3d4"
  },
  "lower_garment": {
    "label": "trousers",
    "confidence": 0.8821,
    "url": "https://res.cloudinary.com/.../lower_a1b2c3d4.jpg",
    "cutout_url": "https://res.cloudinary.com/.../lower_cutout_a1b2c3d4.png",
    "public_id": "garments/originals/lower_a1b2c3d4",
    "cutout_public_id": "garments/cutouts/lower_cutout_a1b2c3d4"
  },
  "outfit": {
    "url": "https://res.cloudinary.com/.../outfit_a1b2c3d4.png",
    "public_id": "garments/originals/outfit_a1b2c3d4",
    "format": "png",
    "description": "Merged outfit image from cutouts (transparent backgrounds)"
  }
}
```

**IMPORTANT:** `/construct_outfit` now removes backgrounds from BOTH garments before merging, creating a clean outfit visualization with transparent backgrounds.

### Example: Virtual Try-On (Classification Removed!)

```bash
curl -X POST "http://localhost:5000/virtual_tryon" \
  -F "person_image=@model.jpg" \
  -F "garment_image=@shirt.jpg" \
  -F "cloth_type=upper" \
  -F "process_garment=true"
```

**Response:**
```json
{
  "success": true,
  "person_url": "https://res.cloudinary.com/.../person_e5f6g7h8.jpg",
  "garment_url": "https://res.cloudinary.com/.../garment_e5f6g7h8.jpg",
  "cutout_url": "https://res.cloudinary.com/.../cutout_e5f6g7h8.png",
  "result_url": "https://res.cloudinary.com/.../tryon_e5f6g7h8.png",
  "result_public_id": "garments/tryon_results/tryon_e5f6g7h8",
  "cloth_type": "upper",
  "parameters": {
    "num_inference_steps": 50,
    "guidance_scale": 2.5,
    "seed": 42,
    "show_type": "result only"
  }
}
```

**IMPORTANT:** `/virtual_tryon` no longer includes `garment_classification` in response. Frontend already provides `cloth_type` parameter after classifying via `/detect_garment_type`, so backend classification is redundant.

## Architecture

### Modular FastAPI Application

The codebase uses a **modular architecture** with clear separation of concerns:

```
image-extraction-backend/
├── app.py                       # FastAPI endpoints & routing (727 lines)
├── config.py                    # Configuration & environment variables
├── models.py                    # Pydantic request/response models
├── middleware.py                # Request ID tracking middleware
├── services/                    # Business logic services
│   ├── classifier.py            # TensorFlow model loading & classification
│   ├── cloudinary_service.py   # Cloudinary upload/download utilities
│   ├── gradio_service.py        # Gradio API client & virtual try-on
│   └── image_processing.py     # Background removal & format conversion
├── models/                      # ML model files
│   ├── best_clothing_model.h5   # Production model (152MB)
│   ├── clothing_model_final.h5  # Alternative model for evaluation
│   ├── class_labels.json        # Label mappings
│   ├── model_config.json        # Model configuration
│   └── rejection_threshold.json # Confidence threshold (tau=0.75)
└── evaluate_model_thesis_colab.ipynb  # Evaluation notebook for thesis
```

**Design Principles:**
- **Modular**: Services separated by responsibility
- **Async**: All I/O operations use async/await
- **Graceful Degradation**: API continues if model loading fails (returns "UNKNOWN")
- **Stateless**: Processes in temp files, cleans up immediately
- **Cloud-Native**: No local file storage, uses Cloudinary exclusively
- **Request Tracking**: Unique request IDs for debugging

### Request Flow

**Classification Pipeline:**
```
1. Input Validation
   ├─→ File upload: Check extension, size, image validity
   └─→ URL upload: Download with size cap, verify image

2. Cloudinary Upload (Original)
   └─→ Upload to: {CLOUDINARY_FOLDER}/originals/garment_{token}

3. TensorFlow Classification
   ├─→ Preprocess: Resize to 224x224, normalize to [0,1]
   ├─→ Predict: Model inference with softmax output
   └─→ Apply threshold: Return "UNKNOWN" if confidence < tau (0.75)

4. Background Removal
   ├─→ rembg (u2net model): Remove background → RGBA PNG
   └─→ Cloudinary Upload: {CLOUDINARY_FOLDER}/cutouts/cutout_{token}.png

5. Cleanup & Response
   ├─→ Delete temp files
   └─→ Return JSON with URLs and metadata
```

**Construct Outfit Pipeline (UPDATED):**
```
1. Validate both garment uploads
2. Classify both garments (verify types)
3. Upload originals to Cloudinary
4. **Remove backgrounds from BOTH garments** ← NEW
5. **Upload both cutouts to Cloudinary** ← NEW
6. **Construct outfit from cutouts** (transparent backgrounds) ← CHANGED
7. Upload merged outfit
8. Return all URLs (originals, cutouts, outfit)
```

**Virtual Try-On Pipeline (UPDATED):**
```
1. Validate person and garment images
2. Upload person image to Cloudinary
3. If process_garment=true:
   - **Background removal only** (NO classification) ← CHANGED
   - Upload garment cutout
4. Convert images to PNG format (Gradio compatibility)
5. Call Gradio API with retry logic (3 attempts)
6. Download result and upload to Cloudinary
7. Cleanup temp files
8. Return all URLs (person, garment, cutout, result)
```

### Model Configuration

**Model Files:**

1. **`best_clothing_model.h5`** - Production model
   - TensorFlow 2.16.2 CNN
   - Input: 224x224x3 RGB
   - Output: 3-class softmax [trousers, tshirt, other]
   - Size: ~152 MB
   - Validation Accuracy: 78.7%

2. **`clothing_model_final.h5`** - Evaluation model
   - Used in evaluation notebook for thesis
   - Download URL: https://drive.google.com/file/d/1fWY0GbU-5JwUVtFky_zQ4HFFI5ibO2O8

3. **`class_labels.json`** - Label mappings
   ```json
   {
     "trousers": 0,
     "tshirt": 1,
     "other": 2
   }
   ```
   **Important:** Model training order is Index 0 = trousers, Index 1 = tshirt, Index 2 = other

4. **`rejection_threshold.json`** - Confidence threshold
   ```json
   {
     "threshold": 0.75
   }
   ```
   Default tau = 0.75. Lower values = more permissive classification.

**Label Normalization:**
- Backend maps internal labels to frontend-compatible values:
  - `"trouser"` → `"trousers"` (plural)
  - `"other"` → `"unknown"` (lowercase)
- Ensures consistency across frontend/backend

**Graceful Degradation:**
- If model fails to load at startup, classification returns `("UNKNOWN", 0.0)`
- Background removal and virtual try-on continue to work normally
- API remains operational even with model errors

### Cloudinary Integration

**Configuration:**
```python
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True,
)
```

**Folder Structure:**
- Originals: `{CLOUDINARY_FOLDER}/originals/garment_{token}` or `person_{token}`
- Cutouts: `{CLOUDINARY_FOLDER}/cutouts/cutout_{token}.png`
- Try-On Results: `{CLOUDINARY_FOLDER}/tryon_results/tryon_{token}.png`
- Default `CLOUDINARY_FOLDER`: "garments"

**Features:**
- Thread pool execution for async endpoints
- Automatic format conversion (WebP → PNG)
- Size limit enforcement (16MB default)
- 20-second timeout for URL downloads

### Gradio Integration (Virtual Try-On)

**Configuration:**
```python
GRADIO_SPACE = "nawodyaishan/ar-fashion-tryon"
HF_TOKEN = os.getenv("HF_TOKEN")  # Optional, for private spaces
```

**Features:**
- Singleton pattern for client connection
- Retry logic: 3 attempts with exponential backoff (1s, 2s, 4s)
- Graceful fallback if startup connection fails
- Layered image format for person images
- PNG conversion for Gradio compatibility

**Parameters:**
- `cloth_type`: "upper", "lower", or "overall"
- `num_inference_steps`: 10-100 (higher = better quality, slower)
- `guidance_scale`: 0.0-7.5 (default: 2.5)
- `seed`: Random seed for reproducibility (-1 for random)
- `show_type`: "result only", "input & result", or "input & mask & result"

### Error Handling

**HTTP Status Codes:**
- **200 OK**: Success
- **400 Bad Request**: Invalid input (wrong format, corrupt file, etc.)
- **413 Payload Too Large**: File exceeds MAX_CONTENT_MB
- **500 Internal Server Error**: Processing failed, Cloudinary errors
- **503 Service Unavailable**: Gradio API unavailable

**Request Tracking:**
- Every request gets a unique 8-character ID
- Included in logs: `[request_id] message`
- Included in error responses: `X-Request-ID` header

**Common Error Messages:**
```json
{"detail": "File type not allowed. Allowed: jpg, jpeg, png"}
{"detail": "File too large (>16MB)"}
{"detail": "Uploaded file is not a valid image"}
{"detail": "Processing failed: <error details>"}
{"detail": "Unable to connect to AI service: <error details>"}
```

## Development Notes

### Model Training & Evaluation

**Training Notebook:**
- `train_clothing_classifier_colab.ipynb` - Full training pipeline for Google Colab
- Trains 3-class CNN (trousers, tshirt, other)
- Generates `best_clothing_model.h5`

**Evaluation Notebook (UPDATED):**
- `evaluate_model_thesis_colab.ipynb` - Generates thesis evaluation materials
- **No training required** - downloads pre-trained model
- Model file: `clothing_model_final.h5` (from Google Drive)
- **All results saved to Google Drive** with timestamped folders
- Generates 5 publication-quality figures (300 DPI):
  1. Confusion matrices (counts & normalized)
  2. ROC curves (one-vs-rest)
  3. Precision-Recall curves
  4. Per-class metrics bar chart
  5. Sample predictions (correct & incorrect)
- Exports: JSON metrics, LaTeX tables, CSV reports, prediction data
- Google Drive structure:
  ```
  clothing_classification_thesis/
  └── evaluation_results/
      └── YYYYMMDD_HHMMSS/
          ├── figures/
          ├── metrics/
          ├── predictions/
          └── EVALUATION_SUMMARY.txt
  ```

### Dependencies

**Key packages:**
- `fastapi` - Web framework
- `uvicorn[standard]` - ASGI server
- `tensorflow` - CNN model inference (2.16.2)
- `rembg` - Background removal (u2net)
- `cloudinary` - Cloud image storage
- `gradio-client>=0.10.0` - Gradio API client
- `pillow` - Image processing
- `numpy` - Array operations

**Python Version:** 3.9+ (TensorFlow requirement)

### Deployment

**Railway Deployment:**
- Configuration: `nixpacks.toml`
- Automatic model download from Google Drive via `download_models_railway_v2.sh`
- Build time: 5-8 minutes (includes 293MB model download)
- Single worker: `-w 1` to avoid loading model multiple times

**Environment Variables (Production):**
```bash
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
GDRIVE_MODEL_FILE_ID=xxx  # For model download during build
CORS_ALLOW_ORIGINS=https://frontend.com
```

**Build Process:**
1. Python venv creation
2. Dependencies installation (~2 min)
3. Model download from Google Drive (~1-2 min)
4. Model validation with TensorFlow
5. Application startup

### Common Issues

1. **Model not loading**: Check TensorFlow version compatibility, try `compile=False`
2. **Cloudinary 401**: Verify credentials and API key permissions
3. **Slow first request**: rembg downloads u2net model on first use (~30-60 seconds)
4. **CORS errors**: Update `CORS_ALLOW_ORIGINS` environment variable
5. **413 errors**: Increase `MAX_CONTENT_MB` or reduce upload size
6. **Gradio connection failed**: Check if `nawodyaishan/ar-fashion-tryon` Space is running
7. **Gradio 503 errors**: Space may be sleeping (takes 30-60 seconds to wake up)
8. **Virtual try-on timeout**: Increase retry attempts or check Gradio Space logs
9. **Label swapping**: Ensure `class_labels.json` has correct order (trousers=0, tshirt=1, other=2)

### Debugging

**Enable verbose logging:**
```bash
# Check service files for TF_CPP_MIN_LOG_LEVEL setting
# Set to "0" for full TensorFlow logging
```

**Test model loading locally:**
```python
from tensorflow.keras.models import load_model
model = load_model('models/best_clothing_model.h5', compile=False)
print(model.summary())
```

**Verify Cloudinary connection:**
```python
import cloudinary
import cloudinary.api
cloudinary.config(cloud_name="xxx", api_key="xxx", api_secret="xxx")
print(cloudinary.api.ping())  # Should return {'status': 'ok'}
```

## Recent Updates & Bug Fixes

### Recent Changes (2025-10-12)

**Outfit Construction Enhancement:**
- `/construct_outfit` now removes backgrounds from BOTH garments before merging
- Response includes `cutout_url` and `cutout_public_id` for upper and lower garments
- Outfit is constructed from cutouts (transparent backgrounds) for cleaner visualization
- Updated endpoint documentation in response fields

**Virtual Try-On Simplification:**
- Removed redundant classification from `/virtual_tryon` endpoint
- Frontend already sends `cloth_type` after classifying via `/detect_garment_type`
- Backend only performs background removal when `process_garment=true`
- Response no longer includes `garment_classification` field
- More efficient processing (eliminates duplicate work)

**Evaluation Notebook Updates:**
- Updated to use `clothing_model_final.h5` from new Google Drive link
- All evaluation results now saved to Google Drive (organized by timestamp)
- Enhanced with timestamped folder structure for each evaluation run
- Generates comprehensive summary files and exports in multiple formats
- Optional zip download for local backup

### Known Limitations

- Only supports 3 garment classes (trousers, tshirt, other)
- No batch processing (one image per request)
- No user authentication or API keys
- No rate limiting
- Temp files used for processing (I/O overhead)
- Model loaded once per worker (scale workers carefully)
- rembg uses significant CPU/RAM per request
- Cloudinary free tier limits: 25GB storage, 25GB bandwidth

## Integration with Main Project

This microservice is part of the larger AR Fashion Try-On system:

**Main system architecture:**
- **Frontend**: Next.js (http://localhost:3000)
- **Web Backend**: NestJS (http://localhost:3001)
- **ML Backend**: FastAPI (http://localhost:8000) - YOLO v8 segmentation
- **AR Module**: TypeScript + Three.js
- **This Service**: Garment extraction (http://localhost:5000)

**Integration flow:**
1. User uploads garment image via Next.js frontend
2. Frontend calls `/detect_garment_type` for quick classification
3. Frontend calls this service at `/classify_garment` for full processing
4. This service returns Cloudinary URLs for original + cutout
5. NestJS backend stores URLs in PostgreSQL
6. Frontend fetches cutout URL for AR rendering or virtual try-on
7. For virtual try-on, frontend calls `/virtual_tryon` with `cloth_type` parameter

**Key differences from ML backend:**
- ML backend: YOLO v8 for **pose estimation** and **body segmentation**
- This service: CNN for **garment classification** and rembg for **background removal**
- ML backend: Local file storage
- This service: Cloudinary cloud storage
- Both are FastAPI but serve different purposes

**Deployment strategy:**
- This service deploys independently (Railway)
- Set `CORS_ALLOW_ORIGINS` to include frontend/backend origins
- Main backend stores Cloudinary URLs in database (not local paths)

---

**Last Updated:** 2025-10-12
**API Version:** 2.0.0
