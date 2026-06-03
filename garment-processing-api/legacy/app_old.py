# app.py
import os
import io
import json
import secrets
import tempfile
import asyncio
import logging
import sys
import uuid
from pathlib import Path
from typing import Tuple, Optional, Dict, Any

import numpy as np
from fastapi import FastAPI, File, UploadFile, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel
from PIL import Image
from rembg import remove
from starlette.concurrency import run_in_threadpool

# IMPORTANT: use uvicorn's ProxyHeadersMiddleware (not starlette.*)
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

import requests
import cloudinary
import cloudinary.uploader
from gradio_client import Client, handle_file

# -------------------- Logging Setup --------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

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
FOLDER_TRYON = f"{CLOUDINARY_FOLDER}/tryon_results"

# Gradio config
GRADIO_SPACE = "nawodyaishan/ar-fashion-tryon"
HF_TOKEN = os.getenv("HF_TOKEN")  # Optional, for private spaces
gradio_client: Optional[Client] = None

# -------------------- Request ID Middleware --------------------
class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]  # Short ID for logs
        request.state.request_id = request_id

        # Add to response headers
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

# -------------------- FastAPI app --------------------
app = FastAPI(title="Garment Extraction API", version="2.0.0")

# Add middlewares (order matters - first added is outermost)
app.add_middleware(RequestIDMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_credentials=CORS_ALLOW_CREDENTIALS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Respect X-Forwarded-* from Railway's proxy (correct scheme/host in URLs)
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
    except FileNotFoundError:
        logger.debug(f"Config file not found: {path}, using defaults")
        return default
    except Exception as e:
        logger.warning(f"Error loading {path}: {e}, using defaults")
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

        logger.info(f"Loading TensorFlow model from {model_path}")
        model = tf.keras.models.load_model(str(model_path))
        class_labels[:] = _load_json(labels_path, [])
        cfg = _load_json(cfg_path, {})
        head_type = str(cfg.get("head_type", "softmax")).lower()
        img_size = int(cfg.get("img_size", cfg.get("IMG_SIZE", 224)))
        reject_threshold = float(_load_json(rej_path, {"threshold": 0.0}).get("threshold", 0.0))

        if not class_labels:
            class_labels[:] = [f"class_{i}" for i in range(model.output_shape[-1])]

        logger.info(f"Model loaded successfully: {len(class_labels)} classes, threshold={reject_threshold}")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        _tf_err = e

@app.on_event("startup")
async def startup_load():
    """Load models and initialize Gradio client on startup."""
    logger.info("Starting up application...")

    # Load TensorFlow model
    await run_in_threadpool(_load_model_and_config)

    # Pre-connect to Gradio (optional, for faster first request)
    try:
        await get_gradio_client()
    except Exception as e:
        logger.warning(f"Gradio pre-connection failed (will retry on first request): {e}")

    logger.info("Application startup complete")

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

# -------------------- Gradio Helper Functions --------------------
async def get_gradio_client() -> Client:
    """Get or create Gradio client (singleton pattern)."""
    global gradio_client
    if gradio_client is None:
        try:
            logger.info(f"Connecting to Gradio Space: {GRADIO_SPACE}")
            gradio_client = await asyncio.to_thread(
                Client,
                GRADIO_SPACE,
                hf_token=HF_TOKEN
            )
            logger.info("Gradio client connected successfully")
        except Exception as e:
            logger.error(f"Gradio client connection failed: {e}")
            raise HTTPException(
                status_code=503,
                detail=f"Unable to connect to AI service: {str(e)}"
            )
    return gradio_client

async def _download_gradio_result(result_data: Any) -> bytes:
    """Download result image from Gradio API response."""
    # Gradio returns dict with 'path' or 'url'
    if isinstance(result_data, dict):
        image_url = result_data.get('url') or result_data.get('path')
    else:
        # Sometimes returns just the path/url string
        image_url = str(result_data)

    if not image_url:
        raise ValueError("No image URL in Gradio response")

    # Download image
    return await run_in_threadpool(_download_url_bytes, image_url, MAX_CONTENT_BYTES)

async def _call_gradio_api(
    person_img_path: str,
    cloth_img_path: str,
    cloth_type: str,
    num_inference_steps: int,
    guidance_scale: float,
    seed: int,
    show_type: str,
    max_retries: int = 3
) -> bytes:
    """
    Call Gradio API with retry logic.
    Returns the result image as bytes.
    """
    client = await get_gradio_client()

    for attempt in range(max_retries):
        try:
            logger.info(
                f"Gradio API attempt {attempt + 1}/{max_retries}: "
                f"type={cloth_type}, steps={num_inference_steps}, guidance={guidance_scale}, seed={seed}"
            )

            # Call Gradio API
            result = await asyncio.to_thread(
                client.predict,
                person_image={"background": handle_file(person_img_path), "layers": [], "composite": None},
                cloth_image=handle_file(cloth_img_path),
                cloth_type=cloth_type,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
                seed=seed,
                show_type=show_type,
                api_name="/submit_function"
            )

            logger.info("Gradio API call successful")

            # Download result image
            result_bytes = await _download_gradio_result(result)
            return result_bytes

        except Exception as e:
            logger.error(f"Gradio API attempt {attempt + 1} failed: {e}")

            if attempt == max_retries - 1:
                raise HTTPException(
                    status_code=500,
                    detail=f"Virtual try-on failed after {max_retries} attempts: {str(e)}"
                )

            # Exponential backoff
            wait_time = 2 ** attempt
            logger.info(f"Retrying in {wait_time} seconds...")
            await asyncio.sleep(wait_time)

# -------------------- Schemas --------------------
class HealthOut(BaseModel):
    status: str = "ok"

class UrlIn(BaseModel):
    source_url: str

class VirtualTryonRequest(BaseModel):
    cloth_type: str = "upper"  # upper, lower, overall
    num_inference_steps: int = 50
    guidance_scale: float = 2.5
    seed: int = 42
    show_type: str = "result only"  # result only, input & result, input & mask & result

# -------------------- Routes --------------------
@app.get("/health", response_model=HealthOut)
async def health():
    return HealthOut()

@app.post("/classify_garment")
async def classify_garment(request: Request, garment: UploadFile = File(...)):
    request_id = getattr(request.state, "request_id", "unknown")
    logger.info(f"[{request_id}] classify_garment request started")

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

    logger.info(f"[{request_id}] classify_garment completed: {label} ({conf:.2%})")
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
async def classify_garment_by_url(request: Request, payload: UrlIn):
    request_id = getattr(request.state, "request_id", "unknown")
    logger.info(f"[{request_id}] classify_garment_by_url request started: {payload.source_url}")

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

    logger.info(f"[{request_id}] classify_garment_by_url completed: {label} ({conf:.2%})")
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

# -------------------- Virtual Try-On Endpoint --------------------
@app.post("/virtual_tryon")
async def virtual_tryon(
    request: Request,
    person_image: UploadFile = File(...),
    garment_image: UploadFile = File(...),
    cloth_type: str = "upper",
    num_inference_steps: int = 50,
    guidance_scale: float = 2.5,
    seed: int = 42,
    show_type: str = "result only",
    process_garment: bool = True  # Whether to classify/cutout garment first
):
    """
    Complete virtual try-on workflow:
    1. Validate and upload images to Cloudinary
    2. Optionally process garment (classify + background removal)
    3. Call Gradio API for virtual try-on
    4. Store result in Cloudinary
    5. Return all URLs
    """
    request_id = getattr(request.state, "request_id", "unknown")
    logger.info(
        f"[{request_id}] virtual_tryon request started: "
        f"cloth_type={cloth_type}, process_garment={process_garment}"
    )

    # ========== STEP 1: Validate Person Image ==========
    person_filename = person_image.filename or ""
    if not person_filename or not _allowed_file(person_filename):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid person image. Allowed: {', '.join(sorted(ALLOWED_EXTS))}"
        )

    person_body = await person_image.read()
    if len(person_body) > MAX_CONTENT_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Person image too large (>{int(MAX_CONTENT_MB)}MB)"
        )

    try:
        Image.open(io.BytesIO(person_body)).verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Person image is not valid")

    # ========== STEP 2: Validate Garment Image ==========
    garment_filename = garment_image.filename or ""
    if not garment_filename or not _allowed_file(garment_filename):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid garment image. Allowed: {', '.join(sorted(ALLOWED_EXTS))}"
        )

    garment_body = await garment_image.read()
    if len(garment_body) > MAX_CONTENT_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Garment image too large (>{int(MAX_CONTENT_MB)}MB)"
        )

    try:
        Image.open(io.BytesIO(garment_body)).verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Garment image is not valid")

    # ========== STEP 3: Upload Person Image to Cloudinary ==========
    token = secrets.token_hex(8)
    person_public_id = f"person_{token}"

    try:
        person_upload = await run_in_threadpool(
            _cloudinary_upload_bytes,
            person_body,
            person_public_id,
            FOLDER_ORIG,
            None
        )
        person_url = person_upload["secure_url"]
        logger.info(f"Person image uploaded: {person_url}")
    except Exception as e:
        logger.error(f"Failed to upload person image: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload person image: {e}"
        )

    # ========== STEP 4: Process Garment (Optional) ==========
    garment_url = None
    cutout_url = None
    garment_label = None
    garment_confidence = None

    if process_garment:
        logger.info("Processing garment (classify + background removal)")

        # Save garment to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix="." + garment_filename.rsplit(".", 1)[1].lower()) as tmp:
            tmp.write(garment_body)
            tmp_garment_path = Path(tmp.name)

        try:
            # Upload original garment
            garment_public_id = f"garment_{token}"
            garment_upload = await run_in_threadpool(
                _cloudinary_upload_bytes,
                garment_body,
                garment_public_id,
                FOLDER_ORIG,
                None
            )
            garment_url = garment_upload["secure_url"]

            # Classify
            try:
                garment_label, garment_confidence = await run_in_threadpool(
                    _run_classifier,
                    tmp_garment_path
                )
                logger.info(f"Garment classified: {garment_label} (confidence={garment_confidence:.2%})")
            except Exception as e:
                logger.warning(f"Garment classification failed: {e}")
                garment_label, garment_confidence = "UNKNOWN", 0.0

            # Background removal
            cut_im = await run_in_threadpool(_cutout_from_path, tmp_garment_path)
            cut_bytes = await run_in_threadpool(_png_bytes, cut_im)

            cutout_public_id = f"cutout_{token}"
            cutout_upload = await run_in_threadpool(
                _cloudinary_upload_bytes,
                cut_bytes,
                cutout_public_id,
                FOLDER_CUT,
                "png"
            )
            cutout_url = cutout_upload["secure_url"]
            logger.info(f"Garment cutout created: {cutout_url}")

            # Use cutout for try-on
            garment_body = cut_bytes

        finally:
            tmp_garment_path.unlink(missing_ok=True)
    else:
        # Just upload original garment
        garment_public_id = f"garment_{token}"
        garment_upload = await run_in_threadpool(
            _cloudinary_upload_bytes,
            garment_body,
            garment_public_id,
            FOLDER_ORIG,
            None
        )
        garment_url = garment_upload["secure_url"]

    # ========== STEP 5: Save Images to Temp Files for Gradio ==========
    # Use original file extension to preserve format (PNG/JPEG)
    person_ext = person_filename.rsplit(".", 1)[1].lower() if "." in person_filename else "jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{person_ext}") as person_tmp:
        person_tmp.write(person_body)
        person_tmp_path = person_tmp.name

    # Garment: use .png if processed (cutout), otherwise use original extension
    if process_garment:
        garment_ext = "png"  # Cutout is always PNG with transparency
    else:
        garment_ext = garment_filename.rsplit(".", 1)[1].lower() if "." in garment_filename else "jpg"

    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{garment_ext}") as garment_tmp:
        garment_tmp.write(garment_body)
        garment_tmp_path = garment_tmp.name

    try:
        # ========== STEP 6: Call Gradio API ==========
        logger.info("Starting virtual try-on")
        result_bytes = await _call_gradio_api(
            person_img_path=person_tmp_path,
            cloth_img_path=garment_tmp_path,
            cloth_type=cloth_type,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            seed=seed,
            show_type=show_type
        )

        # ========== STEP 7: Upload Result to Cloudinary ==========
        result_public_id = f"tryon_{token}"
        result_upload = await run_in_threadpool(
            _cloudinary_upload_bytes,
            result_bytes,
            result_public_id,
            FOLDER_TRYON,
            "png"
        )
        result_url = result_upload["secure_url"]
        logger.info(f"Try-on result uploaded: {result_url}")

    finally:
        # Cleanup temp files
        Path(person_tmp_path).unlink(missing_ok=True)
        Path(garment_tmp_path).unlink(missing_ok=True)

    # ========== STEP 8: Return Response ==========
    response = {
        "success": True,
        "person_url": person_url,
        "garment_url": garment_url,
        "cutout_url": cutout_url,
        "result_url": result_url,
        "result_public_id": f"{FOLDER_TRYON}/{result_public_id}",
        "cloth_type": cloth_type,
        "parameters": {
            "num_inference_steps": num_inference_steps,
            "guidance_scale": guidance_scale,
            "seed": seed,
            "show_type": show_type
        }
    }

    # Add garment classification if available
    if process_garment and garment_label:
        response["garment_classification"] = {
            "label": garment_label,
            "confidence": round(garment_confidence, 4)
        }

    logger.info(f"[{request_id}] virtual_tryon completed successfully")
    return JSONResponse(response)

# --------------- Global exception handler ---------------
@app.exception_handler(Exception)
async def unhandled_exc_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error(f"Unhandled error [req_id={request_id}]: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": str(exc),
            "request_id": request_id
        }
    )
