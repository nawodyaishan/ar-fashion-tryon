"""
Pipeline Service

Integrates the ML pipeline architecture with the core services to provide
a unified interface for processing garment detection, pose estimation, and try-on requests.
"""

import asyncio
import logging
import time
import uuid
from typing import Any, Dict, Optional, List, Union
from dataclasses import dataclass

from ..core.pipeline import (
    MLPipeline, PipelineRegistry, PipelineContext, PipelineResult,
    InputValidator, Preprocessor, ModelInference, Postprocessor, OutputFormatter,
    pipeline_registry
)
from ..core.image_processor import ImageProcessor, ImageValidator, ImageValidationConfig, ImageProcessingConfig
from ..core.model_manager import ModelManager
from ..core.device_manager import DeviceManager
from ..models.schemas import (
    GarmentDetectionResult, PoseDetectionResult, TryOnResult,
    ProcessingOptions, DetectionMetadata
)

logger = logging.getLogger(__name__)


@dataclass
class PipelineRequest:
    """Request container for pipeline processing"""
    request_id: str
    image_data: bytes
    processing_options: ProcessingOptions
    additional_data: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.additional_data is None:
            self.additional_data = {}


class GarmentDetectionValidator(InputValidator):
    """Validator for garment detection pipeline"""
    
    def __init__(self):
        super().__init__({
            "image_required": True,
            "max_file_size": 10 * 1024 * 1024,  # 10MB
            "allowed_formats": ["jpg", "jpeg", "png", "webp"]
        })
        self.image_validator = ImageValidator(ImageValidationConfig())
    
    async def process(self, input_data: PipelineRequest, context: PipelineContext) -> PipelineRequest:
        """Validate garment detection input"""
        # Validate image
        validation_result = await self.image_validator.validate_upload(
            input_data.image_data, 
            "garment_image"
        )
        
        if not validation_result["valid"]:
            raise ValueError(f"Image validation failed: {validation_result['error']}")
        
        # Store validation metadata
        context.add_metadata("image_validation", validation_result["metadata"])
        
        return input_data


class GarmentDetectionPreprocessor(Preprocessor):
    """Preprocessor for garment detection"""
    
    def __init__(self):
        super().__init__({
            "target_size": (640, 640),
            "normalize": True,
            "to_rgb": True
        })
        self.image_processor = ImageProcessor(
            ImageProcessingConfig(
                target_size=(640, 640),
                normalize=True,
                to_rgb=True
            )
        )
    
    async def process(self, input_data: PipelineRequest, context: PipelineContext) -> Dict[str, Any]:
        """Preprocess image for garment detection"""
        # Process image
        processed_image = await self.image_processor.process_image(input_data.image_data)
        
        # Store preprocessing metadata
        context.add_metadata("preprocessing", {
            "original_size": processed_image.original_size,
            "processed_size": processed_image.processed_size,
            "scale_factor": processed_image.scale_factor,
            "padding": processed_image.padding
        })
        
        return {
            "image": processed_image.image,
            "metadata": processed_image.metadata,
            "scale_factor": processed_image.scale_factor,
            "padding": processed_image.padding,
            "processing_options": input_data.processing_options
        }


class GarmentDetectionInference(ModelInference):
    """Model inference for garment detection"""
    
    def __init__(self, model_manager: ModelManager):
        super().__init__(model_manager, "garment_detector")
    
    async def process(self, input_data: Dict[str, Any], context: PipelineContext) -> Dict[str, Any]:
        """Run garment detection inference"""
        model = await self.model_manager.get_model("garment_detector")
        
        # Run inference
        detection_result = await model.predict(input_data["image"])
        
        # Add inference metadata
        context.add_metadata("inference", {
            "model_name": "garment_detector",
            "model_version": model.config.name,
            "confidence_threshold": input_data["processing_options"].confidence_threshold
        })
        
        return {
            **input_data,
            "detection_result": detection_result
        }


class GarmentDetectionPostprocessor(Postprocessor):
    """Postprocessor for garment detection"""
    
    def __init__(self):
        super().__init__({
            "denormalize_coordinates": True,
            "filter_confidence": True
        })
    
    async def process(self, input_data: Dict[str, Any], context: PipelineContext) -> Dict[str, Any]:
        """Postprocess garment detection results"""
        detection_result = input_data["detection_result"]
        scale_factor = input_data["scale_factor"]
        padding = input_data["padding"]
        
        # Denormalize coordinates back to original image space
        if detection_result and hasattr(detection_result, 'bbox'):
            bbox = detection_result.bbox
            # Adjust for padding and scaling
            bbox.x1 = (bbox.x1 * input_data["metadata"].width - padding[2]) / scale_factor
            bbox.y1 = (bbox.y1 * input_data["metadata"].height - padding[0]) / scale_factor
            bbox.x2 = (bbox.x2 * input_data["metadata"].width - padding[2]) / scale_factor
            bbox.y2 = (bbox.y2 * input_data["metadata"].height - padding[0]) / scale_factor
        
        return {
            "detection_result": detection_result,
            "processing_metadata": context.metadata
        }


