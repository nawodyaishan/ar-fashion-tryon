from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import Optional

from app.services.garment_service import GarmentService
from app.models.schemas import GarmentDetectionResult

router = APIRouter(prefix="/garment", tags=["garment"])
garment_service = GarmentService()

@router.post("/detect", response_model=Optional[GarmentDetectionResult])
async def detect_garment(file: UploadFile = File(...)):
    """Detect and analyze garment from uploaded image"""

    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Read file content
    content = await file.read()

    # Process garment
    result = await garment_service.process_garment_image(content)

    if not result:
        raise HTTPException(status_code=404, detail="No garment detected in image")

    return result

@router.post("/segment")
async def segment_garment(file: UploadFile = File(...)):
    """Segment garment and return mask"""
    # Implementation for garment segmentation
    pass