# AR Fashion Try-On Project Specification

This document preserves the long-form project specification that previously lived in the root README. The root README is now intentionally short and marketing-oriented; this file is the canonical deep technical overview for contributors, reviewers, AI agents, and future maintainers.

## Overview

AR Fashion Try-On is a full-stack augmented reality and AI-powered virtual garment try-on system for e-commerce. It combines real-time AR preview with ML-powered photo-realistic virtual try-on using state-of-the-art deep learning models.

The current production-oriented implementation uses:

- `web-frontend/` for the Next.js user interface
- `garment-processing-api/` for garment classification, cutout generation, outfit construction, Cloudinary integration, and try-on orchestration
- `catvton-gradio/` for CatVTON virtual try-on inference
- Cloudinary for image storage, optimization, and CDN delivery

Older documentation may mention `image-extraction-backend`, `ml-backend`, or `web-backend`. Those names refer to earlier project structure. The active image extraction service is now `garment-processing-api/`, and old backend experiments are kept under `deprecated-backends/`.

## Feature Scope

### Dual-Mode Virtual Try-On System

#### Live AR Preview Mode

- Real-time webcam garment overlay
- MediaPipe pose detection with 33-point skeleton tracking
- Interactive garment positioning and transforms
- Draggable and resizable garment controls
- Snap-to-shoulders alignment
- Keyboard shortcuts for precise adjustments

#### Photo Try-On HD Mode

Photo Try-On HD supports three workflows for different use cases.

Normal Mode, also called Single Garment:

- Upload or capture a single garment photo
- AI-powered garment classification with TensorFlow/Keras
- Automatic background removal with U2NET through `rembg`
- Dynamic cloth type detection for upper, lower, and unknown classes
- Smart filtering of applicable try-on options
- Professional-quality results through the CatVTON model

Full Outfit Mode:

- Upload separate upper and lower garments
- Independent AI classification for both pieces
- Automatic outfit construction through the backend API
- Intelligent garment merging and alignment
- Preview constructed outfit before try-on
- Forced `overall` cloth type for complete outfit try-on

Full Reference Mode:

- Use a full-body reference photo as a style guide
- Skip garment classification for maximum flexibility
- Manual cloth type selection
- Experimental style transfer behavior
- Defaults to `overall` for full-body style matching

### Core Capabilities

- Dual camera capture with front-facing body capture and rear-facing garment capture
- TensorFlow CNN garment classification trained on fashion data
- U2NET background removal for professional garment cutouts
- Cloudinary CDN image storage and delivery
- Mobile-first responsive UI
- Advanced ML controls for inference steps, guidance scale, and seed
- Smart downloads with timestamped filenames
- AR transforms for scale, rotation, and opacity
- Real-time classification with confidence scores
- Desktop, mobile web, and tablet support

## System Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                         │
│                    http://localhost:3000                        │
│                                                                 │
│  ┌──────────────────┐              ┌──────────────────────┐    │
│  │  Live AR Mode    │              │  Photo Try-On HD     │    │
│  │  - MediaPipe     │              │  - 3 Path Wizard     │    │
│  │  - Three.js      │              │  - Camera Capture    │    │
│  │  - Webcam        │              │  - Upload/Preview    │    │
│  └──────────────────┘              └──────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              GARMENT PROCESSING API (FastAPI)                   │
│                    http://localhost:5000                        │
│                                                                 │
│  /detect_garment_type                                           │
│  - TensorFlow CNN classifier                                    │
│  - Returns label and confidence                                 │
│                                                                 │
│  /classify_garment and /classify_garment_by_url                 │
│  - Garment classification                                       │
│  - U2NET background removal                                     │
│  - PNG cutout generation                                        │
│                                                                 │
│  /construct_outfit                                              │
│  - Merges upper and lower garments                              │
│  - Uploads outfit to Cloudinary                                 │
│                                                                 │
│  /virtual_tryon                                                 │
│  - Orchestrates person and garment upload                       │
│  - Calls CatVTON Gradio or Hugging Face Space                   │
│  - Persists result to Cloudinary                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               VIRTUAL TRY-ON (Gradio / CUDA)                    │
│                    http://localhost:7860                        │
│                                                                 │
│  CatVTON Pipeline                                               │
│  - Stable Diffusion inpainting                                  │
│  - UNet2D inpainting                                            │
│  - VAE encoder/decoder                                          │
│  - DensePose detection                                          │
│  - SCHP segmentation                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CLOUDINARY CDN                          │
│                                                                 │
│  Folders:                                                       │
│  - originals                                                    │
│  - cutouts                                                      │
│  - tryon_results                                                │
│  - outfits                                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Service Details

