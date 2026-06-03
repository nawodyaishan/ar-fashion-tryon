# AR Fashion Try-On

AR Fashion Try-On is a full-stack virtual try-on system for fashion retail workflows. It combines a Next.js frontend, a FastAPI garment-processing API, Cloudinary image storage, and CatVTON-based virtual try-on through Gradio or Hugging Face Spaces.

## Active System

The current production-oriented flow is:

```text
web-frontend
  -> garment-processing-api
    -> CatVTON Gradio / Hugging Face Space
      -> Cloudinary
```

The deprecated backend experiments are preserved under `deprecated-backends/` for reference, but they are not part of the active runtime path.

## What It Does

- Live AR garment preview with browser camera input and pose-aware overlays
- Photo-based virtual try-on using person and garment images
- Garment classification with TensorFlow
- Background removal for clean transparent garment cutouts
- Full outfit construction from separate upper and lower garments
- Cloudinary-backed upload, storage, CDN delivery, and result persistence
- Railway-ready garment-processing API managed with `uv`

## Repository Layout

```text
.
├── web-frontend/                 # Active Next.js app
├── garment-processing-api/       # Active FastAPI garment API
├── catvton-gradio/               # CatVTON Gradio service and model pipeline
├── deprecated-backends/          # Preserved legacy backend experiments
│   ├── web-backend/              # Legacy NestJS backend
│   └── ml-backend/               # Legacy FastAPI/Flask ML backend
├── docs/                         # Root planning and roadmap docs
├── vton-api-notebook/            # Notebook experiments
└── docker-compose.yml
```

## Services

| Service | Directory | Stack | Default Port | Status |
| --- | --- | --- | --- | --- |
| Frontend | `web-frontend/` | Next.js, TypeScript, Tailwind | `3000` | Active |
| Garment API | `garment-processing-api/` | FastAPI, TensorFlow, rembg, uv | `5000` | Active |
| CatVTON service | `catvton-gradio/` | Gradio, PyTorch | `7860` | Active / hosted option |
| Cloudinary | external | Managed CDN | N/A | Active |
| Legacy web backend | `deprecated-backends/web-backend/` | NestJS | `3001` | Deprecated |
| Legacy ML backend | `deprecated-backends/ml-backend/` | FastAPI/Flask experiments | varies | Deprecated |

## Quick Start

### 1. Frontend

```bash
cd web-frontend
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

Set frontend API URLs in `web-frontend/.env.local`:

```bash
NEXT_PUBLIC_GARMENT_API_BASE=http://127.0.0.1:5000
NEXT_PUBLIC_VTON_API_BASE=http://127.0.0.1:7860
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_preset
```

### 2. Garment Processing API

```bash
cd garment-processing-api
uv sync

cp .env.example .env
# Fill in Cloudinary credentials and optional HF_TOKEN.

uv run uvicorn app:app --reload --host 0.0.0.0 --port 5000
```

Open `http://localhost:5000/docs`.

TensorFlow dependency selection is platform-aware:

- macOS ARM installs `tensorflow`
- Railway/Linux/Windows install `tensorflow-cpu`

### 3. CatVTON / Virtual Try-On

The default flow can use the configured Hugging Face Space. For local GPU-backed inference:

```bash
cd catvton-gradio
python app.py
```

Local CatVTON inference can require significant GPU memory.

## Garment API Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Health and model status |
| `POST /classify_garment` | Classify an uploaded garment and create a cutout |
| `POST /classify_garment_by_url` | Process a garment from a source URL |
| `POST /detect_garment_type` | Lightweight garment type detection |
| `POST /construct_outfit` | Merge upper and lower garments into one outfit image |
| `POST /virtual_tryon` | Call the virtual try-on pipeline and persist the result |

## Documentation

- [Frontend README](web-frontend/README.md)
- [Garment API README](garment-processing-api/README.md)
- [Garment API reference](garment-processing-api/docs/api/API_DOCUMENTATION.md)
- [Garment API deployment guide](garment-processing-api/docs/deployment/DEPLOYMENT.md)
- [CatVTON README](catvton-gradio/README.md)
- [Deprecated backends](deprecated-backends/README.md)
- [Root roadmap](docs/ROADMAP.md)

## Development Notes

- Use `pnpm` in `web-frontend/`.
- Use `uv` in `garment-processing-api/`.
- Keep active Python API docs under `garment-processing-api/docs/`.
- Keep active Python API helper scripts under `garment-processing-api/scripts/`.
- Treat `deprecated-backends/` as archived reference code unless explicitly reviving a service.

## Deployment

The active garment API is configured for Railway through `garment-processing-api/nixpacks.toml`. The build runs `uv sync --frozen --no-dev`, verifies the TensorFlow package for the VM platform, downloads model artifacts, and starts Gunicorn with `uv run`.

The frontend can be deployed separately to a Next.js-compatible host such as Vercel.
