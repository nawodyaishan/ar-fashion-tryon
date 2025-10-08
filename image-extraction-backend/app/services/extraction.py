"""
Garment Extraction Service

Background removal and image processing for garment extraction.
"""

import logging
from PIL import Image
from rembg import remove as rembg_remove

logger = logging.getLogger(__name__)


class GarmentExtractor:
    """Service for extracting garments by removing backgrounds"""

    def __init__(self):
        """Initialize the garment extractor"""
        logger.info("Initialized GarmentExtractor with rembg")

    async def remove_background(self, image: Image.Image) -> Image.Image:
        """
        Remove background from garment image

        Args:
            image: PIL Image in RGB or RGBA format

        Returns:
            PIL Image in RGBA format with transparent background
        """
        try:
            # Ensure image is in RGBA format
            if image.mode != 'RGBA':
                image = image.convert('RGBA')

            # Remove background using rembg (u2net model)
            output = rembg_remove(image)

            logger.info("Successfully removed background")
            return output

        except Exception as e:
            logger.error(f"Background removal failed: {e}")
            raise

    async def extract_garment(self, image: Image.Image) -> Image.Image:
        """
        Extract garment from image (wrapper for remove_background)

        Args:
            image: PIL Image

        Returns:
            Extracted garment image with transparent background
        """
        return await self.remove_background(image)
