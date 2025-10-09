# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a **FastAPI-based garment extraction and virtual try-on microservice** that classifies clothing items, removes backgrounds, and performs AI-powered virtual try-on using machine learning. It uses **Cloudinary for image storage** and **Gradio API for virtual try-on**, making it suitable for cloud deployment.

**Core functionality:**
- **Classification**: TensorFlow CNN model identifies garment type (T-shirt or Trousers)
- **Background Removal**: Uses rembg (u2net model) to create transparent cutouts
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

### API Endpoints

1. **`GET /health`** - Health check
   ```bash
   curl http://localhost:5000/health
   # Returns: {"status": "ok"}
   ```

2. **`POST /classify_garment`** - Upload file for classification + extraction
   ```bash
   curl -X POST "http://localhost:5000/classify_garment" \
     -F "garment=@/path/to/shirt.jpg"
   ```

3. **`POST /classify_garment_by_url`** - Process image from URL
   ```bash
   curl -X POST "http://localhost:5000/classify_garment_by_url" \
     -H "Content-Type: application/json" \
     -d '{"source_url": "https://example.com/image.jpg"}'
   ```

4. **`POST /virtual_tryon`** - Complete virtual try-on with Gradio API
   ```bash
   curl -X POST "http://localhost:5000/virtual_tryon" \
     -F "person_image=@/path/to/person.jpg" \
     -F "garment_image=@/path/to/garment.jpg" \
     -F "cloth_type=upper" \
     -F "num_inference_steps=50" \
     -F "guidance_scale=2.5" \
     -F "seed=42" \
     -F "show_type=result only" \
     -F "process_garment=true"
   ```

   Parameters:
   - `person_image`: Person/model image file (required)
   - `garment_image`: Garment/clothing image file (required)
   - `cloth_type`: "upper", "lower", or "overall" (default: "upper")
   - `num_inference_steps`: Number of diffusion steps (default: 50)
   - `guidance_scale`: Guidance scale for diffusion (default: 2.5)
   - `seed`: Random seed for reproducibility (default: 42)
   - `show_type`: "result only", "input & result", or "input & mask & result" (default: "result only")
   - `process_garment`: Whether to classify and remove background first (default: true)

### Example Responses

**Garment Classification Response** (`/classify_garment`):
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

**Virtual Try-On Response** (`/virtual_tryon`):
```json
{
  "success": true,
  "person_url": "https://res.cloudinary.com/.../garments/originals/person_e5f6g7h8.jpg",
  "garment_url": "https://res.cloudinary.com/.../garments/originals/garment_e5f6g7h8.jpg",
  "cutout_url": "https://res.cloudinary.com/.../garments/cutouts/cutout_e5f6g7h8.png",
  "result_url": "https://res.cloudinary.com/.../garments/tryon_results/tryon_e5f6g7h8.png",
  "result_public_id": "garments/tryon_results/tryon_e5f6g7h8",
  "cloth_type": "upper",
  "parameters": {
    "num_inference_steps": 50,
    "guidance_scale": 2.5,
    "seed": 42,
    "show_type": "result only"
  },
  "garment_classification": {
    "label": "tshirt",
    "confidence": 0.9234
  }
}
```

## Architecture

### Single-File FastAPI Application

This implementation uses a **monolithic single-file architecture** (`app.py`) for simplicity and ease of deployment. The entire service is ~320 lines with clear section demarcation:

```
app.py (318 lines)
├── Lines 1-43:   Imports, constants, Cloudinary config
├── Lines 45-57:  FastAPI app + CORS middleware
├── Lines 59-102: Model loading (TensorFlow CNN)
├── Lines 104-162: Helper functions (preprocessing, classification, cutout, upload)
├── Lines 164-170: Pydantic schemas
└── Lines 172-317: API routes (/health, /classify_garment, /classify_garment_by_url)
```

