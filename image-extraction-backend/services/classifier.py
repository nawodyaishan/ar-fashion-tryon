"""
Classification service (DISABLED - returns UNKNOWN).

TensorFlow model loading is disabled to avoid compatibility issues.
Frontend enforces correct garment types, so classification is not needed.
All endpoints still work, but always return "UNKNOWN" for garment type.
"""
import logging
from pathlib import Path
from typing import Tuple

logger = logging.getLogger(__name__)


def load_model_and_config():
    """
    Model loading is disabled.

    This function is kept for compatibility but does nothing.
    Classification will always return "UNKNOWN".
    """
    logger.info("="*60)
    logger.info("TensorFlow model loading is DISABLED")
    logger.info("="*60)
    logger.info("Classification will always return 'UNKNOWN' type.")
    logger.info("This is intentional - frontend enforces correct garment selection.")
    logger.info("")
    logger.info("✅ All endpoints are functional:")
    logger.info("   - Background removal: Working")
    logger.info("   - Virtual try-on: Working")
    logger.info("   - Outfit construction: Working")
    logger.info("   - Classification: Returns 'UNKNOWN' (as expected)")
    logger.info("="*60)


def classify_image(img_path: Path) -> Tuple[str, float]:
    """
    Classification disabled - always returns UNKNOWN.

    Args:
        img_path: Path to image file (not used)

    Returns:
        Tuple of ("UNKNOWN", 0.0) always

    Note:
        Frontend enforces correct garment types, so actual classification
        is not needed. This keeps the API lightweight and avoids TensorFlow
        compatibility issues.
    """
    return "UNKNOWN", 0.0
