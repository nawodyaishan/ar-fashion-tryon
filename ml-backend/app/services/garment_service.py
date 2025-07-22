import cv2
import numpy as np
from typing import Optional
import base64
from io import BytesIO
from PIL import Image
import logging

from app.models.schemas import GarmentDetectionResult
from app.models.ml_models import GarmentDetector, ModelManager
from app.config import settings

logger = logging.getLogger(__name__)

class GarmentService:
    """Service for garment processing operations"""

    def __init__(self):
        self.model_manager = ModelManager(settings)
        self.detector = GarmentDetector(self.model_manager)

    async def process_garment_image(self, image_data: bytes) -> Optional[GarmentDetectionResult]:
        """Process uploaded garment image"""
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if image is None:
                logger.error("Failed to decode image")
                return None

            # Resize if too large
            image = self._resize_image(image)

            # Detect garment
            result = self.detector.detect(image)

            if result and result.mask:
                # Store processed image
                result.processed_image = self._encode_image(image)

            return result

        except Exception as e:
            logger.error(f"Error processing garment: {e}")
            return None

    def _resize_image(self, image: np.ndarray) -> np.ndarray:
        """Resize image if too large"""
        max_dim = settings.max_image_size
        height, width = image.shape[:2]

        if max(height, width) > max_dim:
            scale = max_dim / max(height, width)
            new_width = int(width * scale)
            new_height = int(height * scale)
            return cv2.resize(image, (new_width, new_height))

        return image

    def _encode_image(self, image: np.ndarray) -> str:
        """Encode image to base64 string"""
        _, buffer = cv2.imencode('.jpg', image)
        return base64.b64encode(buffer).decode('utf-8')