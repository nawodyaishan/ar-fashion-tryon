"""
FastAPI application for garment extraction and virtual try-on.
"""
import io
import logging
import sys
import secrets
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, Request, HTTPException, Form
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
from services.image_processing import remove_background, image_to_png_bytes, ensure_png_format, construct_outfit_image

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
    """Initialize services on startup."""
    logger.info("Starting up application...")

    # Load classification model
    load_model_and_config()

    # Note: Gradio client will connect on first use (lazy loading)
    # This prevents startup failures if Gradio space is temporarily unavailable

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


@app.post("/detect_garment_type")
async def detect_garment_type(request: Request, garment: UploadFile = File(...)):
    """
    Detect garment type only (no background removal or cloud upload).

    This endpoint validates the uploaded image extensively and returns
    only the classification result. Useful for quick garment type detection.

    Form-Data:
        garment: Image file (PNG, JPG, JPEG)

    Returns:
        JSON with label and confidence
    """
    request_id = getattr(request.state, "request_id", "unknown")
    logger.info(f"[{request_id}] detect_garment_type request started")

    # 1. Check file field exists
    if not garment:
        raise HTTPException(status_code=400, detail="No file field 'garment' in form-data")

    # 2. Check non-empty filename
    filename = garment.filename or ""
    if not filename:
        raise HTTPException(status_code=400, detail="Empty filename")

    # 3. Check file extension
    if not _allowed_file(filename):
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTS))}"
        )

    # 4. Check MIME type (basic safety check)
    content_type = garment.content_type or ""
    if not any(mt in content_type for mt in ("image/png", "image/jpeg", "image/jpg")):
        logger.warning(f"[{request_id}] Suspicious MIME type: {content_type}")
        # Still continue, PIL will validate below

    # 5. Read file bytes and check size
    body = await garment.read()
    if len(body) > MAX_CONTENT_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large (>{int(MAX_CONTENT_MB)}MB)"
        )

    # 6. Save to temporary file with secure tokenized name
    token = secrets.token_hex(4)
    ext = filename.rsplit(".", 1)[1].lower()
    safe_filename = f"garment_{token}.{ext}"

    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        tmp.write(body)
        tmp_path = Path(tmp.name)

    logger.info(f"[{request_id}] Saved temp file: {tmp_path}")

    try:
        # 7. Validate with PIL (verify image is valid)
        try:
            with Image.open(tmp_path) as img:
                img.verify()
            logger.info(f"[{request_id}] Image validation passed")
        except Exception as e:
            logger.error(f"[{request_id}] Invalid image: {e}")
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is not a valid image"
            )

        # 8. Run classification
        try:
            label, conf = await run_in_threadpool(classify_image, tmp_path)
            logger.info(f"[{request_id}] Classification result: {label} (confidence={conf:.2%})")
        except Exception as e:
            logger.error(f"[{request_id}] Classification failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Classification failed: {str(e)}"
            )

    finally:
        # 9. Cleanup: Always delete temp file
        tmp_path.unlink(missing_ok=True)
        logger.info(f"[{request_id}] Cleaned up temp file")

    # 10. Return classification result
    logger.info(f"[{request_id}] detect_garment_type completed: {label} ({conf:.4f})")
    return JSONResponse({
        "label": label,
        "confidence": round(conf, 4),
        "filename": safe_filename,
        "file_size_bytes": len(body),
        "content_type": content_type
    })