class GarmentDetectionFormatter(OutputFormatter):
    """Output formatter for garment detection"""
    
    def __init__(self):
        super().__init__(GarmentDetectionResult)
    
    async def process(self, input_data: Dict[str, Any], context: PipelineContext) -> GarmentDetectionResult:
        """Format garment detection output"""
        return input_data["detection_result"]


class PoseDetectionValidator(InputValidator):
    """Validator for pose detection pipeline"""
    
    def __init__(self):
        super().__init__({
            "image_required": True,
            "person_required": True
        })
        self.image_validator = ImageValidator(ImageValidationConfig())
    
    async def process(self, input_data: PipelineRequest, context: PipelineContext) -> PipelineRequest:
        """Validate pose detection input"""
        validation_result = await self.image_validator.validate_upload(
            input_data.image_data,
            "person_image"
        )
        
        if not validation_result["valid"]:
            raise ValueError(f"Image validation failed: {validation_result['error']}")
        
        context.add_metadata("image_validation", validation_result["metadata"])
        return input_data


class PoseDetectionPreprocessor(Preprocessor):
    """Preprocessor for pose detection"""
    
    def __init__(self):
        super().__init__({
            "target_size": (480, 640),
            "normalize": False,  # MediaPipe handles its own normalization
            "to_rgb": True
        })
        self.image_processor = ImageProcessor(
            ImageProcessingConfig(
                target_size=(480, 640),
                normalize=False,
                to_rgb=True
            )
        )
    
    async def process(self, input_data: PipelineRequest, context: PipelineContext) -> Dict[str, Any]:
        """Preprocess image for pose detection"""
        processed_image = await self.image_processor.process_image(input_data.image_data)
        
        context.add_metadata("preprocessing", {
            "original_size": processed_image.original_size,
            "processed_size": processed_image.processed_size
        })
        
        return {
            "image": processed_image.image,
            "metadata": processed_image.metadata,
            "scale_factor": processed_image.scale_factor,
            "processing_options": input_data.processing_options
        }


class PoseDetectionInference(ModelInference):
    """Model inference for pose detection"""
    
    def __init__(self, model_manager: ModelManager):
        super().__init__(model_manager, "pose_estimator")
    
    async def process(self, input_data: Dict[str, Any], context: PipelineContext) -> Dict[str, Any]:
        """Run pose detection inference"""
        model = await self.model_manager.get_model("pose_estimator")
        
        pose_result = await model.predict(input_data["image"])
        
        context.add_metadata("inference", {
            "model_name": "pose_estimator",
            "model_version": model.config.name
        })
        
        return {
            **input_data,
            "pose_result": pose_result
        }


class PoseDetectionPostprocessor(Postprocessor):
    """Postprocessor for pose detection"""
    
    def __init__(self):
        super().__init__({
            "denormalize_keypoints": True,
            "filter_visibility": True
        })
    
    async def process(self, input_data: Dict[str, Any], context: PipelineContext) -> Dict[str, Any]:
        """Postprocess pose detection results"""
        pose_result = input_data["pose_result"]
        
        # Filter keypoints by visibility if needed
        if pose_result and hasattr(pose_result, 'keypoints'):
            visible_keypoints = [
                kp for kp in pose_result.keypoints 
                if kp.visibility > input_data["processing_options"].confidence_threshold
            ]
            pose_result.keypoints = visible_keypoints
        
        return {
            "pose_result": pose_result,
            "processing_metadata": context.metadata
        }


class PoseDetectionFormatter(OutputFormatter):
    """Output formatter for pose detection"""
    
    def __init__(self):
        super().__init__(PoseDetectionResult)
    
    async def process(self, input_data: Dict[str, Any], context: PipelineContext) -> PoseDetectionResult:
        """Format pose detection output"""
        return input_data["pose_result"]


class TryOnPipelineValidator(InputValidator):
    """Validator for virtual try-on pipeline"""
    
    def __init__(self):
        super().__init__({
            "garment_image_required": True,
            "person_image_required": True
        })
        self.image_validator = ImageValidator(ImageValidationConfig())
    
    async def process(self, input_data: Dict[str, Any], context: PipelineContext) -> Dict[str, Any]:
        """Validate try-on input"""
        # Validate both images
        for image_key, image_data in [("garment_image", input_data.get("garment_image")), 
                                      ("person_image", input_data.get("person_image"))]:
            if not image_data:
                raise ValueError(f"{image_key} is required")
            
            validation_result = await self.image_validator.validate_upload(image_data, image_key)
            if not validation_result["valid"]:
                raise ValueError(f"{image_key} validation failed: {validation_result['error']}")
            
            context.add_metadata(f"{image_key}_validation", validation_result["metadata"])
        
        return input_data


