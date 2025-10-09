# AR Fashion Try-On 👗✨

Full-stack augmented reality and AI-powered virtual garment try-on system for e-commerce. Combines real-time AR preview with ML-powered photo-realistic virtual try-on using state-of-the-art deep learning models.

---

## 🎯 Features

### Dual-Mode Virtual Try-On System

**1. Live AR Preview Mode** 📹
- Real-time webcam garment overlay
- MediaPipe pose detection (33-point skeleton)
- Interactive garment positioning and transforms
- Draggable/resizable garment controls
- Snap-to-shoulders alignment
- Keyboard shortcuts for precise adjustments

**2. Photo Try-On HD Mode** 🎨
Three distinct workflows for different use cases:

#### Normal Mode (Single Garment) 🎽
- Upload or capture single garment photo
- AI-powered garment classification (TensorFlow/Keras)
- Automatic background removal (U2NET model)
- Dynamic cloth type detection (upper/lower/full)
- Smart filtering of applicable try-on options
- Professional-quality results via CatVTON model

#### Full Outfit Mode 👔👖
- Upload separate upper (shirt/top) and lower (pants/skirt) garments
- Independent AI classification for both pieces
- **Automatic outfit construction** via dedicated API endpoint
- Intelligent garment merging and alignment
- Preview constructed outfit before try-on
- Forced 'overall' cloth type for complete outfit try-on

#### Full Reference Mode 🖼️
- Use full-body reference photo as style guide
- Skip garment classification for maximum flexibility
- Manual cloth type selection (upper/lower/overall)
- Experimental style transfer capabilities
- Defaults to 'overall' for full-body style matching

### Core Capabilities

- 📸 **Dual Camera Capture**: Front-facing for body (mirrored selfie view), rear for garments
- 🤖 **AI Garment Detection**: TensorFlow CNN model trained on fashion dataset
- 🎨 **Background Removal**: U2NET model for professional garment cutouts
- ☁️ **Cloudinary Integration**: CDN-optimized image storage and delivery
- 📱 **Mobile-First Design**: Touch-optimized responsive UI
- ⚙️ **Advanced ML Controls**: Inference steps (20-100), guidance scale (1.0-10.0), seed control
- 💾 **Smart Downloads**: Automatic filename with timestamp
- 🎭 **AR Transforms**: Scale (30-300%), rotation (±45°), opacity (10-100%)
- 🔄 **Real-time Classification**: Instant garment type detection with confidence scores
- 🌐 **Multi-Platform**: Works on desktop, mobile web, tablets

---

## 🏗️ System Architecture

### Complete Full-Stack Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js 15)                      │
│                    http://localhost:3000                        │
│  ┌──────────────────┐              ┌──────────────────────┐   │
│  │  Live AR Mode    │              │  Photo Try-On HD     │   │
│  │  - MediaPipe     │              │  - 3 Path Wizard     │   │
│  │  - Three.js      │              │  - Camera Capture    │   │
│  │  - Webcam        │              │  - Upload/Preview    │   │
│  └──────────────────┘              └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├─────────────────────────────┐
                              │                             │
                              ▼                             ▼