@app.post("/construct_outfit")
async def construct_outfit(
    request: Request,
    upper_garment: UploadFile = File(...),
    lower_garment: UploadFile = File(...)
):
    """
    Construct a full outfit image from upper and lower garments.

    This endpoint:
    1. Validates both garment uploads (extension, MIME, size, PIL)
    2. Classifies each garment to verify it's a shirt (upper) and pants/trousers (lower)
    3. Removes backgrounds from both garments (creates transparent cutouts)
    4. Merges the cutouts vertically (shirt on top, pants on bottom)
    5. Uploads originals, cutouts, and the constructed outfit to Cloudinary
    6. Returns all URLs (originals, cutouts, and merged outfit)

    Form-Data:
        upper_garment: Image file of shirt/t-shirt/top (PNG, JPG, JPEG)
        lower_garment: Image file of pants/trousers/skirt (PNG, JPG, JPEG)

    Returns:
        JSON with garment classifications, individual URLs, cutout URLs, and constructed outfit URL
    """
    request_id = getattr(request.state, "request_id", "unknown")
    logger.info(f"[{request_id}] construct_outfit request started")

    # ========== UPPER GARMENT VALIDATION ==========
    logger.info(f"[{request_id}] Validating upper garment...")

    # Check file field
    if not upper_garment:
        raise HTTPException(status_code=400, detail="No 'upper_garment' file in form-data")

    upper_filename = upper_garment.filename or ""
    if not upper_filename:
        raise HTTPException(status_code=400, detail="Upper garment has empty filename")

    if not _allowed_file(upper_filename):
        raise HTTPException(
            status_code=400,
            detail=f"Upper garment file type not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTS))}"
        )

    # Check MIME type
    upper_content_type = upper_garment.content_type or ""
    if not any(mt in upper_content_type for mt in ("image/png", "image/jpeg", "image/jpg")):
        logger.warning(f"[{request_id}] Upper garment suspicious MIME: {upper_content_type}")

    # Read and check size
    upper_body = await upper_garment.read()
    if len(upper_body) > MAX_CONTENT_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Upper garment too large (>{int(MAX_CONTENT_MB)}MB)"
        )

    # Validate with PIL
    try:
        Image.open(io.BytesIO(upper_body)).verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Upper garment is not a valid image")

    # ========== LOWER GARMENT VALIDATION ==========
    logger.info(f"[{request_id}] Validating lower garment...")

    # Check file field
    if not lower_garment:
        raise HTTPException(status_code=400, detail="No 'lower_garment' file in form-data")

    lower_filename = lower_garment.filename or ""
    if not lower_filename:
        raise HTTPException(status_code=400, detail="Lower garment has empty filename")

    if not _allowed_file(lower_filename):
        raise HTTPException(
            status_code=400,
            detail=f"Lower garment file type not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTS))}"
        )

    # Check MIME type
    lower_content_type = lower_garment.content_type or ""
    if not any(mt in lower_content_type for mt in ("image/png", "image/jpeg", "image/jpg")):
        logger.warning(f"[{request_id}] Lower garment suspicious MIME: {lower_content_type}")

    # Read and check size
    lower_body = await lower_garment.read()
    if len(lower_body) > MAX_CONTENT_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Lower garment too large (>{int(MAX_CONTENT_MB)}MB)"
        )

    # Validate with PIL
    try:
        Image.open(io.BytesIO(lower_body)).verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Lower garment is not a valid image")

    # ========== CLASSIFICATION ==========
    logger.info(f"[{request_id}] Classifying garments...")

    token = secrets.token_hex(8)

    # Save upper garment to temp file
    upper_ext = upper_filename.rsplit(".", 1)[1].lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{upper_ext}") as tmp:
        tmp.write(upper_body)
        upper_tmp_path = Path(tmp.name)

    # Save lower garment to temp file
    lower_ext = lower_filename.rsplit(".", 1)[1].lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{lower_ext}") as tmp:
        tmp.write(lower_body)
        lower_tmp_path = Path(tmp.name)

    try:
        # Classify upper garment
        try:
            upper_label, upper_conf = await run_in_threadpool(classify_image, upper_tmp_path)
            logger.info(f"[{request_id}] Upper garment classified: {upper_label} ({upper_conf:.2%})")
        except Exception as e:
            logger.error(f"[{request_id}] Upper garment classification failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Upper garment classification failed: {str(e)}"
            )

        # Classify lower garment
        try:
            lower_label, lower_conf = await run_in_threadpool(classify_image, lower_tmp_path)
            logger.info(f"[{request_id}] Lower garment classified: {lower_label} ({lower_conf:.2%})")
        except Exception as e:
            logger.error(f"[{request_id}] Lower garment classification failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Lower garment classification failed: {str(e)}"
            )

        # Verify garment types
        # Upper should be: tshirt, shirt, top, jacket, etc.
        # Lower should be: trousers, pants, skirt, shorts, etc.
        valid_upper_labels = ["tshirt", "shirt", "top", "jacket", "upper"]
        valid_lower_labels = ["trousers", "pants", "pant", "skirt", "shorts", "lower"]

        upper_label_lower = upper_label.lower()
        lower_label_lower = lower_label.lower()

        if not any(valid in upper_label_lower for valid in valid_upper_labels):
            logger.warning(
                f"[{request_id}] Upper garment classified as '{upper_label}', expected shirt/tshirt/top"
            )
            # Don't fail, just warn (user might have custom labels)

        if not any(valid in lower_label_lower for valid in valid_lower_labels):
            logger.warning(
                f"[{request_id}] Lower garment classified as '{lower_label}', expected trousers/pants/skirt"
            )
            # Don't fail, just warn

        # ========== UPLOAD INDIVIDUAL GARMENTS ==========
        logger.info(f"[{request_id}] Uploading individual garments to Cloudinary...")

        # Upload upper garment
        upper_public_id = f"upper_{token}"
        upper_upload = await run_in_threadpool(upload_bytes, upper_body, upper_public_id, FOLDER_ORIG, None)
        upper_url = upper_upload["secure_url"]

        # Upload lower garment
        lower_public_id = f"lower_{token}"
        lower_upload = await run_in_threadpool(upload_bytes, lower_body, lower_public_id, FOLDER_ORIG, None)
        lower_url = lower_upload["secure_url"]

        # ========== BACKGROUND REMOVAL ==========
        logger.info(f"[{request_id}] Removing backgrounds from garments...")

        # Remove background from upper garment
        upper_cutout_im = await run_in_threadpool(remove_background, upper_tmp_path)
        upper_cutout_bytes = await run_in_threadpool(image_to_png_bytes, upper_cutout_im)

        # Upload upper cutout
        upper_cutout_public_id = f"upper_cutout_{token}"
        upper_cutout_upload = await run_in_threadpool(upload_bytes, upper_cutout_bytes, upper_cutout_public_id, FOLDER_CUT, "png")
        upper_cutout_url = upper_cutout_upload["secure_url"]
        logger.info(f"Upper garment cutout created: {upper_cutout_url}")

        # Remove background from lower garment
        lower_cutout_im = await run_in_threadpool(remove_background, lower_tmp_path)
        lower_cutout_bytes = await run_in_threadpool(image_to_png_bytes, lower_cutout_im)

        # Upload lower cutout
        lower_cutout_public_id = f"lower_cutout_{token}"
        lower_cutout_upload = await run_in_threadpool(upload_bytes, lower_cutout_bytes, lower_cutout_public_id, FOLDER_CUT, "png")
        lower_cutout_url = lower_cutout_upload["secure_url"]
        logger.info(f"Lower garment cutout created: {lower_cutout_url}")

        # ========== CONSTRUCT OUTFIT IMAGE ==========
        logger.info(f"[{request_id}] Constructing full outfit image from cutouts...")

        outfit_bytes = await run_in_threadpool(construct_outfit_image, upper_cutout_bytes, lower_cutout_bytes)

        # Upload constructed outfit
        outfit_public_id = f"outfit_{token}"
        outfit_upload = await run_in_threadpool(upload_bytes, outfit_bytes, outfit_public_id, FOLDER_ORIG, "png")
        outfit_url = outfit_upload["secure_url"]

        logger.info(f"[{request_id}] Outfit constructed and uploaded: {outfit_url}")

    finally:
        # Cleanup temp files
        upper_tmp_path.unlink(missing_ok=True)
        lower_tmp_path.unlink(missing_ok=True)

    # ========== RETURN RESULT ==========
    logger.info(f"[{request_id}] construct_outfit completed successfully")
    return JSONResponse({
        "success": True,
        "upper_garment": {
            "label": upper_label,
            "confidence": round(upper_conf, 4),
            "url": upper_url,
            "cutout_url": upper_cutout_url,
            "public_id": f"{FOLDER_ORIG}/{upper_public_id}",
            "cutout_public_id": f"{FOLDER_CUT}/{upper_cutout_public_id}"
        },
        "lower_garment": {
            "label": lower_label,
            "confidence": round(lower_conf, 4),
            "url": lower_url,
            "cutout_url": lower_cutout_url,
            "public_id": f"{FOLDER_ORIG}/{lower_public_id}",
            "cutout_public_id": f"{FOLDER_CUT}/{lower_cutout_public_id}"
        },
        "outfit": {
            "url": outfit_url,
            "public_id": f"{FOLDER_ORIG}/{outfit_public_id}",
            "format": "png",
            "description": "Merged outfit image from cutouts (transparent backgrounds)"
        }
    })