**Key design decision**: Unlike the previously planned multi-module FastAPI structure (app/models, app/services, app/api), this implementation prioritizes:
- **Simplicity**: Single file, easy to understand and deploy
- **Cloud-native**: No local file storage, uses Cloudinary exclusively
- **Stateless**: Processes in temp files, cleans up immediately
- **Lightweight**: Minimal dependencies, fast cold starts

### Request Flow

Both endpoints follow the same pipeline:

```
1. Input Validation
   ├─→ File upload: Check extension, size, image validity
   └─→ URL upload: Download with size cap, verify image

2. Cloudinary Upload (Original)
   └─→ Upload to: {CLOUDINARY_FOLDER}/originals/garment_{token}

3. TensorFlow Classification (Optional - fails gracefully)
   ├─→ Preprocess: Resize to 224x224, normalize to [0,1]
   ├─→ Predict: Model inference with softmax output
   └─→ Apply threshold: Return "UNKNOWN" if confidence < tau

4. Background Removal
   ├─→ rembg (u2net model): Remove background → RGBA PNG
   └─→ Cloudinary Upload: {CLOUDINARY_FOLDER}/cutouts/cutout_{token}.png

5. Cleanup & Response
   ├─→ Delete temp file
   └─→ Return JSON with URLs and metadata
```

### Model Configuration

**Model Files** (in `models/` directory):

1. **`best_clothing_model.h5`** (REQUIRED)
   - TensorFlow/Keras CNN model
   - Input: 224x224x3 RGB images
   - Output: 3-class softmax [trousers, tshirt, other]
   - Loaded at startup with `compile=False` for cross-version compatibility

2. **`class_labels.json`** (OPTIONAL - defaults provided)
   ```json
   {
     "trousers": 0,
     "tshirt": 1,
     "other": 2
   }
   ```
   Maps class names to model output indices.

3. **`model_config.json`** (OPTIONAL)
   ```json
   {
     "head_type": "softmax",
     "img_size": 224
   }
   ```
   - `head_type`: "softmax" (standard) or custom head configuration
   - `img_size`: Image preprocessing size (default: 224)

4. **`rejection_threshold.json`** (OPTIONAL - default: 0.0)
   ```json
   {
     "threshold": 0.688822329044342
   }
   ```
   Minimum confidence for accepting predictions. Lower values = more permissive.

**Model Loading Behavior** (`app.py:73-97`):
- Loads model asynchronously on startup (`@app.on_event("startup")`)
- Sets `TF_CPP_MIN_LOG_LEVEL=2` to reduce TensorFlow logging
- If model fails to load, stores error in `_tf_err` and raises at runtime
- Falls back to sensible defaults if JSON configs missing

**Graceful Degradation**: If model loading fails, classification returns `("UNKNOWN", 0.0)` and continues with background removal (`app.py:216-219`).

### Cloudinary Integration

**Configuration** (`app.py:35-43`):
```python
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True,
)
```

**Folder Structure**:
- Originals: `{CLOUDINARY_FOLDER}/originals/garment_{token}` or `person_{token}`
- Cutouts: `{CLOUDINARY_FOLDER}/cutouts/cutout_{token}.png`
- Try-On Results: `{CLOUDINARY_FOLDER}/tryon_results/tryon_{token}.png`
- Default `CLOUDINARY_FOLDER`: "garments" (override with env var)

**Upload Helper** (`app.py:139-148`):
```python
def _cloudinary_upload_bytes(data: bytes, public_id: str, folder: str, fmt: Optional[str] = None)
```
- Uploads raw bytes to Cloudinary
- Returns full response dict with `secure_url`
- Overwrites existing files with same `public_id`
- Thread pool execution to avoid blocking async endpoints

**URL Download** (`app.py:150-162`):
- Streams download in 64KB chunks
- Enforces size limit (`MAX_CONTENT_BYTES`)
- 20-second timeout for external URLs
- Validates image format after download

### Gradio Integration (Virtual Try-On)

