# CLAUDE.md

Start with [AGENTS.md](AGENTS.md) for canonical sources, CodeGraph and Agentic
SDD approval/batch rules. Use [CONTRIBUTING.md](CONTRIBUTING.md) for current
commands and the implementation status of planned workflow tooling.

This file gives service-specific guidance for the AR Fashion Try-On monorepo.

## Active Services

- `web-frontend/` - active Next.js frontend.
- `garment-processing-api/` - active FastAPI garment classification, cutout, outfit construction, and virtual try-on orchestration API.
- `catvton-gradio/` - CatVTON Gradio service/model pipeline.

Deprecated backend experiments live in `deprecated-backends/` and should not be treated as the active runtime path unless the user explicitly asks to work on them.

## Common Commands

### Frontend

```bash
cd web-frontend
pnpm install --frozen-lockfile
pnpm dev
```

### Garment Processing API

```bash
cd garment-processing-api
uv sync --locked
uv run --no-sync uvicorn app:app --env-file .env --reload --host 127.0.0.1 --port 5000
# Optional: requires restored model weights.
uv run --no-sync python tests/test_model_load.py
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
