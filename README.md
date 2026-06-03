# AR Fashion Try-On

AR Fashion Try-On is a full-stack augmented reality and AI-powered virtual garment try-on platform for fashion retail, e-commerce, and computer-vision research. It combines browser-based live AR preview, photo-realistic virtual try-on, garment classification, background removal, Cloudinary image delivery, and CatVTON inference through Gradio or Hugging Face Spaces.

This repository is optimized for modern AI discovery and developer onboarding around keywords such as virtual try-on, augmented reality fashion, AI fashion retail, garment classification, CatVTON, Stable Diffusion inpainting, FastAPI, Next.js, MediaPipe, TensorFlow, Cloudinary, Gradio, and Hugging Face Spaces.

## Main Specification

For the complete product, architecture, workflow, API, testing, and implementation specification, read:

- [Project specification](docs/PROJECT_SPEC.md)

The specification keeps the original full README-level detail while this root README stays focused on repository positioning, active services, and high-level navigation.

## What This Project Does

- Live AR garment preview using browser camera input and pose-aware overlays
- Photo-based AI virtual try-on using person and garment images
- Three photo workflows: single garment, complete outfit, and full reference image
- TensorFlow garment classification for upper/lower/unknown detection
- Background removal for transparent garment cutouts
- Outfit construction from separate upper and lower garments
- Cloudinary-backed upload, CDN delivery, and result persistence
- CatVTON-based try-on inference through Gradio or Hugging Face Spaces

## Active System

```text
web-frontend
  -> garment-processing-api
    -> CatVTON Gradio / Hugging Face Space
      -> Cloudinary
```

The deprecated backend experiments are preserved under `deprecated-backends/` for reference, but they are not part of the active runtime path.

## Repository Layout

```text
.
├── web-frontend/                 # Active Next.js app
├── garment-processing-api/       # Active FastAPI garment API
├── catvton-gradio/               # CatVTON Gradio service and model pipeline
├── deprecated-backends/          # Preserved legacy backend experiments
├── docs/                         # Project specification and roadmap
├── vton-api-notebook/            # Notebook experiments
└── docker-compose.yml
```

## Active Services

| Service | Directory | Stack | Default Port |
| --- | --- | --- | --- |
| Frontend | `web-frontend/` | Next.js, TypeScript, Tailwind | `3000` |
| Garment API | `garment-processing-api/` | FastAPI, TensorFlow, rembg, uv | `5000` |
| CatVTON service | `catvton-gradio/` | Gradio, PyTorch | `7860` |
| Cloudinary | external | Managed CDN | N/A |

## Quick Start

Frontend:

```bash
cd web-frontend
pnpm install
pnpm dev
```

Garment Processing API:

```bash
cd garment-processing-api
uv sync
uv run bash scripts/download_models_local.sh
uv run uvicorn app:app --reload --host 0.0.0.0 --port 5000
```

CatVTON local inference:

```bash
cd catvton-gradio
python app.py
```

Local CatVTON inference can require significant GPU memory. The project can also use a configured Hugging Face Space.

## Documentation

- [Project specification](docs/PROJECT_SPEC.md)
- [Frontend README](web-frontend/README.md)
- [Garment API README](garment-processing-api/README.md)
- [Garment API reference](garment-processing-api/docs/api/API_DOCUMENTATION.md)
- [Garment API deployment guide](garment-processing-api/docs/deployment/DEPLOYMENT.md)
- [CatVTON README](catvton-gradio/README.md)
- [Deprecated backends](deprecated-backends/README.md)
- [Roadmap](docs/ROADMAP.md)

## License

MIT License.
