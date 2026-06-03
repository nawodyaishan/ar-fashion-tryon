from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Query
from typing import Optional

from ...services.garment_service import GarmentService
from ...models.schemas import GarmentDetectionResponse, ProcessingOptions, ImageValidation
from ...core.model_manager import ModelManager
from ...core.device_manager import DeviceManager, initialize_device_manager
from ...config import settings

router = APIRouter(prefix="/garment", tags=["garment"])

# Initialize services (in production, these would be dependency injected)
device_manager = initialize_device_manager()
model_manager = ModelManager(device_manager)
garment_service = GarmentService(model_manager, device_manager)

@router.post("/detect", response_model=GarmentDetectionResponse)
async def detect_garment(
    file: UploadFile = File(...),
    confidence_threshold: float = Query(0.5, ge=0.1, le=1.0),
    max_dimension: int = Query(1024, ge=128, le=2048),
    return_visualization: bool = Query(False)
):
    """Detect and analyze garment from uploaded image with enhanced pipeline"""

    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Read file content
    content = await file.read()
    
    # Validate file size
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")

    # Create processing options
    processing_options = ProcessingOptions(
        confidence_threshold=confidence_threshold,
        max_dimension=max_dimension,
        return_visualization=return_visualization
    )

    try:
        # Process garment using pipeline
        result = await garment_service.process_garment_image(content, processing_options)

        if result:
            return GarmentDetectionResponse(
                result=result,
                metadata={
                    "model_version": "yolo_v8_garment",
                    "processing_time": 0.0,  # Will be filled by pipeline
                    "image_dimensions": {"width": 0, "height": 0},  # Will be filled by pipeline
                    "device_used": str(await device_manager.get_optimal_device())
                },
                success=True,
                message="Garment detected successfully"
            )
        else:
            return GarmentDetectionResponse(
                result=None,
                metadata={
                    "model_version": "yolo_v8_garment",
                    "processing_time": 0.0,
                    "image_dimensions": {"width": 0, "height": 0},
                    "device_used": str(await device_manager.get_optimal_device())
                },
                success=False,
                message="No garment detected in image"
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@router.post("/segment")
async def segment_garment(
    file: UploadFile = File(...),
    confidence_threshold: float = Query(0.5, ge=0.1, le=1.0)
):
    """Segment garment and return mask with bounding box"""
    
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Read file content
    content = await file.read()

    try:
        # Get segmentation result
        result = await garment_service.segment_garment(content)
        
        if result:
            return {
                "success": True,
                "message": "Garment segmented successfully",
                "data": result
            }
        else:
            raise HTTPException(status_code=404, detail="No garment found for segmentation")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Segmentation failed: {str(e)}")

@router.post("/validate")
async def validate_image(file: UploadFile = File(...)):
    """Validate uploaded image for garment detection"""
    
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    content = await file.read()
    
    try:
        from ...core.image_processor import ImageValidator, ImageValidationConfig
        
        validator = ImageValidator(ImageValidationConfig())
        validation_result = await validator.validate_upload(content, file.filename)
        
        if validation_result["valid"]:
            return ImageValidation(
                is_valid=True,
                file_size=len(content),
                dimensions={"width": validation_result["metadata"].width, "height": validation_result["metadata"].height},
                format=validation_result["metadata"].format,
                errors=[]
            )
        else:
            return ImageValidation(
                is_valid=False,
                file_size=len(content),
                dimensions={"width": 0, "height": 0},
                format="unknown",
                errors=[validation_result["error"]]
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")