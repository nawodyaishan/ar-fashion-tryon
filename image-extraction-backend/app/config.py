"""
Configuration Management

Centralized configuration for the FastAPI garment extraction application.
"""

import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""

    # Application
    app_name: str = "Garment Extraction API"
    app_version: str = "1.0.0"
    debug: bool = True

    # Server
    host: str = "0.0.0.0"
    port: int = 6000

    # Paths
    base_dir: Path = Path(__file__).parent.parent
    models_dir: Path = base_dir / "models"
    static_dir: Path = base_dir / "static"
    uploads_dir: Path = static_dir / "uploads"
    outputs_dir: Path = static_dir / "outputs"

    # Model Configuration
    model_names: List[str] = ["best_clothing_model.h5", "clothing_model_final.h5"]
    img_size: tuple = (224, 224)
    class_labels_file: str = "class_labels.json"
    model_config_file: str = "model_config.json"
    rejection_threshold_file: str = "rejection_threshold.json"
    default_tau: float = 0.75

    # File Upload Limits
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    allowed_extensions: List[str] = ["jpg", "jpeg", "png", "webp"]

    # CORS
    cors_origins: List[str] = ["*"]

    # Logging
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    class Config:
        env_prefix = "GARMENT_"
        case_sensitive = False

    def ensure_directories(self):
        """Ensure required directories exist"""
        self.uploads_dir.mkdir(parents=True, exist_ok=True)
        self.outputs_dir.mkdir(parents=True, exist_ok=True)


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    settings = Settings()
    settings.ensure_directories()
    return settings