class PipelineService:
    """Service for managing ML pipelines"""
    
    def __init__(self, model_manager: ModelManager, device_manager: DeviceManager):
        self.model_manager = model_manager
        self.device_manager = device_manager
        self.logger = logging.getLogger(f"{__name__}.PipelineService")
        
        # Initialize pipelines
        asyncio.create_task(self._initialize_pipelines())
    
    async def _initialize_pipelines(self):
        """Initialize all ML pipelines"""
        try:
            # Garment Detection Pipeline
            garment_pipeline = MLPipeline(
                name="garment_detection",
                validator=GarmentDetectionValidator(),
                preprocessor=GarmentDetectionPreprocessor(),
                model_inference=GarmentDetectionInference(self.model_manager),
                postprocessor=GarmentDetectionPostprocessor(),
                output_formatter=GarmentDetectionFormatter()
            )
            pipeline_registry.register_pipeline(garment_pipeline)
            
            # Pose Detection Pipeline
            pose_pipeline = MLPipeline(
                name="pose_detection",
                validator=PoseDetectionValidator(),
                preprocessor=PoseDetectionPreprocessor(),
                model_inference=PoseDetectionInference(self.model_manager),
                postprocessor=PoseDetectionPostprocessor(),
                output_formatter=PoseDetectionFormatter()
            )
            pipeline_registry.register_pipeline(pose_pipeline)
            
            self.logger.info("All pipelines initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize pipelines: {e}")
            raise
    
    async def process_garment_detection(self, 
                                      image_data: bytes, 
                                      processing_options: ProcessingOptions = None) -> PipelineResult[GarmentDetectionResult]:
        """Process garment detection request"""
        request_id = str(uuid.uuid4())
        
        pipeline_request = PipelineRequest(
            request_id=request_id,
            image_data=image_data,
            processing_options=processing_options or ProcessingOptions()
        )
        
        return await pipeline_registry.execute_pipeline(
            "garment_detection",
            pipeline_request,
            request_id,
            device=str(await self.device_manager.get_optimal_device()),
            model_version="1.0"
        )
    
    async def process_pose_detection(self, 
                                   image_data: bytes, 
                                   processing_options: ProcessingOptions = None) -> PipelineResult[PoseDetectionResult]:
        """Process pose detection request"""
        request_id = str(uuid.uuid4())
        
        pipeline_request = PipelineRequest(
            request_id=request_id,
            image_data=image_data,
            processing_options=processing_options or ProcessingOptions()
        )
        
        return await pipeline_registry.execute_pipeline(
            "pose_detection",
            pipeline_request,
            request_id,
            device=str(await self.device_manager.get_optimal_device()),
            model_version="1.0"
        )
    
    async def process_virtual_tryon(self, 
                                  garment_image: bytes, 
                                  person_image: bytes,
                                  processing_options: ProcessingOptions = None) -> PipelineResult[TryOnResult]:
        """Process virtual try-on request"""
        # For now, this is a placeholder that combines garment and pose detection
        # In a full implementation, this would use a specialized try-on model
        
        request_id = str(uuid.uuid4())
        
        # Run both garment detection and pose detection
        garment_result = await self.process_garment_detection(garment_image, processing_options)
        pose_result = await self.process_pose_detection(person_image, processing_options)
        
        # Create combined result (placeholder)
        if garment_result.success and pose_result.success:
            try_on_result = TryOnResult(
                result_image="placeholder_base64_image",
                alignment_score=0.85,
                fit_score=0.78,
                processing_time=garment_result.total_time + pose_result.total_time,
                metadata={
                    "garment_detection": garment_result.data,
                    "pose_detection": pose_result.data
                }
            )
            
            return PipelineResult(
                success=True,
                data=try_on_result,
                error=None,
                context=garment_result.context,  # Use first context
                stage_timings={}
            )
        else:
            error_msg = f"Garment: {garment_result.error}, Pose: {pose_result.error}"
            return PipelineResult(
                success=False,
                data=None,
                error=error_msg,
                context=garment_result.context,
                stage_timings={}
            )
    
    def get_pipeline_stats(self) -> Dict[str, Any]:
        """Get statistics for all pipelines"""
        return {
            "available_pipelines": pipeline_registry.list_pipelines(),
            "device_info": self.device_manager.get_device_info(),
            "model_manager_stats": self.model_manager.get_system_stats()
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on all pipelines"""
        health_status = {
            "overall_healthy": True,
            "pipelines": {},
            "models": {},
            "devices": {}
        }
        
        # Check pipelines
        for pipeline_name in pipeline_registry.list_pipelines():
            try:
                pipeline = pipeline_registry.get_pipeline(pipeline_name)
                health_status["pipelines"][pipeline_name] = {
                    "status": "healthy",
                    "info": pipeline.get_pipeline_info()
                }
            except Exception as e:
                health_status["pipelines"][pipeline_name] = {
                    "status": "unhealthy",
                    "error": str(e)
                }
                health_status["overall_healthy"] = False
        
        # Check devices
        health_status["devices"] = self.device_manager.get_device_info()
        
        return health_status