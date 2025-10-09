# app.py
import os
import io
import json
import secrets
import tempfile
from pathlib import Path
from typing import Tuple, Optional

import numpy as np
from fastapi import FastAPI, File, UploadFile, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
from rembg import remove
from starlette.concurrency import run_in_threadpool

# IMPORTANT: use uvicorn's ProxyHeadersMiddleware (not starlette.*)
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

import requests
import cloudinary
import cloudinary.uploader

# -------------------- Paths & constants --------------------
BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"

ALLOWED_EXTS = {"png", "jpg", "jpeg"}
MAX_CONTENT_MB = float(os.getenv("MAX_CONTENT_MB", "16"))
MAX_CONTENT_BYTES = int(MAX_CONTENT_MB * 1024 * 1024)

# CORS: allow "*" OR a comma-list of origins. If "*" → credentials must be False.
CORS_ALLOW_ORIGINS_RAW = os.getenv("CORS_ALLOW_ORIGINS", "*").strip()
if CORS_ALLOW_ORIGINS_RAW == "*":
    CORS_ALLOW_ORIGINS = ["*"]
    CORS_ALLOW_CREDENTIALS = False
else:
    CORS_ALLOW_ORIGINS = [o.strip() for o in CORS_ALLOW_ORIGINS_RAW.split(",") if o.strip()]
    CORS_ALLOW_CREDENTIALS = True  # explicit origins → credentials ok

# Cloudinary config (set these in Railway Variables)
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True,
)
CLOUDINARY_FOLDER = os.getenv("CLOUDINARY_FOLDER", "garments")  # base folder
FOLDER_ORIG = f"{CLOUDINARY_FOLDER}/originals"
FOLDER_CUT = f"{CLOUDINARY_FOLDER}/cutouts"