**Gradio Space Configuration** (`app.py:48-51`):
```python
GRADIO_SPACE = "nawodyaishan/ar-fashion-tryon"
HF_TOKEN = os.getenv("HF_TOKEN")  # Optional, for private spaces
gradio_client: Optional[Client] = None  # Singleton instance
```

**Client Management** (`app.py:173-191`):
- Uses singleton pattern for Gradio client connection
- Connects on first use or during startup
- HF_TOKEN required only if Gradio Space is private
- Graceful fallback: if pre-connection fails at startup, retries on first request

**Virtual Try-On Workflow** (`app.py:419-630`):
1. **Input Validation**: Validates both person and garment images
2. **Cloudinary Upload**: Uploads person image to originals folder
3. **Optional Garment Processing**:
   - If `process_garment=true`: classify + background removal
   - If `process_garment=false`: use original garment image
4. **Gradio API Call**: Calls CatVTON model with retry logic (3 attempts)
5. **Result Upload**: Downloads result from Gradio and uploads to Cloudinary
6. **Cleanup**: Removes temporary files
7. **Response**: Returns all URLs (person, garment, cutout, result)

**Retry Logic** (`app.py:208-260`):
- Maximum 3 attempts with exponential backoff (1s, 2s, 4s)
- Handles transient Gradio API failures
- Raises HTTPException 500 after all retries exhausted

**Gradio API Parameters**:
- `person_image`: Layered image format `{"background": handle_file(...), "layers": [], "composite": None}`
- `cloth_image`: Simple file reference via `handle_file(path)`
- `cloth_type`: "upper", "lower", or "overall"
- `num_inference_steps`: Diffusion model steps (higher = better quality, slower)
- `guidance_scale`: How closely to follow the prompt (default: 2.5)
- `seed`: Random seed for reproducibility
- `show_type`: Output format - "result only", "input & result", or "input & mask & result"

### CORS & Middleware

**CORS Configuration** (`app.py:48-54`):
- Default: Allow all origins (`*`)
- Production: Set `CORS_ALLOW_ORIGINS` to comma-separated list
  ```bash
  export CORS_ALLOW_ORIGINS="http://localhost:3000,https://app.example.com"
  ```

**Proxy Headers Middleware** (`app.py:56`):
- Trusts `X-Forwarded-*` headers from Railway/Heroku
- Ensures correct HTTPS scheme in redirects
- Required for proper URL generation behind proxies

### Error Handling

**HTTP Status Codes**:
- **200 OK**: Success (includes classification results)
- **400 Bad Request**: Invalid file type, empty filename, invalid URL, corrupt image
- **413 Payload Too Large**: File exceeds `MAX_CONTENT_MB`
- **500 Internal Server Error**: Cloudinary upload failure, background removal failure, unhandled exceptions

**Global Exception Handler** (`app.py:314-317`):
- Catches all unhandled exceptions
- Logs to console with `repr(exc)`
- Returns 500 with error message

**Common Error Messages**:
```json
// File type not allowed
{"detail": "File type not allowed. Allowed: jpg, jpeg, png"}

// File too large
{"detail": "File too large (>16MB)"}

// Invalid image
{"detail": "Uploaded file is not a valid image"}

// Cloudinary failure
{"detail": "Cloudinary upload (original) failed: <error>"}

// Background removal failure
{"detail": "Background removal failed: <error>"}
```

## Development Notes

### Dependencies

From `requirements.txt`:
```
fastapi                   # Web framework
uvicorn[standard]         # ASGI server
python-multipart          # File upload support
pillow                    # Image processing
numpy                     # Array operations
rembg                     # Background removal (u2net)
onnxruntime               # rembg dependency
opencv-python-headless    # Image operations (headless for Docker)
tensorflow                # CNN model inference
gunicorn                  # Production WSGI server
cloudinary                # Cloud image storage
requests                  # HTTP client for URL downloads
gradio-client>=0.10.0     # Gradio API client for virtual try-on
python-dotenv             # Environment variable management
```