┌─────────────────────────────────────┐   ┌──────────────────────────────┐
│  IMAGE EXTRACTION BACKEND (FastAPI) │   │ VIRTUAL TRY-ON (Gradio/CUDA) │
│     http://localhost:8000            │   │   http://localhost:7860      │
│                                      │   │                              │
│  ┌────────────────────────────────┐ │   │  ┌────────────────────────┐ │
│  │ /detect_garment_type           │ │   │  │ CatVTON Pipeline       │ │
│  │ - TensorFlow CNN classifier    │ │   │  │ - Stable Diffusion     │ │
│  │ - Returns: label + confidence  │ │   │  │ - UNet2D Inpainting    │ │
│  └────────────────────────────────┘ │   │  │ - VAE Encoder/Decoder  │ │
│                                      │   │  │ - DensePose Detection  │ │
│  ┌────────────────────────────────┐ │   │  │ - SCHP Segmentation    │ │
│  │ /extract_garment               │ │   │  └────────────────────────┘ │
│  │ - U2NET background removal     │ │   │                              │
│  │ - PNG cutout generation        │ │   │  Hugging Face Space:         │
│  └────────────────────────────────┘ │   │  nawodyaishan/ar-fashion-tryon│
│                                      │   └──────────────────────────────┘
│  ┌────────────────────────────────┐ │                 │
│  │ /construct_outfit              │ │                 │
│  │ - Merges upper + lower         │ │                 │
│  │ - Cloudinary upload            │ │                 │
│  └────────────────────────────────┘ │                 │
│                                      │                 │
│  ┌────────────────────────────────┐ │                 │
│  │ /virtual_tryon                 │ │─────────────────┘
│  │ - Orchestrates full pipeline   │ │   (calls Gradio API)
│  │ - Uploads person + garment     │ │
│  │ - Calls Gradio Space via API   │ │
│  │ - Downloads result to Cloudinary│ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│     CLOUDINARY CDN                  │
│                                     │
│  Folders:                           │
│  - /originals/    (uploads)        │
│  - /cutouts/      (processed)      │
│  - /tryon_results/ (ML outputs)    │
│  - /outfits/      (merged garments)│
└─────────────────────────────────────┘
```

### Service Details

| Service | Technology | Port | Purpose | Status |
|---------|-----------|------|---------|--------|
| **Frontend** | Next.js 15 + TypeScript | 3000 | User interface, AR preview, photo wizard | ✅ Active |
| **Image Extraction** | FastAPI + Python | 8000 | Garment classification, background removal, outfit construction | ✅ Active |
| **Virtual Try-On** | Gradio + PyTorch | 7860 | CatVTON model inference, photorealistic try-on | ✅ Active (HF Spaces) |
| **Cloudinary** | Cloud CDN | - | Image storage, optimization, delivery | ✅ Active |
| **Web Backend** | NestJS + TypeScript | 3001 | REST API, business logic | 🔧 Legacy (optional) |
| **ML Backend** | FastAPI + YOLO v8 | 8001 | YOLO segmentation, pose detection | 🔧 Legacy (optional) |
| **AR Module** | Three.js + MediaPipe | - | 3D rendering, pose-driven AR | ✅ Active (client-side) |

---

## 🚀 Quick Start

### Prerequisites

```bash
# Required
- Node.js 18+ (for frontend)
- Python 3.9+ (for ML backend)
- pnpm (for frontend package management)
- CUDA 11.0+ (for GPU acceleration, optional)

# Optional
- Docker (for containerized deployment)
- Cloudinary account (for image storage)
- HuggingFace account (for Gradio API access)
```

### 1️⃣ Frontend Setup (Next.js)

```bash
cd web-frontend

# Install dependencies
pnpm install

# Create environment file
cp .env.local.example .env.local

# Edit .env.local with your API endpoints:
# NEXT_PUBLIC_GARMENT_API_BASE=http://127.0.0.1:8000
# NEXT_PUBLIC_VTON_API_BASE=http://127.0.0.1:7860
# NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
# NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_preset

# Start development server
pnpm dev
```

**Access at:** http://localhost:3000

### 2️⃣ Image Extraction Backend (FastAPI)

```bash
cd image-extraction-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env

# Edit .env with Cloudinary credentials:
# CLOUDINARY_CLOUD_NAME=your_cloud_name
# CLOUDINARY_API_KEY=your_api_key
# CLOUDINARY_API_SECRET=your_api_secret
# GRADIO_SPACE=nawodyaishan/ar-fashion-tryon
# HF_TOKEN=your_hf_token (optional, for private spaces)

# Start server
python app.py
```

**Access at:** http://localhost:8000
**API Docs:** http://localhost:8000/docs

### 3️⃣ Virtual Try-On (Gradio Space)

**Option A: Use Public Hugging Face Space** (Recommended)
- URL: https://huggingface.co/spaces/nawodyaishan/ar-fashion-tryon
- No setup required, accessed via API
- Free GPU inference (with quotas)

**Option B: Run Locally** (Requires GPU)
```bash
cd /path/to/huggingface-spaces/ar-fashion-tryon