| Service | Technology | Port | Purpose | Status |
| --- | --- | --- | --- | --- |
| Frontend | Next.js, TypeScript | `3000` | UI, AR preview, photo wizard | Active |
| Garment Processing API | FastAPI, Python, TensorFlow | `5000` | Classification, background removal, outfit construction | Active |
| Virtual Try-On | Gradio, PyTorch | `7860` | CatVTON inference | Active / hosted option |
| Cloudinary | Cloud CDN | N/A | Image storage, optimization, delivery | Active |
| Legacy Web Backend | NestJS, TypeScript | `3001` | Historical REST API experiments | Deprecated |
| Legacy ML Backend | FastAPI/Flask, YOLO | varies | Historical ML experiments | Deprecated |
| AR Module | Three.js, MediaPipe | client-side | Pose-driven AR | Active in frontend |

## Quick Start

### Prerequisites

Required:

- Node.js 18+
- Python 3.10+
- `pnpm`
- `uv`

Optional:

- CUDA-capable GPU for local CatVTON inference
- Docker for containerized supporting services
- Cloudinary account
- Hugging Face account or token for private spaces

### Frontend Setup

```bash
cd web-frontend
pnpm install
pnpm dev
```

Set frontend API URLs in `web-frontend/.env.local`:

```bash
NEXT_PUBLIC_GARMENT_API_BASE=http://127.0.0.1:5000
NEXT_PUBLIC_VTON_API_BASE=http://127.0.0.1:7860
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_preset
```

Open `http://localhost:3000`.

### Garment Processing API Setup

```bash
cd garment-processing-api
uv sync
uv run bash scripts/download_models_local.sh

cp .env.example .env
# Fill in Cloudinary credentials and optional HF_TOKEN.

uv run uvicorn app:app --reload --host 0.0.0.0 --port 5000
```

Open `http://localhost:5000/docs`.

### Virtual Try-On Setup

Option A: Use a configured Hugging Face Space.

- No local GPU setup required
- Accessed through the API client
- Subject to hosted GPU quotas and cold starts

Option B: Run locally.

```bash
cd catvton-gradio
python app.py
```

Open `http://localhost:7860`. Local inference can require 8-10 GB or more of GPU memory.

## Technology Stack

### Frontend

- Next.js with App Router
- TypeScript
- Tailwind CSS
- shadcn/ui and Radix UI primitives
- Zustand for state management
- Axios for HTTP requests
- MediaPipe Pose for pose detection
- Three.js and React Three Fiber for AR rendering
- Camera APIs for front and rear camera capture

### Garment Processing API

- FastAPI with async Python routes
- TensorFlow/Keras CNN for garment classification
- `rembg` with U2NET for background removal
- OpenCV, Pillow, and NumPy for image processing
- Cloudinary SDK for uploads and CDN delivery
- Gradio client for CatVTON integration
- Uvicorn for development and Gunicorn for production
- `uv` for dependency management

### Virtual Try-On

- CatVTON category-based virtual try-on
- Stable Diffusion inpainting base
- PyTorch with CUDA support
- AutoencoderKL VAE image compression
- UNet2D conditional diffusion
- DensePose body surface mapping
- SCHP human parsing and segmentation
- Custom attention for garment detail preservation
- DDIM sampling
- Gradio UI and API surface

## User Workflows

### Live AR Preview

1. User opens the try-on page in AR mode.
2. User enables camera access.
3. MediaPipe detects body pose in real time.
4. User selects or uploads a garment.
5. The backend creates a transparent garment cutout when needed.
6. Garment overlay is positioned on the body.
7. User adjusts drag, resize, scale, rotation, or opacity controls.
8. User captures the final AR preview.

### Photo Try-On: Normal Path

1. User selects Single Garment mode.
2. User uploads or captures a body photo.
3. User uploads or captures a garment photo.
4. API detects garment type and confidence.
5. UI filters cloth type options based on the detected class.
6. User optionally adjusts inference settings.
7. API uploads images, calls CatVTON, and stores the result.
8. Frontend displays the result with download action.

### Photo Try-On: Full Outfit Path

