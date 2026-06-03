# CLAUDE.md

This file gives coding-agent guidance for the AR Fashion Try-On monorepo.

## Active Services

- `web-frontend/` - active Next.js frontend.
- `garment-processing-api/` - active FastAPI garment classification, cutout, outfit construction, and virtual try-on orchestration API.
- `catvton-gradio/` - CatVTON Gradio service/model pipeline.

Deprecated backend experiments live in `deprecated-backends/` and should not be treated as the active runtime path unless the user explicitly asks to work on them.

## Common Commands

### Frontend

```bash
cd web-frontend
pnpm install
pnpm dev
```

### Garment Processing API

```bash
cd garment-processing-api
uv sync
uv run uvicorn app:app --reload --host 0.0.0.0 --port 5000
uv run python tests/test_model_load.py
```

### CatVTON Gradio

```bash
cd catvton-gradio
python app.py
```

## Architecture Notes

The active runtime flow is:

```text
web-frontend -> garment-processing-api -> CatVTON Gradio/Hugging Face Space -> Cloudinary
```

The garment API owns:

- TensorFlow garment classification
- `rembg` background removal
- Cloudinary uploads/downloads
- outfit construction from garment cutouts
- Gradio API calls for virtual try-on

The frontend owns:

- upload and camera workflows
- AR preview controls
- user-facing try-on flow orchestration

## Dependency Rules

- Use `pnpm` for `web-frontend/`.
- Use `uv` for `garment-processing-api/`.
- Do not reintroduce `requirements.txt` into `garment-processing-api/`.
- Railway deployment for the garment API is defined by `garment-processing-api/nixpacks.toml`.

## Deprecated Code

`deprecated-backends/web-backend/` and `deprecated-backends/ml-backend/` are preserved for reference. Prefer updating active services unless the user specifically requests changes to those archived backends.
