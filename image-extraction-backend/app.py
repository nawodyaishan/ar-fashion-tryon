"""
FastAPI application for garment extraction and virtual try-on.
"""
import io
import logging
import sys
import secrets
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from PIL import Image
from starlette.concurrency import run_in_threadpool

# Local imports
from config import (
    ALLOWED_EXTS, MAX_CONTENT_BYTES, MAX_CONTENT_MB,
    CORS_ALLOW_ORIGINS, CORS_ALLOW_CREDENTIALS,
    FOLDER_ORIG, FOLDER_CUT, FOLDER_TRYON
)
from models import HealthOut, UrlIn
from middleware import RequestIDMiddleware
from services.classifier import load_model_and_config, classify_image
from services.cloudinary_service import upload_bytes, download_url_bytes
from services.gradio_service import get_gradio_client, call_gradio_api
from services.image_processing import remove_background, image_to_png_bytes, prepare_image_for_format

# -------------------- Logging Setup --------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# -------------------- FastAPI App --------------------
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
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")


# -------------------- Startup/Shutdown --------------------
@app.on_event("startup")
async def startup_load():
    """Load models and initialize services on startup."""
    logger.info("Starting up application...")

    # Load TensorFlow model
    await run_in_threadpool(load_model_and_config)

    # Pre-connect to Gradio (optional, for faster first request)
    try:
        await get_gradio_client()
    except Exception as e:
        logger.warning(f"Gradio pre-connection failed (will retry on first request): {e}")

    logger.info("Application startup complete")


# -------------------- Helper Functions --------------------
def _allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTS


# -------------------- Routes --------------------
@app.get("/health", response_model=HealthOut)
async def health():
    """Health check endpoint."""
    return HealthOut()


@app.post("/classify_garment")
async def classify_garment(request: Request, garment: UploadFile = File(...)):
    """Classify garment and remove background."""
    request_id = getattr(request.state, "request_id", "unknown")
    logger.info(f"[{request_id}] classify_garment request started")

    # Validate file
    filename = garment.filename or ""
    if not filename or not _allowed_file(filename):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(sorted(ALLOWED_EXTS))}"
        )

    # Read and validate image
    body = await garment.read()
    if len(body) > MAX_CONTENT_BYTES:
        raise HTTPException(status_code=413, detail=f"File too large (>{int(MAX_CONTENT_MB)}MB)")

    try:
        Image.open(io.BytesIO(body)).verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    # Upload original to Cloudinary
    token = secrets.token_hex(8)
    orig_public_id = f"garment_{token}"

    try:
        orig_upload = await run_in_threadpool(upload_bytes, body, orig_public_id, FOLDER_ORIG, None)
        garment_url = orig_upload["secure_url"]
    except Exception as e:
        logger.error(f"[{request_id}] Cloudinary upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")

    # Save to temp file for processing
    ext = filename.rsplit(".", 1)[1].lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        tmp.write(body)
        tmp_path = Path(tmp.name)

    try:
        # Classify
        try:
            label, conf = await run_in_threadpool(classify_image, tmp_path)
        except Exception as e:
            logger.warning(f"[{request_id}] Classification failed: {e}")
            label, conf = "UNKNOWN", 0.0

        # Remove background
        cutout_im = await run_in_threadpool(remove_background, tmp_path)
        cutout_bytes = await run_in_threadpool(image_to_png_bytes, cutout_im)

        # Upload cutout to Cloudinary
        cutout_public_id = f"cutout_{token}"
        cutout_upload = await run_in_threadpool(upload_bytes, cutout_bytes, cutout_public_id, FOLDER_CUT, "png")
        cutout_url = cutout_upload["secure_url"]

    except Exception as e:
        logger.error(f"[{request_id}] Processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {e}")
    finally:
        tmp_path.unlink(missing_ok=True)

    logger.info(f"[{request_id}] classify_garment completed: {label} ({conf:.2%})")
    return JSONResponse({
        "label": label,
        "confidence": round(conf, 4),
        "garment_url": garment_url,
        "cutout_url": cutout_url,
        "cutout_path": f"{FOLDER_CUT}/{cutout_public_id}.png",
        "garment_public_id": f"{FOLDER_ORIG}/{orig_public_id}",
        "cutout_public_id": f"{FOLDER_CUT}/{cutout_public_id}",
    })


