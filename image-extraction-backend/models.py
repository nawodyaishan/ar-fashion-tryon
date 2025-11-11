"""
Pydantic models for request/response schemas.
"""
from typing import Optional, Dict, List
from pydantic import BaseModel, Field


class HealthOut(BaseModel):
    status: str = "ok"
    version: str = "2.0.0"
    model_loaded: bool = False
    model_name: Optional[str] = None
    gradio_connected: bool = False
    keypoint_model_loaded: bool = False
    services: Optional[Dict[str, str]] = None


class UrlIn(BaseModel):
    source_url: str


class VirtualTryonRequest(BaseModel):
    cloth_type: str = "upper"  # upper, lower, overall
    num_inference_steps: int = 50
    guidance_scale: float = 2.5
    seed: int = 42
    show_type: str = "result only"  # result only, input & result, input & mask & result


# Keypoint detection models
class Keypoint(BaseModel):
    """Single keypoint with normalized coordinates."""
    name: str = Field(..., description="Keypoint name (e.g., 'left_shoulder', 'right_shoulder')")
    x: float = Field(..., ge=0.0, le=1.0, description="X coordinate normalized to 0-1 range")
    y: float = Field(..., ge=0.0, le=1.0, description="Y coordinate normalized to 0-1 range")
    x_pixel: float = Field(..., description="X coordinate in pixels")
    y_pixel: float = Field(..., description="Y coordinate in pixels")
    visible: bool = Field(default=True, description="Whether keypoint is visible")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence score")
    derived: Optional[bool] = Field(default=False, description="Whether this is a calculated/derived keypoint")


class ImageDimensions(BaseModel):
    """Original image dimensions."""
    width: int = Field(..., description="Image width in pixels")
    height: int = Field(..., description="Image height in pixels")


class KeypointDetectionResponse(BaseModel):
    """Response model for keypoint detection endpoints."""
    success: bool = True
    garment_url: str = Field(..., description="Cloudinary URL of the uploaded garment image")
    garment_public_id: str = Field(..., description="Cloudinary public ID")
    all_keypoints: List[Keypoint] = Field(..., description="All detected keypoints with normalized coordinates")
    garment_keypoints: Dict = Field(..., description="Organized keypoints for garment alignment (shoulders, hips, etc.)")
    image_dimensions: ImageDimensions = Field(..., description="Original image dimensions")
    detection_confidence: float = Field(..., ge=0.0, le=1.0, description="Overall detection confidence")
    message: str = Field(default="Keypoints detected successfully")