# Install dependencies
pip install -r requirements.txt

# Run Gradio app (requires 8-10GB GPU memory)
python app.py
```

**Access at:** http://localhost:7860

### 4️⃣ All Services at Once

```bash
# From project root
./scripts/start-dev.sh
```

This starts:
- ✅ Frontend: http://localhost:3000
- ✅ Image Extraction API: http://localhost:8000
- ✅ Virtual Try-On: http://localhost:7860 (if running locally)
- ✅ PostgreSQL: localhost:5432 (Docker)
- ✅ Redis: localhost:6379 (Docker)

---

## 📚 Technology Stack

### Frontend (Next.js Application)
- **Framework**: Next.js 15.4.2 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4, shadcn/ui components, glassmorphic design
- **State Management**: Zustand with localStorage persistence
- **UI Components**: Radix UI primitives, Lucide icons, Sonner notifications
- **HTTP Client**: Axios with interceptors
- **AR Libraries**:
  - MediaPipe Pose (33-point pose detection)
  - Three.js + React Three Fiber (3D rendering)
  - react-rnd (draggable/resizable components)
- **Camera**: MediaDevices API with front/rear camera support
- **Theme**: next-themes (dark/light mode)

### Image Extraction Backend (FastAPI)
- **Framework**: FastAPI (Python) with async/await
- **ML Models**:
  - **TensorFlow/Keras CNN**: Garment classification (224x224 input)
  - **U2NET**: Background removal via rembg library (~200MB model)
- **Image Processing**:
  - OpenCV (headless) for image operations
  - Pillow (PIL) for image I/O
  - NumPy for array operations
- **Cloud Storage**: Cloudinary SDK for uploads/CDN
- **API Client**: Gradio Client for CatVTON integration
- **Server**: Uvicorn (dev), Gunicorn (production)
- **CORS**: Configurable origins for cross-domain requests

### Virtual Try-On (Gradio Space)
- **Model**: CatVTON (Category-based Virtual Try-On)
- **Base**: Stable Diffusion Inpainting (booksforcharlie/stable-diffusion-inpainting)
- **Framework**: Gradio 5.49.0 for web UI
- **Deep Learning**: PyTorch 2.0+ with CUDA support
- **Architecture Components**:
  - **VAE**: AutoencoderKL for image compression
  - **UNet2D**: Conditional diffusion model for inpainting
  - **DensePose**: 3D body surface mapping
  - **SCHP**: Self-Correction Human Parsing for segmentation
  - **Custom Attention**: SkipAttnProcessor for garment detail preservation
- **Scheduler**: DDIM (fast 50-step sampling)
- **Inference**: GPU-accelerated (CUDA) with mixed precision (bf16)
- **Deployment**: Hugging Face Spaces with automatic model downloading

### Supporting Services (Optional)

#### Web Backend (NestJS)
- REST API server with TypeScript
- PostgreSQL integration
- Redis caching
- JWT authentication
- Swagger API documentation

#### ML Backend (FastAPI)
- YOLO v8 segmentation
- MediaPipe Pose server
- Custom ML pipeline architecture

---

## 🎨 Complete User Workflows

### Live AR Preview Workflow
```
1. User opens /try-on page in AR mode
2. Click "Enable Camera" → webcam access requested
3. MediaPipe detects pose in real-time (33 keypoints)
4. User selects garment from gallery or uploads custom
5. Garment API: /extract_garment removes background
6. Garment overlays on shoulders, follows body movement
7. User adjusts with drag/resize or transform controls
8. Screenshot captures final AR preview
```

### Photo Try-On Normal Path Workflow
```
1. User selects "Single Garment" mode
2. Upload/capture body photo (front-facing camera)
3. Upload/capture garment photo (rear-facing camera)
4. API: /detect_garment_type → returns "tshirt" (95% confidence)
5. UI: Dynamically shows "upper" + "overall" options
6. User optionally adjusts inference settings (accordion)
7. API: /virtual_tryon → sends to Gradio CatVTON
   - Uploads person + garment to Cloudinary
   - Calls Gradio Space: nawodyaishan/ar-fashion-tryon
   - DensePose detects body parts
   - SCHP segments clothing regions
   - UNet applies garment via diffusion (50 steps)
   - Downloads result, uploads to Cloudinary