@app.post("/classify_garment_by_url")
async def classify_garment_by_url(request: Request, payload: UrlIn):
    """Classify garment from URL and remove background."""
    request_id = getattr(request.state, "request_id", "unknown")
    logger.info(f"[{request_id}] classify_garment_by_url request: {payload.source_url}")

    url = payload.source_url.strip()
    if not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(status_code=400, detail="Invalid URL")

    # Download image
    try:
        body = await run_in_threadpool(download_url_bytes, url, MAX_CONTENT_BYTES)
        Image.open(io.BytesIO(body)).verify()
    except ValueError:
        raise HTTPException(status_code=413, detail=f"File too large (>{int(MAX_CONTENT_MB)}MB)")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch image: {e}")

    # Upload original to Cloudinary
    token = secrets.token_hex(8)
    orig_public_id = f"garment_{token}"

    try:
        orig_upload = await run_in_threadpool(upload_bytes, body, orig_public_id, FOLDER_ORIG, None)
        garment_url = orig_upload["secure_url"]
    except Exception as e:
        logger.error(f"[{request_id}] Cloudinary upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")

    # Save to temp file for processing
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        tmp.write(body)
        tmp_path = Path(tmp.name)

    try:
        # Classify
        try:
            label, conf = await run_in_threadpool(classify_image, tmp_path)
        except Exception as e:
            logger.warning(f"[{request_id}] Classification failed: {e}")
            label, conf = "UNKNOWN", 0.0

        # Remove background
        cutout_im = await run_in_threadpool(remove_background, tmp_path)
        cutout_bytes = await run_in_threadpool(image_to_png_bytes, cutout_im)

        # Upload cutout to Cloudinary
        cutout_public_id = f"cutout_{token}"
        cutout_upload = await run_in_threadpool(upload_bytes, cutout_bytes, cutout_public_id, FOLDER_CUT, "png")
        cutout_url = cutout_upload["secure_url"]

    except Exception as e:
        logger.error(f"[{request_id}] Processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {e}")
    finally:
        tmp_path.unlink(missing_ok=True)

    logger.info(f"[{request_id}] classify_garment_by_url completed: {label} ({conf:.2%})")
    return JSONResponse({
        "label": label,
        "confidence": round(conf, 4),
        "garment_url": garment_url,
        "cutout_url": cutout_url,
        "cutout_path": f"{FOLDER_CUT}/{cutout_public_id}.png",
        "garment_public_id": f"{FOLDER_ORIG}/{orig_public_id}",
        "cutout_public_id": f"{FOLDER_CUT}/{cutout_public_id}",
    })


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
    process_garment: bool = True
):
    """Complete virtual try-on workflow."""
    request_id = getattr(request.state, "request_id", "unknown")
    logger.info(f"[{request_id}] virtual_tryon started: type={cloth_type}, process={process_garment}")

    # Validate person image
    person_filename = person_image.filename or ""
    if not person_filename or not _allowed_file(person_filename):
        raise HTTPException(status_code=400, detail="Invalid person image")

    person_body = await person_image.read()
    if len(person_body) > MAX_CONTENT_BYTES:
        raise HTTPException(status_code=413, detail=f"Person image too large (>{int(MAX_CONTENT_MB)}MB)")

    try:
        Image.open(io.BytesIO(person_body)).verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid person image")

    # Validate garment image
    garment_filename = garment_image.filename or ""
    if not garment_filename or not _allowed_file(garment_filename):
        raise HTTPException(status_code=400, detail="Invalid garment image")

    garment_body = await garment_image.read()
    if len(garment_body) > MAX_CONTENT_BYTES:
        raise HTTPException(status_code=413, detail=f"Garment image too large (>{int(MAX_CONTENT_MB)}MB)")

    try:
        Image.open(io.BytesIO(garment_body)).verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid garment image")

    # Upload person image to Cloudinary
    token = secrets.token_hex(8)
    person_public_id = f"person_{token}"

    try:
        person_upload = await run_in_threadpool(upload_bytes, person_body, person_public_id, FOLDER_ORIG, None)
        person_url = person_upload["secure_url"]
        logger.info(f"Person image uploaded: {person_url}")
    except Exception as e:
        logger.error(f"[{request_id}] Person upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Person upload failed: {e}")

    # Process garment (optional)
    garment_url = None
    cutout_url = None
    garment_label = None
    garment_confidence = None

    if process_garment:
        logger.info("Processing garment (classify + background removal)")

        # Save garment to temp file
        garment_ext = garment_filename.rsplit(".", 1)[1].lower()
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{garment_ext}") as tmp:
            tmp.write(garment_body)
            tmp_garment_path = Path(tmp.name)

        try:
            # Upload original garment
            garment_public_id = f"garment_{token}"
            garment_upload = await run_in_threadpool(upload_bytes, garment_body, garment_public_id, FOLDER_ORIG, None)
            garment_url = garment_upload["secure_url"]

            # Classify
            try:
                garment_label, garment_confidence = await run_in_threadpool(classify_image, tmp_garment_path)
                logger.info(f"Garment classified: {garment_label} (confidence={garment_confidence:.2%})")
            except Exception as e:
                logger.warning(f"Garment classification failed: {e}")
                garment_label, garment_confidence = "UNKNOWN", 0.0

            # Background removal
            cutout_im = await run_in_threadpool(remove_background, tmp_garment_path)
            cutout_bytes = await run_in_threadpool(image_to_png_bytes, cutout_im)

            cutout_public_id = f"cutout_{token}"
            cutout_upload = await run_in_threadpool(upload_bytes, cutout_bytes, cutout_public_id, FOLDER_CUT, "png")
            cutout_url = cutout_upload["secure_url"]
            logger.info(f"Garment cutout created: {cutout_url}")

            # Use cutout for try-on
            garment_body = cutout_bytes

        finally:
            tmp_garment_path.unlink(missing_ok=True)
    else:
        # Just upload original garment
        garment_public_id = f"garment_{token}"
        garment_upload = await run_in_threadpool(upload_bytes, garment_body, garment_public_id, FOLDER_ORIG, None)
        garment_url = garment_upload["secure_url"]

    # Save images to temp files for Gradio
    # Prepare images for correct format (convert RGBA to RGB for JPEG)
    person_ext = person_filename.rsplit(".", 1)[1].lower() if "." in person_filename else "jpg"
    person_body = await run_in_threadpool(prepare_image_for_format, person_body, person_ext)

    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{person_ext}") as person_tmp:
        person_tmp.write(person_body)
        person_tmp_path = person_tmp.name

    garment_ext = "png" if process_garment else (garment_filename.rsplit(".", 1)[1].lower() if "." in garment_filename else "jpg")
    garment_body = await run_in_threadpool(prepare_image_for_format, garment_body, garment_ext)

    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{garment_ext}") as garment_tmp:
        garment_tmp.write(garment_body)
        garment_tmp_path = garment_tmp.name

    try:
        # Call Gradio API
        logger.info("Starting virtual try-on")
        result_bytes = await call_gradio_api(
            person_img_path=person_tmp_path,
            cloth_img_path=garment_tmp_path,
            cloth_type=cloth_type,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            seed=seed,
            show_type=show_type
        )

        # Upload result to Cloudinary
        result_public_id = f"tryon_{token}"
        result_upload = await run_in_threadpool(upload_bytes, result_bytes, result_public_id, FOLDER_TRYON, "png")
        result_url = result_upload["secure_url"]
        logger.info(f"Try-on result uploaded: {result_url}")

    finally:
        # Cleanup temp files
        Path(person_tmp_path).unlink(missing_ok=True)
        Path(garment_tmp_path).unlink(missing_ok=True)

    # Build response
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


# -------------------- Global Exception Handler --------------------
@app.exception_handler(Exception)
async def unhandled_exc_handler(request: Request, exc: Exception):
    """Global exception handler with request tracking."""
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error(f"Unhandled error [req_id={request_id}]: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": str(exc),
            "request_id": request_id
        }
    )
