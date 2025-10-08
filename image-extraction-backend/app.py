# app.py
import os
import io
import json
import secrets
import time
from pathlib import Path
from typing import Tuple, Optional

import numpy as np
from fastapi import FastAPI, File, UploadFile, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from PIL import Image
from rembg import remove
from starlette.concurrency import run_in_threadpool

# -------------------- Paths & constants --------------------
BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
STATIC_DIR = BASE_DIR / "static"
UPLOADS_DIR = STATIC_DIR / "uploads"
OUTPUTS_DIR = STATIC_DIR / "outputs"
TEMPLATES_DIR = BASE_DIR / "templates"  # not used here but kept for parity

ALLOWED_EXTS = {"png", "jpg", "jpeg"}
MAX_CONTENT_MB = float(os.getenv("MAX_CONTENT_MB", "16"))
MAX_CONTENT_BYTES = int(MAX_CONTENT_MB * 1024 * 1024)

# CORS
CORS_ALLOW_ORIGINS = os.getenv("CORS_ALLOW_ORIGINS", "*")

# -------------------- FastAPI app --------------------
app = FastAPI(title="Garment Extraction API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if CORS_ALLOW_ORIGINS == "*" else [o.strip() for o in CORS_ALLOW_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve /static (so URLs we return are fetchable)
STATIC_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# -------------------- Model loading --------------------
_tf_err: Optional[Exception] = None
model = None
class_labels = []
head_type = "softmax"
reject_threshold = 0.0
img_size = 224

def _load_json(path: Path, default):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default

def _load_model_and_config():
    """Load TF model & configs; run in startup thread."""
    global model, class_labels, head_type, reject_threshold, img_size, _tf_err
    try:
        import tensorflow as tf
        model_path = MODELS_DIR / "best_clothing_model.h5"
        labels_path = MODELS_DIR / "class_labels.json"
        cfg_path = MODELS_DIR / "model_config.json"
        rej_path = MODELS_DIR / "rejection_threshold.json"

        if not model_path.exists():
            raise FileNotFoundError(f"Missing model file: {model_path}")

        # Quiet TF logs
        os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

        model = tf.keras.models.load_model(str(model_path))
        class_labels[:] = _load_json(labels_path, [])
        cfg = _load_json(cfg_path, {})
        head_type = str(cfg.get("head_type", "softmax")).lower()
        img_size = int(cfg.get("img_size", cfg.get("IMG_SIZE", 224)))
        reject_threshold = float(_load_json(rej_path, {"threshold": 0.0}).get("threshold", 0.0))

        if not class_labels:
            # Fallback: generic indices
            class_labels[:] = [f"class_{i}" for i in range(model.output_shape[-1])]
    except Exception as e:
        _tf_err = e

@app.on_event("startup")
async def startup_load():
    # Load model in a thread so startup remains non-blocking in some servers
    await run_in_threadpool(_load_model_and_config)

# -------------------- Helpers --------------------
def _allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTS

def _preprocess_for_model(im: Image.Image, size: int) -> np.ndarray:
    im = im.convert("RGB").resize((size, size), Image.BILINEAR)
    x = np.asarray(im).astype("float32") / 255.0
    x = np.expand_dims(x, 0)
    return x

def _run_classifier(img_path: Path) -> Tuple[str, float]:
    if model is None:
        raise RuntimeError(f"Model not loaded: {_tf_err}")
    from tensorflow import keras  # ensure keras symbols available

    with Image.open(img_path) as im:
        x = _preprocess_for_model(im, img_size)
    preds = model.predict(x, verbose=0)[0]
    preds = np.array(preds).reshape(-1)
    idx = int(np.argmax(preds))
    conf = float(preds[idx])
    label = class_labels[idx] if 0 <= idx < len(class_labels) else f"class_{idx}"
    if conf < reject_threshold:
        return "UNKNOWN", conf
    return label, conf

def _save_cutout(img_path: Path) -> Path:
    with Image.open(img_path).convert("RGBA") as im:
        cut = remove(im)  # rembg (downloads model on first call)
    token = secrets.token_hex(4)
    out_name = f"cutout_{token}.png"
    out_path = OUTPUTS_DIR / out_name
    cut.save(out_path, format="PNG")
    return out_path

def _static_abs_url(request: Request, static_path: Path) -> str:
    # Convert absolute static path → URL under /static
    rel = static_path.relative_to(STATIC_DIR).as_posix()
    # Use request.url_for to make absolute URL
    return request.url_for("static", path=rel)

# -------------------- Schemas --------------------
class HealthOut(BaseModel):
    status: str = "ok"

# (We keep response shape for /classify_garment identical to Flask: raw dict)

# -------------------- Routes --------------------
@app.get("/health", response_model=HealthOut)
async def health():
    return HealthOut()

@app.post("/classify_garment")
async def classify_garment(request: Request, garment: UploadFile = File(...)):
    # Basic validation
    filename = garment.filename or ""
    if not filename:
        raise HTTPException(status_code=400, detail="Empty filename")
    if not _allowed_file(filename):
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTS))}",
        )

    # Read limited bytes to RAM (protects server)
    body = await garment.read()
    if len(body) > MAX_CONTENT_BYTES:
        raise HTTPException(status_code=413, detail=f"File too large (>{int(MAX_CONTENT_MB)}MB)")

    # Save original
    ext = filename.rsplit(".", 1)[1].lower()
    token = secrets.token_hex(4)
    safe_name = f"garment_{token}.{ext}"
    save_path = UPLOADS_DIR / safe_name
    save_path.write_bytes(body)

    # Verify image decodes
    try:
        Image.open(io.BytesIO(body)).verify()
    except Exception:
        try:
            save_path.unlink(missing_ok=True)
        finally:
            raise HTTPException(status_code=400, detail="Uploaded file is not a valid image")

    # Classify (optional if model missing)
    try:
        label, conf = await run_in_threadpool(_run_classifier, save_path)
    except Exception as e:
        # If the model wasn’t loaded or TF missing, still allow background removal
        label, conf = "UNKNOWN", 0.0

    # Background removal
    try:
        cutout_path = await run_in_threadpool(_save_cutout, save_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Background removal failed: {e}")

    # Build URLs (absolute)
    garment_url = _static_abs_url(request, save_path)
    cutout_url = _static_abs_url(request, cutout_path)

    # Keep exact Flask response shape
    return JSONResponse(
        {
            "label": label,
            "confidence": round(conf, 4),
            "garment_url": str(garment_url),
            "cutout_url": str(cutout_url),
            "cutout_path": str(cutout_path.relative_to(BASE_DIR)).replace("\\", "/"),
        }
    )

# --------------- Global exception handler ---------------
@app.exception_handler(Exception)
async def unhandled_exc_handler(request: Request, exc: Exception):
    # Log to stdout for Railway logs
    print("Unhandled error:", repr(exc))
    return JSONResponse(status_code=500, content={"error": str(exc)})
