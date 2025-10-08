"""
Garment Classification Service

High-level service that orchestrates classification and extraction.
"""

import io
import uuid
import logging
import time
from pathlib import Path
from typing import Tuple
from PIL import Image

from ..config import Settings
from ..models.classifier import GarmentClassifier
from ..models.schemas import (
    GarmentType,
    ClassificationResult,
    ExtractionResult,
    GarmentProcessResponse
)
from .extraction import GarmentExtractor

logger = logging.getLogger(__name__)


class GarmentService:
    """High-level service for garment processing"""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.classifier = GarmentClassifier(settings)
        self.extractor = GarmentExtractor()

    def _load_image_from_bytes(self, image_bytes: bytes) -> Image.Image:
        """
        Load PIL Image from bytes

        Args:
            image_bytes: Raw image bytes

        Returns:
            PIL Image in RGB format
        """
        try:
            image = Image.open(io.BytesIO(image_bytes))
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            return image
        except Exception as e:
            logger.error(f"Failed to load image from bytes: {e}")
            raise ValueError(f"Invalid image data: {e}")

    def _save_image(
        self,
        image: Image.Image,
        subdirectory: str,
        prefix: str
    ) -> Tuple[Path, str, str]:
        """
        Save image to disk and return paths

        Args:
            image: PIL Image to save
            subdirectory: 'uploads' or 'outputs'
            prefix: Filename prefix

        Returns:
            Tuple of (absolute_path, url_path, relative_path)
        """
        # Generate unique filename
        filename = f"{prefix}_{uuid.uuid4().hex[:8]}.png"

        # Determine output directory
        if subdirectory == 'outputs':
            output_dir = self.settings.outputs_dir
        else:
            output_dir = self.settings.uploads_dir

        # Save image
        absolute_path = output_dir / filename
        image.save(absolute_path)

        # Create URL path (POSIX format)
        relative_path = f"{subdirectory}/{filename}".replace("\\", "/")
        url_path = f"/static/{relative_path}"

        logger.info(f"Saved image to {absolute_path}")
        return absolute_path, url_path, relative_path

    async def process_garment(
        self,
        image_bytes: bytes
    ) -> GarmentProcessResponse:
        """
        Process a garment image: classify and extract

        Args:
            image_bytes: Raw image bytes from upload

        Returns:
            Complete processing response
        """
        start_time = time.time()

        try:
            # Load image
            image = self._load_image_from_bytes(image_bytes)

            # Save original
            _, original_url, _ = self._save_image(image, 'uploads', 'garment')

            # Classify garment
            label, confidence, metadata = await self.classifier.classify(image)
            logger.info(f"Classification result: {label} (confidence: {confidence:.3f})")

            # Check if valid garment type
            if not self.classifier.is_valid_garment(label):
                processing_time = (time.time() - start_time) * 1000
                return GarmentProcessResponse(
                    success=False,
                    message=f"Garment must be a T-shirt or Trousers. Detected: {label.value}",
                    classification=ClassificationResult(
                        label=label,
                        confidence=confidence
                    ),
                    extraction=None,
                    processing_time_ms=processing_time
                )

            # Extract garment (remove background)
            cutout = await self.extractor.extract_garment(image)

            # Save cutout
            _, cutout_url, cutout_path = self._save_image(
                cutout,
                'outputs',
                f'cutout_{label.value}'
            )

            # Calculate processing time
            processing_time = (time.time() - start_time) * 1000

            # Build response
            return GarmentProcessResponse(
                success=True,
                message="Garment processed successfully",
                classification=ClassificationResult(
                    label=label,
                    confidence=confidence
                ),
                extraction=ExtractionResult(
                    cutout_url=cutout_url,
                    cutout_path=cutout_path,
                    original_url=original_url
                ),
                processing_time_ms=processing_time
            )

        except ValueError as e:
            # Image loading errors
            processing_time = (time.time() - start_time) * 1000
            logger.error(f"Validation error: {e}")
            return GarmentProcessResponse(
                success=False,
                message=str(e),
                classification=None,
                extraction=None,
                processing_time_ms=processing_time
            )

        except Exception as e:
            # Unexpected errors
            processing_time = (time.time() - start_time) * 1000
            logger.error(f"Processing error: {e}", exc_info=True)
            return GarmentProcessResponse(
                success=False,
                message=f"Processing failed: {str(e)}",
                classification=None,
                extraction=None,
                processing_time_ms=processing_time
            )