1. User selects Complete Outfit mode.
2. User uploads or captures a body photo.
3. User uploads an upper garment.
4. User uploads a lower garment.
5. API classifies both garments.
6. API constructs and uploads a merged outfit image.
7. User previews the constructed outfit.
8. API calls virtual try-on with `cloth_type=overall`.
9. Frontend displays the final try-on result.

### Photo Try-On: Reference Path

1. User selects Full Reference mode.
2. User uploads or captures a body photo.
3. User uploads a full-body reference image.
4. UI skips garment classification.
5. User manually selects cloth type.
6. API calls virtual try-on with `process_garment=false`.
7. Result is displayed and can be downloaded.

## API Reference Summary

Full active API documentation lives at:

- `garment-processing-api/docs/api/API_DOCUMENTATION.md`
- `http://localhost:5000/docs` when the API is running locally

### Health Check

```http
GET /health
```

Example response:

```json
{
  "status": "ok",
  "model_loaded": true,
  "model_name": "best_clothing_model.h5",
  "version": "1.0.0"
}
```

### Garment Type Detection

```http
POST /detect_garment_type
Content-Type: multipart/form-data
```

Parameters:

- `image`: garment image file

Example response:

```json
{
  "label": "tshirt",
  "confidence": 0.9234,
  "processing_time_ms": 187
}
```

### Garment Classification and Cutout

```http
POST /classify_garment
Content-Type: multipart/form-data
```

Parameters:

- `image`: garment image file

Typical response includes:

- original Cloudinary URL
- cutout Cloudinary URL
- classification label
- classification confidence

### Outfit Construction

```http
POST /construct_outfit
Content-Type: multipart/form-data
```

Parameters:

- `upper_garment`: upper garment file
- `lower_garment`: lower garment file

Typical response includes classification data for both garments and a merged outfit URL.

### Virtual Try-On

```http
POST /virtual_tryon
Content-Type: multipart/form-data
```

Parameters:

- `person_image`: person or body image
- `garment_image`: garment, outfit, or reference image
- `cloth_type`: `upper`, `lower`, or `overall`
- `num_inference_steps`: usually 20-100
- `guidance_scale`: usually 1.0-10.0
- `seed`: deterministic generation seed
- `show_type`: output mode
- `process_garment`: whether to classify and cut out the garment first

Typical response includes Cloudinary URLs for inputs, cutouts, and try-on output.

## Implementation Details

### Camera Capture

- Body photos use front-facing camera mode.
- Body preview is mirrored for a natural selfie experience.
- Garment photos prefer rear-facing camera mode.
- Garment preview is not mirrored.
- Camera streams are cleaned up on unmount.
- File upload remains available when camera permission is unavailable.

### Garment Classification

- Model input is 224x224 RGB.
- Output classes are trousers, tshirt, and other.
- Preprocessing resizes and normalizes image input.
- Low-confidence predictions are rejected as unknown.
- JSON metadata in `garment-processing-api/models/` defines label order and inference settings.

### Model File Policy

Large TensorFlow model files are not meant to be pushed in normal Git history:

- `garment-processing-api/models/best_clothing_model.h5`
- `garment-processing-api/models/clothing_model_final.h5`

Restore them locally with:

```bash
cd garment-processing-api
uv run bash scripts/download_models_local.sh
```

The script downloads `trained_models.zip` from Google Drive, copies `.h5` files into the correct directory, and preserves committed JSON metadata.

### Background Removal

- Uses `rembg` and U2NET.
- Accepts common image formats.
- Produces RGBA PNG cutouts with transparent background.
- Output is suitable for AR overlays and try-on preprocessing.

### Outfit Construction

The backend:

1. Classifies upper garment.
2. Classifies lower garment.
3. Aligns garments by width and center.
4. Vertically stacks images with padding.
5. Uploads the merged outfit to Cloudinary.

### CatVTON Try-On

The CatVTON pipeline:

1. Encodes images into latent space.
2. Generates body and garment masks with DensePose and SCHP.
3. Applies inpainting through a diffusion UNet.
4. Uses custom attention to preserve garment details.
5. Decodes and returns the final try-on result.

Performance depends heavily on GPU availability.

## State Management

The frontend uses separate stores for major responsibilities:

- Photo try-on state for wizard steps, image previews, classification, outfit construction, generation settings, and results
- AR try-on state for camera stream, garment overlay transforms, pose landmarks, FPS, and snap-to-shoulders behavior
- Global settings for theme and persisted preferences

## Development Commands

### Frontend

```bash
cd web-frontend
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm format
```

### Garment Processing API

