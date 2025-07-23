from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # API Settings
    api_title: str = "AR Fashion ML API"
    api_version: str = "1.0.0"
    api_description: str = "ML backend for AR Fashion Try-On"

    # Server Settings
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

    # CORS Settings
    cors_origins: list = ["http://localhost:3000", "http://localhost:3001"]

    # ML Model Settings
    models_dir: str = "./models"
    yolo_model: str = "yolov8n-seg.pt"
    pose_confidence_threshold: float = 0.5
    garment_confidence_threshold: float = 0.7

    # Image Processing
    max_image_size: int = 1024  # Max dimension for processing
    supported_formats: list = ["jpg", "jpeg", "png", "webp"]

    # Performance
    enable_gpu: bool = True
    batch_size: int = 1
    
    # Logging
    log_level: str = "INFO"
    log_to_file: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()