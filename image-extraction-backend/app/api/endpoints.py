"""
API Endpoints

FastAPI routes for garment processing.
"""

import logging
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from fastapi.responses import JSONResponse

from ..config import Settings, get_settings
from ..models.schemas import (
    GarmentProcessResponse,
    ErrorResponse,
    HealthResponse
)
from ..services.classification import GarmentService
from ..core.dependencies import get_garment_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check(
    settings: Settings = Depends(get_settings),
    garment_service: GarmentService = Depends(get_garment_service)
):
    """
    Health check endpoint

    Returns service status and model information.
    """
    return HealthResponse(
        status="healthy",
        model_loaded=garment_service.classifier.model is not None,
        model_name=garment_service.classifier.model_name,
        version=settings.app_version
    )


@router.post(
    "/process",
    response_model=GarmentProcessResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid input"},
        413: {"model": ErrorResponse, "description": "File too large"},
        500: {"model": ErrorResponse, "description": "Processing error"}
    },
    tags=["Garment Processing"]
)
async def process_garment(
    file: UploadFile = File(..., description="Garment image file"),
    settings: Settings = Depends(get_settings),
    garment_service: GarmentService = Depends(get_garment_service)
):
    """
    Process garment image: classify and extract

    **Input:**
    - Garment image with background (JPG, PNG, WEBP)

    **Output:**
    - Garment type (shirt or pant)
    - Extracted/processed garment image (background removed)
    - Confidence score
    - Processing time

    **Supported garment types:**
    - T-shirt
    - Trousers

    **Processing steps:**
    1. Validate uploaded image
    2. Classify garment type using CNN model
    3. Remove background using rembg (u2net)
    4. Save processed image
    5. Return results with URLs
    """
    # Validate content type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Must be an image (JPEG, PNG, WEBP)."
        )

    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        logger.error(f"Failed to read uploaded file: {e}")
        raise HTTPException(
            status_code=400,
            detail="Failed to read uploaded file"
        )

    # Validate file size
    if len(content) > settings.max_file_size:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {settings.max_file_size / (1024*1024):.1f}MB"
        )

    # Validate not empty
    if len(content) == 0:
        raise HTTPException(
            status_code=400,
            detail="Empty file uploaded"
        )

    # Process garment
    try:
        result = await garment_service.process_garment(content)
        return result

    except Exception as e:
        logger.error(f"Unexpected error processing garment: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/", tags=["Info"])
async def root(settings: Settings = Depends(get_settings)):
    """
    API information endpoint
    """
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "process": "/api/process",
            "health": "/api/health"
        }
    }