```bash
cd garment-processing-api
uv sync
uv run uvicorn app:app --reload --host 0.0.0.0 --port 5000
uv run python tests/test_model_load.py
uv run python -m py_compile app.py config.py middleware.py models.py services/*.py
```

### CatVTON Gradio

```bash
cd catvton-gradio
python app.py
```

## Project Structure

```text
ar-fashion-tryon/
├── web-frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── public/garments/
│
├── garment-processing-api/
│   ├── app.py
│   ├── config.py
│   ├── middleware.py
│   ├── models.py
│   ├── models/
│   ├── services/
│   ├── scripts/
│   ├── tests/
│   └── docs/
│
├── catvton-gradio/
│   ├── app.py
│   ├── densepose/
│   ├── detectron2/
│   └── model resources
│
├── deprecated-backends/
├── docs/
├── vton-api-notebook/
└── docker-compose.yml
```

## Testing

### Manual UI Checklist

Normal Path:

- Upload body photo and verify preview.
- Upload garment photo and verify classification.
- Confirm filtered cloth type options.
- Adjust inference settings.
- Generate try-on result.
- Download final image.

Full Outfit Path:

- Upload body photo.
- Upload upper garment.
- Upload lower garment.
- Construct outfit.
- Verify merged outfit preview.
- Generate overall try-on.
- Download final image.

Camera Capture:

- Open body camera.
- Confirm front-facing mirrored preview.
- Capture body photo.
- Open garment camera.
- Confirm rear-facing non-mirrored preview.
- Capture garment photo.
- Verify stream cleanup when leaving the page.

AR Mode:

- Enable camera.
- Confirm MediaPipe pose detection.
- Upload or select garment.
- Verify overlay placement.
- Drag, resize, rotate, scale, and change opacity.
- Capture screenshot.

### API Smoke Tests

```bash
curl -X POST "http://localhost:5000/detect_garment_type" \
  -F "image=@test_shirt.jpg"

curl -X POST "http://localhost:5000/classify_garment" \
  -F "image=@test_shirt.jpg"

curl -X POST "http://localhost:5000/construct_outfit" \
  -F "upper_garment=@shirt.jpg" \
  -F "lower_garment=@pants.jpg"

curl -X POST "http://localhost:5000/virtual_tryon" \
  -F "person_image=@person.jpg" \
  -F "garment_image=@garment.jpg" \
  -F "cloth_type=upper" \
  -F "num_inference_steps=50"
```

## Known Limitations

- Hosted GPU quota may limit Hugging Face or Gradio inference.
- File size limits apply to uploaded images.
- Classification accuracy depends on garment clarity and background.
- Outfit merging works best with compatible aspect ratios.
- Camera permissions require HTTPS in production, except localhost.
- Single-worker production setup is preferred for model memory stability.
- First hosted inference request may experience cold start latency.

## Performance Expectations

Approximate values depend on hardware and hosted runtime:

- Classification: around hundreds of milliseconds on CPU
- Background removal: seconds on CPU, faster with GPU acceleration
- Virtual try-on: tens of seconds on GPU, much slower on CPU
- Outfit construction: classification plus image merge and upload time

## Roadmap

Near-term improvements:

- Break large photo wizard UI into smaller step components.
- Create reusable camera capture hooks.
- Build shared upload card components.
- Add tests for Zustand state logic.
- Add Playwright end-to-end tests.
- Improve wizard navigation abstractions.

Future enhancements:

- Real-time webcam processing in Photo HD mode
- More garment categories beyond upper, lower, and overall
- 3D body mesh estimation
- AI size recommendations
- User accounts and saved try-ons
- Garment catalog management
- Performance analytics dashboard
- Mobile app experience

## Acknowledgments

Core AI and ML foundations:

- CatVTON for category-based virtual try-on
- U2NET through `rembg` for background removal
- DensePose for body surface detection
- SCHP for human parsing and segmentation
- Stable Diffusion inpainting for generative image editing

Core libraries and platforms:

- Next.js
- FastAPI
- Gradio
- Hugging Face Spaces
- Cloudinary
- shadcn/ui
- Zustand
- MediaPipe
- Three.js

## Support Links

- Frontend docs: `web-frontend/README.md`
- Garment API docs: `garment-processing-api/README.md`
- API reference: `garment-processing-api/docs/api/API_DOCUMENTATION.md`
- CatVTON docs: `catvton-gradio/README.md`
- Roadmap: `docs/ROADMAP.md`

## License

MIT License.
