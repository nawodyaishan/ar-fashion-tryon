from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any, Union
from enum import Enum
from datetime import datetime

class GarmentType(str, Enum):
    SHIRT = "shirt"
    PANTS = "pants"
    DRESS = "dress"
    SKIRT = "skirt"
    JACKET = "jacket"
    UNKNOWN = "unknown"

class KeyPoint(BaseModel):
    x: float = Field(..., ge=0, le=1, description="X coordinate (0-1)")
    y: float = Field(..., ge=0, le=1, description="Y coordinate (0-1)")
    z: Optional[float] = Field(None, ge=-1, le=1, description="Z coordinate for 3D")
    visibility: float = Field(..., ge=0, le=1, description="Keypoint visibility")
    name: Optional[str] = None

class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float

class GarmentFeatures(BaseModel):
    color_rgb: List[int] = Field(..., min_items=3, max_items=3)
    color_name: str
    pattern: Optional[str] = None
    texture: Optional[str] = None

class GarmentDetectionResult(BaseModel):
    type: GarmentType
    bbox: BoundingBox
    mask: Optional[List[List[float]]] = Field(None, description="Segmentation mask coordinates")
    features: GarmentFeatures
    confidence: float = Field(..., ge=0, le=1, description="Detection confidence score")
    dimensions: Dict[str, float] = Field(..., description="Estimated garment dimensions")
    
    @validator('confidence')
    def validate_confidence(cls, v):
        if not 0 <= v <= 1:
            raise ValueError('Confidence must be between 0 and 1')
        return v

class PoseDetectionResult(BaseModel):
    keypoints: List[KeyPoint] = Field(..., min_items=1, description="Detected pose keypoints")
    bbox: BoundingBox = Field(..., description="Person bounding box")
    confidence: float = Field(..., ge=0, le=1, description="Overall pose confidence")
    body_measurements: Optional[Dict[str, float]] = Field(None, description="Estimated body measurements")
    pose_quality: Optional[str] = Field(None, description="Pose quality assessment (good/fair/poor)")
    
    @validator('confidence')
    def validate_confidence(cls, v):
        if not 0 <= v <= 1:
            raise ValueError('Confidence must be between 0 and 1')
        return v
    
    @validator('keypoints')
    def validate_keypoints(cls, v):
        if len(v) == 0:
            raise ValueError('At least one keypoint is required')
        return v

class TryOnRequest(BaseModel):
    garment_id: str
    pose_data: Optional[PoseDetectionResult] = None

class TryOnResult(BaseModel):
    result_image: str = Field(..., description="Base64 encoded result image")
    alignment_score: float = Field(..., ge=0, le=1, description="How well the garment aligns with the pose")
    fit_score: float = Field(..., ge=0, le=1, description="How well the garment fits the body")
    processing_time: float = Field(..., gt=0, description="Processing time in seconds")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional processing metadata")

# API Response Models
class HealthResponse(BaseModel):
    status: str = Field(..., description="Service health status")
    timestamp: str = Field(..., description="Health check timestamp")
    version: str = Field(..., description="API version")
    models_loaded: bool = Field(..., description="Whether ML models are loaded")
    models_status: Dict[str, str] = Field(..., description="Status of individual models")
    system_info: Dict[str, Any] = Field(..., description="System information")
    endpoints: Dict[str, str] = Field(..., description="Available API endpoints")

class ErrorResponse(BaseModel):
    error: str = Field(..., description="Error message")
    status_code: int = Field(..., description="HTTP status code")
    timestamp: str = Field(..., description="Error timestamp")
    path: str = Field(..., description="Request path that caused the error")
    details: Optional[List[Dict[str, Any]]] = Field(None, description="Additional error details")

class SuccessResponse(BaseModel):
    message: str = Field(..., description="Success message")
    data: Optional[Dict[str, Any]] = Field(None, description="Response data")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

# Request Models
class ImageUploadRequest(BaseModel):
    """Base model for image upload validation"""
    max_file_size: int = Field(default=10 * 1024 * 1024, description="Max file size in bytes")
    allowed_formats: List[str] = Field(default=["jpg", "jpeg", "png", "webp"])

class ProcessingOptions(BaseModel):
    """Processing configuration options"""
    resize_image: bool = Field(default=True, description="Whether to resize input images")
    max_dimension: int = Field(default=1024, ge=128, le=2048, description="Maximum image dimension")
    confidence_threshold: float = Field(default=0.5, ge=0.1, le=1.0, description="Detection confidence threshold")
    return_visualization: bool = Field(default=False, description="Return annotated visualization")

# Enhanced Detection Results
class DetectionMetadata(BaseModel):
    """Metadata for detection results"""
    model_version: str = Field(..., description="Model version used")
    processing_time: float = Field(..., gt=0, description="Processing time in seconds")
    image_dimensions: Dict[str, int] = Field(..., description="Original image dimensions")
    device_used: str = Field(..., description="Device used for inference (cpu/cuda)")

class GarmentDetectionResponse(BaseModel):
    """Complete garment detection response"""
    result: Optional[GarmentDetectionResult] = Field(None, description="Detection result")
    metadata: DetectionMetadata = Field(..., description="Processing metadata")
    visualization: Optional[str] = Field(None, description="Base64 encoded visualization image")
    success: bool = Field(..., description="Whether detection was successful")
    message: str = Field(..., description="Status message")

class PoseDetectionResponse(BaseModel):
    """Complete pose detection response"""
    result: Optional[PoseDetectionResult] = Field(None, description="Pose detection result")
    metadata: DetectionMetadata = Field(..., description="Processing metadata")
    visualization: Optional[str] = Field(None, description="Base64 encoded visualization image")
    success: bool = Field(..., description="Whether detection was successful")
    message: str = Field(..., description="Status message")

class TryOnResponse(BaseModel):
    """Complete try-on response"""
    result: Optional[TryOnResult] = Field(None, description="Try-on result")
    metadata: DetectionMetadata = Field(..., description="Processing metadata")
    success: bool = Field(..., description="Whether try-on was successful")
    message: str = Field(..., description="Status message")

# Validation Models
class ImageValidation(BaseModel):
    """Image validation result"""
    is_valid: bool = Field(..., description="Whether image is valid")
    file_size: int = Field(..., description="File size in bytes")
    dimensions: Dict[str, int] = Field(..., description="Image dimensions")
    format: str = Field(..., description="Image format")
    errors: List[str] = Field(default=[], description="Validation errors")

# Statistics and Metrics
class ModelPerformance(BaseModel):
    """Model performance metrics"""
    avg_inference_time: float = Field(..., description="Average inference time in seconds")
    total_requests: int = Field(..., description="Total number of requests processed")
    success_rate: float = Field(..., ge=0, le=1, description="Success rate (0-1)")
    error_rate: float = Field(..., ge=0, le=1, description="Error rate (0-1)")
    last_updated: str = Field(..., description="Last update timestamp")

class SystemMetrics(BaseModel):
    """System performance metrics"""
    memory_usage: Dict[str, float] = Field(..., description="Memory usage statistics")
    gpu_usage: Optional[Dict[str, float]] = Field(None, description="GPU usage statistics")
    uptime_seconds: float = Field(..., description="System uptime in seconds")
    models_performance: Dict[str, ModelPerformance] = Field(..., description="Per-model performance metrics")