**Python Version**: 3.9+ (TensorFlow requirement)

**GPU Support**: TensorFlow auto-detects CUDA; falls back to CPU if unavailable.

### Deployment

**Procfile** (for Railway/Heroku):
```
web: gunicorn -k uvicorn.workers.UvicornWorker -w 1 -b 0.0.0.0:$PORT app:app
```

**Key deployment considerations**:
- Use `-w 1` (single worker) to avoid loading model multiple times
- Model file (~50-200MB) must be committed to repo or mounted volume
- First request may be slow due to rembg downloading u2net model (~200MB)
- Set appropriate `MAX_CONTENT_MB` based on platform limits (Railway: 100MB, Heroku: 30MB)

### Debugging

**Enable verbose logging**:
```bash
# Remove TensorFlow logging suppression
# Comment out line 77 in app.py:
# os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
```

**Test model loading**:
```python
# In Python REPL
from tensorflow.keras.models import load_model
model = load_model('models/best_clothing_model.h5', compile=False)
print(model.summary())
```

**Check Cloudinary connection**:
```python
import cloudinary
import cloudinary.api
cloudinary.config(
    cloud_name="your-cloud-name",
    api_key="your-api-key",
    api_secret="your-api-secret"
)
print(cloudinary.api.ping())  # Should return {'status': 'ok'}
```

**Common issues**:
1. **Model not loading**: Check TensorFlow version compatibility, try `compile=False`
2. **Cloudinary 401**: Verify credentials, check API key permissions
3. **Slow first request**: rembg downloads u2net model on first use (~30-60 seconds)
4. **CORS errors**: Update `CORS_ALLOW_ORIGINS` environment variable
5. **413 errors**: Increase `MAX_CONTENT_MB` or reduce client upload size
6. **Gradio connection failed**: Check if `nawodyaishan/ar-fashion-tryon` Space is running on HuggingFace
7. **Gradio 503 errors**: Space may be sleeping/cold starting (takes 30-60 seconds to wake up)
8. **Virtual try-on timeout**: Increase retry attempts or check Gradio Space logs
9. **HF_TOKEN errors**: Only needed if Space is private; verify token has read access

### Limitations

**Current implementation**:
- Only supports 3 garment classes (trousers, tshirt, other)
- No batch processing (one image per request)
- No user authentication or API keys
- No caching or rate limiting
- Classification is optional (fails gracefully)
- Temp files used for processing (I/O overhead)

**Scalability considerations**:
- Model loaded once per worker (increase workers carefully)
- rembg uses significant CPU/RAM per request
- Cloudinary has free tier limits (25GB storage, 25GB bandwidth)

## Relationship to Main Project

This microservice is part of the larger AR Fashion Try-On system. Integration points:

**Main system architecture** (from `/CLAUDE.md`):
- **Frontend**: Next.js (http://localhost:3000)
- **Web Backend**: NestJS (http://localhost:3001)
- **ML Backend**: FastAPI (http://localhost:8000) - YOLO v8 segmentation
- **AR Module**: TypeScript + Three.js
- **This Service**: Garment extraction (http://localhost:5000)

**Integration flow**:
1. User uploads garment image via Next.js frontend
2. NestJS backend forwards to **this service** at `/classify_garment`
3. This service returns Cloudinary URLs for original + cutout
4. NestJS stores URLs in PostgreSQL
5. Frontend fetches cutout URL for AR rendering
6. AR Module uses MediaPipe + Three.js for virtual try-on

**Key differences from ML backend**:
- ML backend uses YOLO v8 for **pose estimation** and **body segmentation**
- This service uses CNN for **garment classification** and rembg for **background removal**
- ML backend uses local file storage; this service uses Cloudinary
- Both are FastAPI but serve different purposes

**Deployment strategy**:
- This service deploys independently (Railway/Heroku)
- Set `CORS_ALLOW_ORIGINS` to include main frontend/backend origins
- Main backend stores Cloudinary URLs in database (not local paths)
