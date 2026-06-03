# Garment Processing API

FastAPI service for garment classification, background removal, outfit construction, and CatVTON virtual try-on orchestration.

This service is the Python image-processing backend for the AR Fashion Try-On project. It accepts garment uploads or image URLs, classifies garment type with TensorFlow, creates transparent cutouts with `rembg`, stores assets in Cloudinary, and delegates virtual try-on requests to the configured Gradio/Hugging Face service.

## What It Provides

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Service health and model status |
| `POST /classify_garment` | Classify an uploaded garment and create a cutout |
| `POST /classify_garment_by_url` | Classify and process a garment from a URL |
| `POST /detect_garment_type` | Fast classification without background removal |
| `POST /construct_outfit` | Merge upper and lower garment cutouts |
| `POST /virtual_tryon` | Upload images, call CatVTON, and persist the result |

## Quick Start

Prerequisites:

- Python 3.10+
- `uv`
- Cloudinary credentials
- Optional Hugging Face token for private Gradio spaces

```bash
uv sync

export CLOUDINARY_CLOUD_NAME=your-cloud-name
export CLOUDINARY_API_KEY=your-api-key
export CLOUDINARY_API_SECRET=your-api-secret
export HF_TOKEN=hf_your_token

uv run uvicorn app:app --reload --host 0.0.0.0 --port 5000
```

Open `http://localhost:5000/docs` for the interactive FastAPI docs.

## Dependency Model

Dependencies are managed by uv:

- `pyproject.toml` is the dependency source of truth.
- `uv.lock` locks the full dependency graph.
- macOS ARM installs `tensorflow`.
- Linux/Windows, including Railway, install `tensorflow-cpu`.

Railway verifies the selected TensorFlow package during the Nixpacks install phase before downloading models.

## Project Layout

```text
.
├── app.py                    # FastAPI application and routes
├── config.py                 # Runtime configuration and paths
├── middleware.py             # Request middleware
├── models.py                 # Pydantic schemas
├── services/                 # Classifier, Cloudinary, Gradio, image processing
├── models/                   # Model artifacts and model metadata
├── scripts/                  # Model download and conversion utilities
├── tests/                    # Runtime/model validation scripts
├── notebooks/                # Training and evaluation notebooks
├── docs/                     # API, deployment, architecture, and change docs
├── legacy/                   # Preserved historical app implementation
├── pyproject.toml
├── uv.lock
├── nixpacks.toml
└── Procfile
```

## Common Commands

```bash
# Install or update the local environment
uv sync

# Run the API locally
uv run uvicorn app:app --reload --host 0.0.0.0 --port 5000

# Check the lockfile
uv lock --check

# Validate Python syntax
uv run python -m py_compile app.py config.py middleware.py models.py services/*.py tests/test_model_load.py scripts/convert_model.py

# Validate TensorFlow model loading
uv run python tests/test_model_load.py
```

## Documentation

- [API quick reference](docs/api/README.md)
- [Full API documentation](docs/api/API_DOCUMENTATION.md)
- [OpenAPI specification](docs/api/openapi.yaml)
- [Deployment guide](docs/deployment/DEPLOYMENT.md)
- [Model compatibility notes](docs/deployment/MODEL_COMPATIBILITY.md)
- [Architecture notes](docs/architecture/ARCHITECTURE.md)
- [Change notes](docs/changes/FIXES_APPLIED.md)

## Deployment

Railway uses `nixpacks.toml`:

1. Install Python, `uv`, and `unzip`.
2. Run `uv sync --frozen --no-dev`.
3. Assert the correct TensorFlow package for the platform.
4. Download model artifacts with `scripts/download_models_railway_v2.sh`.
5. Start Gunicorn through `uv run`.

The production command is:

```bash
uv run gunicorn -k uvicorn.workers.UvicornWorker -w 1 -b 0.0.0.0:$PORT app:app
```
