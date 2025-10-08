"""
Pydantic Schemas

Request and response models for the API.
"""

from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, HttpUrl


class GarmentType(str, Enum):
    """Supported garment types"""
    TSHIRT = "tshirt"
    TROUSERS = "trousers"
    UNKNOWN = "unknown"


class ClassificationResult(BaseModel):
    """Garment classification result"""
    label: GarmentType = Field(..., description="Classified garment type")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Classification confidence score")

    class Config:
        json_schema_extra = {
            "example": {
                "label": "tshirt",
                "confidence": 0.92
            }
        }


class ExtractionResult(BaseModel):
    """Garment extraction (background removal) result"""
    cutout_url: str = Field(..., description="URL to the extracted garment image")
    cutout_path: str = Field(..., description="Relative path to the cutout image")
    original_url: str = Field(..., description="URL to the original uploaded image")

    class Config:
        json_schema_extra = {
            "example": {
                "cutout_url": "/static/outputs/cutout_tshirt_a1b2c3d4.png",
                "cutout_path": "outputs/cutout_tshirt_a1b2c3d4.png",
                "original_url": "/static/uploads/garment_a1b2c3d4.png"
            }
        }


class GarmentProcessResponse(BaseModel):
    """Complete garment processing response"""
    success: bool = Field(..., description="Whether the processing was successful")
    message: str = Field(..., description="Human-readable message")
    classification: Optional[ClassificationResult] = Field(None, description="Classification results")
    extraction: Optional[ExtractionResult] = Field(None, description="Extraction results")
    processing_time_ms: Optional[float] = Field(None, description="Total processing time in milliseconds")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Garment processed successfully",
                "classification": {
                    "label": "tshirt",
                    "confidence": 0.92
                },
                "extraction": {
                    "cutout_url": "/static/outputs/cutout_tshirt_a1b2c3d4.png",
                    "cutout_path": "outputs/cutout_tshirt_a1b2c3d4.png",
                    "original_url": "/static/uploads/garment_a1b2c3d4.png"
                },
                "processing_time_ms": 1234.56
            }
        }


class ErrorResponse(BaseModel):
    """Error response model"""
    success: bool = Field(False, description="Always False for errors")
    message: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(None, description="Error code for programmatic handling")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")

    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "message": "Garment must be a T-shirt or Trousers",
                "error_code": "INVALID_GARMENT_TYPE",
                "details": {"detected": "other", "confidence": 0.45}
            }
        }


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(..., description="Service status")
    model_loaded: bool = Field(..., description="Whether the ML model is loaded")
    model_name: Optional[str] = Field(None, description="Name of the loaded model")
    version: str = Field(..., description="API version")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "model_loaded": True,
                "model_name": "best_clothing_model.h5",
                "version": "1.0.0"
            }
        }