8. Frontend displays result with download button
```

### Photo Try-On Full Outfit Workflow
```
1. User selects "Complete Outfit" mode
2. Upload/capture body photo
3. Upload upper garment → API classifies as "shirt" (92%)
4. Upload lower garment → API classifies as "trousers" (88%)
5. API: /construct_outfit
   - Classifies both garments
   - Merges images with proper alignment
   - Uploads to Cloudinary: /outfits/outfit_abc123.png
6. Preview shows constructed outfit
7. User clicks Generate
8. API: /virtual_tryon with cloth_type="overall"
9. CatVTON processes complete outfit
10. Result displayed with download option
```

### Photo Try-On Reference Path Workflow
```
1. User selects "Full Reference" mode
2. Upload/capture body photo
3. Upload full-body reference image (skip classification)
4. UI shows all options: upper, lower, overall (default: overall)
5. User manually selects cloth type
6. User adjusts advanced settings (optional)
7. API: /virtual_tryon with process_garment=false
8. Gradio processes reference image directly
9. Style transfer applied to body photo
10. Result displayed
```

---

## 📡 API Reference

### Image Extraction Backend Endpoints

Full documentation: [`image-extraction-backend/API_DOCUMENTATION.md`](image-extraction-backend/API_DOCUMENTATION.md)

#### Core Endpoints

**1. Garment Type Detection**
```bash
POST /detect_garment_type
Content-Type: multipart/form-data

Parameters:
  - image: File (required) - Garment image

Response:
{
  "label": "tshirt",
  "confidence": 0.9234,
  "processing_time_ms": 187
}
```

**2. Garment Extraction (Background Removal)**
```bash
POST /extract_garment
Content-Type: multipart/form-data

Parameters:
  - image: File (required) - Garment image

Response:
{
  "success": true,
  "original_url": "https://res.cloudinary.com/.../originals/garment_abc123.jpg",
  "cutout_url": "https://res.cloudinary.com/.../cutouts/cutout_abc123.png",
  "cutout_path": "garments/cutouts/cutout_abc123.png",
  "format": "png",
  "classification": {
    "label": "tshirt",
    "confidence": 0.9234
  }
}
```

**3. Outfit Construction**
```bash
POST /construct_outfit
Content-Type: multipart/form-data

Parameters:
  - upper_garment: File (required) - Upper garment image
  - lower_garment: File (required) - Lower garment image

Response:
{
  "success": true,
  "upper_garment": {
    "label": "tshirt",
    "confidence": 0.92,
    "url": "https://res.cloudinary.com/.../upper_abc123.jpg",
    "public_id": "garments/upper_abc123"
  },
  "lower_garment": {
    "label": "trousers",
    "confidence": 0.88,
    "url": "https://res.cloudinary.com/.../lower_abc123.jpg",
    "public_id": "garments/lower_abc123"
  },
  "outfit": {
    "url": "https://res.cloudinary.com/.../outfits/outfit_abc123.png",
    "public_id": "garments/outfits/outfit_abc123",
    "format": "png"
  }
}
```

**4. Virtual Try-On (Complete Pipeline)**
```bash
POST /virtual_tryon
Content-Type: multipart/form-data

Parameters:
  - person_image: File (required) - Person/body photo
  - garment_image: File (required) - Garment/outfit image
  - cloth_type: string (default: "upper") - "upper", "lower", or "overall"
  - num_inference_steps: int (default: 50) - 20-100
  - guidance_scale: float (default: 2.5) - 1.0-10.0
  - seed: int (default: 42) - -1 to 999
  - show_type: string (default: "result only")
  - process_garment: bool (default: true) - Classify & remove background