@app.post("/virtual_tryon")
async def virtual_tryon(
    request: Request,
    person_image: UploadFile = File(...),
    garment_image: UploadFile = File(...),
    cloth_type: str = Form("upper"),
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

    # Process garment (optional background removal)
    garment_url = None
    cutout_url = None

    if process_garment:
        logger.info("Processing garment (background removal only)")

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

            # Background removal (classification already done on frontend)
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

    # Convert images to PNG format for Gradio (eliminates RGBA->JPEG errors)
    # PNG supports all color modes and is fully compatible with Gradio processing
    logger.info(f"[{request_id}] Converting images to PNG for Gradio compatibility")

    person_body_png = await run_in_threadpool(ensure_png_format, person_body)
    garment_body_png = await run_in_threadpool(ensure_png_format, garment_body)

    # Save PNG images to temp files
    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as person_tmp:
        person_tmp.write(person_body_png)
        person_tmp_path = person_tmp.name

    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as garment_tmp:
        garment_tmp.write(garment_body_png)
        garment_tmp_path = garment_tmp.name

    logger.debug(f"[{request_id}] Temp files created: person={person_tmp_path}, garment={garment_tmp_path}")

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

    logger.info(f"[{request_id}] virtual_tryon completed successfully")
    return JSONResponse(response)


# -------------------- Global Exception Handler -------------------
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