# -------------------- FastAPI app --------------------
app = FastAPI(title="Garment Extraction API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_credentials=CORS_ALLOW_CREDENTIALS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Respect X-Forwarded-* from Railway’s proxy (correct scheme/host in URLs)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

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
    global model, class_labels, head_type, reject_threshold, img_size, _tf_err
    try:
        import tensorflow as tf
        os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

        model_path = MODELS_DIR / "best_clothing_model.h5"
        labels_path = MODELS_DIR / "class_labels.json"
        cfg_path = MODELS_DIR / "model_config.json"
        rej_path = MODELS_DIR / "rejection_threshold.json"

        if not model_path.exists():
            raise FileNotFoundError(f"Missing model file: {model_path}")

        model = tf.keras.models.load_model(str(model_path))
        class_labels[:] = _load_json(labels_path, [])
        cfg = _load_json(cfg_path, {})
        head_type = str(cfg.get("head_type", "softmax")).lower()
        img_size = int(cfg.get("img_size", cfg.get("IMG_SIZE", 224)))
        reject_threshold = float(_load_json(rej_path, {"threshold": 0.0}).get("threshold", 0.0))

        if not class_labels:
            class_labels[:] = [f"class_{i}" for i in range(model.output_shape[-1])]
    except Exception as e:
        _tf_err = e

@app.on_event("startup")
async def startup_load():
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

def _cutout_from_path(img_path: Path) -> Image.Image:
    with Image.open(img_path).convert("RGBA") as im:
        cut = remove(im)  # rembg (downloads model on first call)
    return cut

def _png_bytes(im: Image.Image) -> bytes:
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    return buf.getvalue()

def _cloudinary_upload_bytes(data: bytes, public_id: str, folder: str, fmt: Optional[str] = None) -> dict:
    kwargs = {
        "folder": folder,
        "public_id": public_id,
        "resource_type": "image",
        "overwrite": True,
    }
    if fmt:
        kwargs["format"] = fmt
    return cloudinary.uploader.upload(io.BytesIO(data), **kwargs)

def _download_url_bytes(url: str, max_bytes: int) -> bytes:
    r = requests.get(url, stream=True, timeout=20)
    r.raise_for_status()
    total = 0
    chunks = []
    for chunk in r.iter_content(1024 * 64):
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise ValueError("File too large")
        chunks.append(chunk)
    return b"".join(chunks)

# -------------------- Schemas --------------------
class HealthOut(BaseModel):
    status: str = "ok"

class UrlIn(BaseModel):
    source_url: str

# -------------------- Routes --------------------
@app.get("/health", response_model=HealthOut)
async def health():
    return HealthOut()

@app.post("/classify_garment")
async def classify_garment(garment: UploadFile = File(...)):
    filename = garment.filename or ""
    if not filename:
        raise HTTPException(status_code=400, detail="Empty filename")
    if not _allowed_file(filename):
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTS))}",
        )

    body = await garment.read()
    if len(body) > MAX_CONTENT_BYTES:
        raise HTTPException(status_code=413, detail=f"File too large (>{int(MAX_CONTENT_MB)}MB)")

    try:
        Image.open(io.BytesIO(body)).verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image")

    token = secrets.token_hex(8)
    orig_public_id = f"garment_{token}"
    try:
        orig_up = await run_in_threadpool(
            _cloudinary_upload_bytes, body, orig_public_id, FOLDER_ORIG, None
        )
        garment_url = orig_up["secure_url"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cloudinary upload (original) failed: {e}")

    with tempfile.NamedTemporaryFile(delete=False, suffix="." + filename.rsplit(".",1)[1].lower()) as tmp:
        tmp.write(body)
        tmp_path = Path(tmp.name)

    try:
        label, conf = await run_in_threadpool(_run_classifier, tmp_path)
    except Exception:
        label, conf = "UNKNOWN", 0.0

    try:
        cut_im = await run_in_threadpool(_cutout_from_path, tmp_path)
        cut_bytes = await run_in_threadpool(_png_bytes, cut_im)
        cut_public_id = f"cutout_{token}"
        cut_up = await run_in_threadpool(
            _cloudinary_upload_bytes, cut_bytes, cut_public_id, FOLDER_CUT, "png"
        )
        cutout_url = cut_up["secure_url"]
    except Exception as e:
        tmp_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Background removal failed: {e}")

    tmp_path.unlink(missing_ok=True)

    return JSONResponse(
        {
            "label": label,
            "confidence": round(conf, 4),
            "garment_url": garment_url,
            "cutout_url": cutout_url,
            "cutout_path": f"{FOLDER_CUT}/{cut_public_id}.png",
            "garment_public_id": f"{FOLDER_ORIG}/{orig_public_id}",
            "cutout_public_id": f"{FOLDER_CUT}/{cut_public_id}",
        }
    )

@app.post("/classify_garment_by_url")
async def classify_garment_by_url(payload: UrlIn):
    url = payload.source_url.strip()
    if not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(status_code=400, detail="source_url must be http(s)")

    try:
        body = await run_in_threadpool(_download_url_bytes, url, MAX_CONTENT_BYTES)
        Image.open(io.BytesIO(body)).verify()
    except ValueError:
        raise HTTPException(status_code=413, detail=f"File too large (>{int(MAX_CONTENT_MB)}MB)")
    except Exception:
        raise HTTPException(status_code=400, detail="Unable to fetch/parse image from source_url")

    token = secrets.token_hex(8)
    orig_public_id = f"garment_{token}"
    try:
        orig_up = await run_in_threadpool(
            _cloudinary_upload_bytes, body, orig_public_id, FOLDER_ORIG, None
        )
        garment_url = orig_up["secure_url"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cloudinary upload (original) failed: {e}")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        tmp.write(body)
        tmp_path = Path(tmp.name)

    try:
        label, conf = await run_in_threadpool(_run_classifier, tmp_path)
    except Exception:
        label, conf = "UNKNOWN", 0.0

    try:
        cut_im = await run_in_threadpool(_cutout_from_path, tmp_path)
        cut_bytes = await run_in_threadpool(_png_bytes, cut_im)
        cut_public_id = f"cutout_{token}"
        cut_up = await run_in_threadpool(
            _cloudinary_upload_bytes, cut_bytes, cut_public_id, FOLDER_CUT, "png"
        )
        cutout_url = cut_up["secure_url"]
    except Exception as e:
        tmp_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Background removal failed: {e}")

    tmp_path.unlink(missing_ok=True)

    return JSONResponse(
        {
            "label": label,
            "confidence": round(conf, 4),
            "garment_url": garment_url,
            "cutout_url": cutout_url,
            "cutout_path": f"{FOLDER_CUT}/{cut_public_id}.png",
            "garment_public_id": f"{FOLDER_ORIG}/{orig_public_id}",
            "cutout_public_id": f"{FOLDER_CUT}/{cut_public_id}",
        }
    )

# --------------- Global exception handler ---------------
@app.exception_handler(Exception)
async def unhandled_exc_handler(request: Request, exc: Exception):
    print("Unhandled error:", repr(exc))
    return JSONResponse(status_code=500, content={"error": str(exc)})
