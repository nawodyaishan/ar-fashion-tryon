"""
Dependency Injection

FastAPI dependencies for services and configuration.
"""

from functools import lru_cache
from fastapi import Depends

from ..config import Settings, get_settings
from ..services.classification import GarmentService


# Cached service instances
_garment_service = None


def get_garment_service(settings: Settings = Depends(get_settings)) -> GarmentService:
    """
    Get or create garment service instance

    Args:
        settings: Application settings

    Returns:
        Singleton GarmentService instance
    """
    global _garment_service
    if _garment_service is None:
        _garment_service = GarmentService(settings)
    return _garment_service
