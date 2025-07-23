import logging
from typing import Optional

from ..core.model_manager import ModelManager
from ..core.device_manager import DeviceManager
from ..models.schemas import GarmentDetectionResult, ProcessingOptions
from .pipeline_service import PipelineService

logger = logging.getLogger(__name__)


class GarmentService:
    """Service for garment processing operations using ML pipelines"""

    def __init__(self, model_manager: ModelManager, device_manager: DeviceManager):
        self.model_manager = model_manager
        self.device_manager = device_manager
        self.pipeline_service = PipelineService(model_manager, device_manager)

    async def process_garment_image(self, 
                                  image_data: bytes, 
                                  processing_options: ProcessingOptions = None) -> Optional[GarmentDetectionResult]:
        """Process uploaded garment image using ML pipeline"""
        try:
            # Use pipeline service for processing
            result = await self.pipeline_service.process_garment_detection(
                image_data, 
                processing_options or ProcessingOptions()
            )
            
            if result.success:
                return result.data
            else:
                logger.error(f"Garment detection failed: {result.error}")
                return None

        except Exception as e:
            logger.error(f"Error processing garment: {e}")
            return None

    async def segment_garment(self, image_data: bytes) -> Optional[dict]:
        """Segment garment and return segmentation mask"""
        # This would use a dedicated segmentation pipeline
        # For now, return the detection result which may include masks
        result = await self.process_garment_image(image_data)
        
        if result and result.mask:
            return {
                "mask": result.mask,
                "bbox": result.bbox,
                "confidence": result.confidence
            }
        
        return None