Response:
{
  "success": true,
  "person_url": "https://res.cloudinary.com/.../person_xyz789.jpg",
  "garment_url": "https://res.cloudinary.com/.../garment_xyz789.jpg",
  "cutout_url": "https://res.cloudinary.com/.../cutout_xyz789.png",
  "result_url": "https://res.cloudinary.com/.../tryon_xyz789.png",
  "result_public_id": "garments/tryon_results/tryon_xyz789",
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

**5. Health Check**
```bash
GET /health

Response:
{
  "status": "ok",
  "model_loaded": true,
  "model_name": "best_clothing_model.h5",
  "version": "1.0.0"
}
```

### Error Handling

**HTTP Status Codes:**
- `200 OK`: Success
- `400 Bad Request`: Invalid file type, corrupt image, missing parameters
- `413 Payload Too Large`: File exceeds size limit (default: 16MB)
- `500 Internal Server Error`: Model inference failure, Cloudinary error, Gradio timeout

**Example Error Response:**
```json
{
  "detail": "File type not allowed. Allowed: jpg, jpeg, png, webp"
}
```

---

## 🎯 Key Implementation Details

### Camera Capture System
- **Body Photos**: Front-facing camera (`facingMode: 'user'`)
  - Mirrored preview for natural selfie experience
  - Aspect ratio: 3:4 (portrait)
- **Garment Photos**: Rear-facing camera (`facingMode: 'environment'`)
  - Standard orientation (not mirrored)
  - Aspect ratio: 1:1 (square)
- **Stream Management**: Proper cleanup on unmount to prevent memory leaks
- **Fallback**: File upload if camera unavailable or denied

### AI Model Pipeline

**Garment Classification (TensorFlow)**
- **Model**: CNN trained on fashion dataset
- **Input**: 224x224 RGB images
- **Output**: 3 classes (trousers, tshirt, other) with softmax
- **Preprocessing**: Resize → Normalize to [0,1] → Batch dimension
- **Rejection Threshold**: Configurable (default: 0.69) for "unknown" classification
- **Performance**: ~200ms on CPU, ~50ms on GPU

**Background Removal (U2NET)**
- **Model**: rembg library with u2net (~200MB)
- **Input**: Original image (any size)
- **Output**: RGBA PNG with transparent background
- **Post-processing**: Optional white/alpha matte
- **Performance**: ~2-3 seconds on CPU, ~500ms on GPU

**Outfit Construction**
- **Process**:
  1. Classify upper garment
  2. Classify lower garment
  3. Align images by width/center
  4. Vertical stack with padding
  5. Upload as single merged image
- **Output Format**: PNG to preserve transparency
- **Cloudinary Folder**: `/outfits/`

**Virtual Try-On (CatVTON)**
- **Architecture**: Stable Diffusion + Custom Attention
- **Pipeline Stages**:
  1. **Image Encoding**: VAE compresses to latent space (4x downsampling)
  2. **Mask Generation**: DensePose + SCHP detect garment region
  3. **Diffusion Process**: UNet iteratively denoises (50 steps default)
  4. **Image Decoding**: VAE reconstructs high-res result
- **Attention Mechanism**: SkipAttnProcessor preserves garment textures
- **Performance**: ~30-60 seconds on GPU (T4/A100), ~5-10 minutes on CPU

### Smart Cloth Type Filtering

**Normal Mode Logic:**
```typescript
const detectedType = garment.classification?.detectedType;

if (detectedType === 'upper') {
  return ['upper', 'overall'];  // Show detected + overall
} else if (detectedType === 'lower') {
  return ['lower', 'overall'];
} else if (detectedType === 'full') {
  return ['overall'];  // Full garments only work with overall
} else {
  return ['upper', 'lower', 'overall'];  // Show all if uncertain
}
```

**Full Mode:** Always forces `clothType: 'overall'` (no user selection)

**Reference Mode:** Shows all options, defaults to `'overall'`

### State Management (Zustand)

**Three Separate Stores:**

1. **`useVtonStore`** - Photo HD Mode (510 lines)
   - Manages 3 try-on paths (NORMAL, FULL, REFERENCE)
   - Step-based wizard flow (PATH_SELECT → BODY → GARMENT → GENERATE → RESULT)
   - Image uploads with preview URLs
   - Garment classification caching
   - Outfit construction state
   - Advanced settings (inference steps, guidance scale, seed)

2. **`useTryonStore`** - AR Mode
   - Live camera stream management
   - Garment overlay transforms (position, scale, rotation, opacity)
   - MediaPipe pose landmarks
   - Real-time FPS tracking
   - Snap-to-shoulders logic

3. **`useSettingsStore`** - Global Settings
   - Theme (dark/light mode)
   - Lighting effects toggle
   - Persisted to localStorage

### Mobile-First Design Patterns

- **Sticky Elements**: Progress bar (top) + Navigation (bottom)
- **Touch Targets**: Minimum 44x44px tap areas
- **Active States**: `active:scale-[0.98]` for tactile feedback
- **Responsive Grid**: `grid-cols-2 gap-3` for upload options
- **Typography**: `text-xs sm:text-sm` scales with screen size
- **Modals**: Full-screen on mobile, centered on desktop

---

## 🛠️ Development

### Frontend Commands

```bash
cd web-frontend

pnpm dev          # Start dev server (Turbopack, hot reload)
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm lint:fix     # Auto-fix linting issues
pnpm format       # Format with Prettier
```

### Backend Commands

```bash
cd image-extraction-backend

# Development
python app.py                    # Auto-reload enabled
uvicorn app:app --reload         # Alternative with Uvicorn

# Testing
pytest                           # Run all tests
pytest --cov=app tests/          # With coverage report

# Production
gunicorn -k uvicorn.workers.UvicornWorker \
  -w 1 -b 0.0.0.0:$PORT app:app  # Single worker for model loading
```

### Gradio Space Commands

```bash
cd /path/to/huggingface-spaces/ar-fashion-tryon

python app.py                    # Run Gradio UI locally
```

### Project Structure

```
ar-fashion-tryon/
├── web-frontend/                # Next.js 15 frontend
│   ├── app/
│   │   ├── try-on/page.tsx     # Main try-on page (dual mode)
│   │   ├── settings/page.tsx   # User settings
│   │   └── layout.tsx          # Root layout
│   ├── components/
│   │   ├── tryon/
│   │   │   ├── PhotoWizard.tsx       # Photo HD wizard (~1200 lines)
│   │   │   ├── ARPanel.tsx           # AR controls sidebar
│   │   │   ├── ARStage.tsx           # Live camera preview
│   │   │   ├── VideoPreview.tsx      # Webcam component
│   │   │   ├── GarmentOverlay.tsx    # Draggable garment
│   │   │   └── TransformControls.tsx # Scale/rotate/opacity
│   │   └── ui/                       # shadcn/ui components
│   ├── lib/
│   │   ├── store/
│   │   │   └── useVtonStore.ts       # Photo HD state (510 lines)
│   │   ├── services/
│   │   │   ├── garmentApi.ts         # Image extraction API
│   │   │   ├── vtonApi.ts            # Virtual try-on API
│   │   │   └── http.ts               # Axios client
│   │   ├── tryon-store.ts            # AR mode state
│   │   ├── settings-store.ts         # Global settings
│   │   └── types.ts                  # TypeScript types
│   └── public/garments/              # Sample garment images
│
├── image-extraction-backend/    # FastAPI service
│   ├── app.py                   # Main application (~630 lines)
│   ├── models/
│   │   ├── best_clothing_model.h5    # TensorFlow CNN
│   │   ├── class_labels.json         # Label mappings
│   │   └── model_config.json         # Model settings
│   ├── requirements.txt         # Python dependencies
│   └── API_DOCUMENTATION.md     # Complete API reference
│
├── huggingface-spaces/ar-fashion-tryon/  # Gradio Space
│   ├── app.py                   # Gradio UI (~460 lines)
│   ├── model/
│   │   ├── pipeline.py          # CatVTON pipeline
│   │   ├── cloth_masker.py      # Auto mask generation
│   │   ├── attn_processor.py    # Custom attention
│   │   └── utils.py             # Image processing
│   ├── densepose/               # DensePose library
│   ├── resource/demo/example/   # Sample images
│   └── requirements.txt
│
├── web-backend/                 # NestJS backend (optional)
├── ml-backend/                  # YOLO v8 backend (optional)
├── ar-module/                   # Three.js AR module
├── shared-types/                # Shared TypeScript types
├── scripts/
│   └── start-dev.sh            # Master dev script
└── docs/
    ├── ROADMAP.md              # Development roadmap
    └── API_DOCUMENTATION.md    # API reference
```

---

## 🔍 Testing

### Manual Testing Checklist

**Normal Path:**
- [ ] Upload body photo → preview loads
- [ ] Upload garment photo → classification appears
- [ ] Verify detected type (e.g., "tshirt")
- [ ] Check filtered options (upper + overall)
- [ ] Adjust inference steps → slider works
- [ ] Click Generate → processing indicator appears
- [ ] Result displays with correct try-on
- [ ] Download button works

**Full Outfit Path:**
- [ ] Upload body photo
- [ ] Upload upper garment → "shirt" detected
- [ ] Upload lower garment → "trousers" detected
- [ ] Click "Construct Outfit" → preview loads
- [ ] Verify merged outfit image
- [ ] Cloth type locked to "overall"
- [ ] Generate try-on → result displays
- [ ] Download works

**Camera Capture:**
- [ ] Body camera opens (front-facing)
- [ ] Video preview is mirrored
- [ ] Capture button works → photo uploads
- [ ] Garment camera opens (rear-facing)
- [ ] Video not mirrored
- [ ] Capture works → classification runs
- [ ] Streams cleanup on unmount

**AR Mode:**
- [ ] Enable camera → MediaPipe loads
- [ ] Pose landmarks visible (if enabled)
- [ ] Upload garment → overlay appears
- [ ] Drag to reposition → works
- [ ] Resize handles → aspect ratio locks
- [ ] Transform sliders → real-time updates
- [ ] Keyboard shortcuts work (arrows, +/-)
- [ ] Screenshot captures AR view

### API Integration Tests

```bash
# Test garment classification
curl -X POST "http://localhost:8000/detect_garment_type" \
  -F "image=@test_shirt.jpg"

# Test background removal
curl -X POST "http://localhost:8000/extract_garment" \
  -F "image=@test_shirt.jpg"

# Test outfit construction
curl -X POST "http://localhost:8000/construct_outfit" \
  -F "upper_garment=@shirt.jpg" \
  -F "lower_garment=@pants.jpg"

# Test full virtual try-on
curl -X POST "http://localhost:8000/virtual_tryon" \
  -F "person_image=@person.jpg" \
  -F "garment_image=@garment.jpg" \
  -F "cloth_type=upper" \
  -F "num_inference_steps=50"
```

---

## 🚧 Known Limitations

### Current Constraints
- **GPU Quota**: Gradio Spaces may hit daily GPU limits (switch to CPU fallback)
- **File Size**: Max 10MB per image (configurable via `MAX_CONTENT_MB`)
- **Classification Accuracy**: Depends on garment clarity and background
- **Outfit Merging**: Works best with compatible aspect ratios
- **Camera Permissions**: Requires HTTPS in production (localhost exempt)
- **Concurrent Users**: Single-worker setup for model loading (Gunicorn `-w 1`)
- **Cold Starts**: First Gradio request may take 30-60 seconds (model download)

### Performance Considerations
- **Classification**: ~200ms (CPU), ~50ms (GPU)
- **Background Removal**: ~2-3s (CPU), ~500ms (GPU)
- **Virtual Try-On**: ~30-60s (GPU), ~5-10 minutes (CPU)
- **Outfit Construction**: ~3-5s total (classify + merge + upload)

---

## 📝 Recent Updates

### Latest Changes (January 2025)
- ✅ **Three-Path Virtual Try-On System**: Normal, Full Outfit, Reference modes
- ✅ **Camera Capture for Body Photos**: Front-facing camera with mirrored preview
- ✅ **Reference Path Defaults**: Auto-selects 'overall' cloth type
- ✅ **Mobile-First UI Redesign**: Touch-optimized, responsive wizard
- ✅ **Outfit Construction API**: `/construct_outfit` endpoint with intelligent merging
- ✅ **Accordion Advanced Settings**: Collapsible ML parameter controls
- ✅ **Sticky Navigation**: Progress bar (top) + footer (bottom)
- ✅ **Enhanced Error Handling**: Graceful degradation, detailed error messages
- ✅ **Cloudinary Integration**: Complete CDN pipeline for all images
- ✅ **Gradio API Integration**: Direct calls to HuggingFace Spaces

### Component Refactoring Roadmap
- [ ] Extract `PhotoWizard` into 8 step components (~150 lines each)
- [ ] Create reusable `useCameraCapture` hook
- [ ] Build shared `FileUploadCard` component
- [ ] Add unit tests for state management (Zustand stores)
- [ ] Implement E2E tests with Playwright
- [ ] Extract `useWizardNavigation` hook for step logic

See [`web-frontend/PHOTOWIZARD_ANALYSIS.md`](web-frontend/PHOTOWIZARD_ANALYSIS.md) for detailed refactoring plan.

---

## 🤝 Contributing

### Development Workflow

1. **Fork** the repository
2. **Create** feature branch: `git checkout -b feature/your-feature`
3. **Make** changes and test locally
4. **Commit** with conventional commits: `git commit -m "feat: add your feature"`
5. **Push** to your fork: `git push origin feature/your-feature`
6. **Submit** Pull Request with description

### Code Style

- **Frontend**: ESLint + Prettier (auto-format on save)
- **Backend**: PEP 8 (Python style guide)
- **Types**: TypeScript strict mode, no `any` types
- **Comments**: Document complex logic, use JSDoc for functions

### Testing Requirements

- Unit tests for new utility functions
- Integration tests for API endpoints
- Manual testing checklist for UI changes
- No breaking changes to existing APIs

---

## 📄 License

[Add license information here]

---

## 🙏 Acknowledgments

### AI Models & Frameworks
- **CatVTON** - State-of-the-art virtual try-on model ([zhengchong/CatVTON](https://huggingface.co/zhengchong/CatVTON))
- **U2NET** - Background removal via [rembg](https://github.com/danielgatis/rembg)
- **DensePose** - 3D body surface detection (Facebook AI Research)
- **SCHP** - Human parsing and segmentation
- **Stable Diffusion** - Base inpainting model

### Libraries & Tools
- **Next.js** - React framework by Vercel
- **FastAPI** - Modern Python web framework
- **Gradio** - ML web app framework by Hugging Face
- **Cloudinary** - Image CDN and transformation API
- **shadcn/ui** - Beautiful UI component library
- **Zustand** - Lightweight state management
- **MediaPipe** - Real-time ML solutions by Google
- **Three.js** - WebGL 3D library

---

## 📞 Support

### Documentation
- **Frontend Docs**: [`web-frontend/CLAUDE.md`](web-frontend/CLAUDE.md)
- **API Docs**: [`image-extraction-backend/API_DOCUMENTATION.md`](image-extraction-backend/API_DOCUMENTATION.md)
- **Gradio Guide**: [`huggingface-spaces/ar-fashion-tryon/BEGINNER_GUIDE.md`](../huggingface-spaces/ar-fashion-tryon/BEGINNER_GUIDE.md)

### Getting Help
- **Issues**: [GitHub Issues](https://github.com/your-username/ar-fashion-tryon/issues)
- **Hugging Face**: [Spaces Documentation](https://huggingface.co/docs/hub/spaces)
- **Gradio**: [Gradio Discord](https://discord.gg/gradio)

---

## 🎉 What's Next?

### Immediate Next Steps
1. **Test the System**: Follow Quick Start guides
2. **Experiment**: Try different images and settings
3. **Customize**: Modify UI colors, layout, or add features
4. **Optimize**: Improve speed or quality based on your needs

### Future Enhancements (from Roadmap)
- Real-time webcam processing in Photo HD mode
- Multiple garment types beyond upper/lower/overall
- 3D body mesh estimation (SMPL-X)
- AI-powered size recommendations
- User accounts and saved try-ons
- Garment catalog management
- Performance analytics dashboard
- Mobile app (React Native)

---

**Built with ❤️ for the future of fashion e-commerce**

*Combining computer vision, deep learning, and modern web technologies to revolutionize online shopping.*
