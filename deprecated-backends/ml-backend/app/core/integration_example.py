"""
ML Pipeline Integration Example

This example demonstrates how to integrate all the core components:
- Pipeline Architecture
- Abstract Model Classes  
- Model Loading/Caching System
- GPU/CPU Device Management

This serves as a reference implementation for the AR Fashion Try-On system.
"""

import asyncio
import logging
from typing import Any, Dict, List
import numpy as np
import torch
from PIL import Image

from .pipeline import (
    MLPipeline, PipelineRegistry, InputValidator, Preprocessor, 
    ModelInference, Postprocessor, OutputFormatter, pipeline_registry
)
from .models import ModelConfig, ModelType, ModelFormat, BaseModel, PyTorchModel
from .model_manager import ModelManager, CacheConfig
from .device_manager import DeviceManager, initialize_device_manager
from ..models.schemas import GarmentDetectionResult, GarmentType, BoundingBox, GarmentFeatures

logger = logging.getLogger(__name__)


# Example Custom Model Implementation
class YOLOGarmentDetector(PyTorchModel):
    """Custom YOLO-based garment detection model"""
    
    async def preprocess(self, input_data: Image.Image) -> torch.Tensor:
        """Preprocess image for YOLO model"""
        # Resize and normalize
        img = input_data.resize((640, 640))
        img_array = np.array(img) / 255.0
        
        # Convert to tensor and add batch dimension
        tensor = torch.from_numpy(img_array).permute(2, 0, 1).float()
        tensor = tensor.unsqueeze(0).to(self.device)
        
        return tensor
    
    async def postprocess(self, model_output: torch.Tensor) -> Dict[str, Any]:
        """Postprocess YOLO output to detection format"""
        # Extract detections (simplified)
        detections = model_output[0]  # Remove batch dimension
        
        # Filter by confidence
        confident_detections = detections[detections[:, 4] > self.config.confidence_threshold]
        
        if len(confident_detections) == 0:
            return {"detections": []}
        
        # Get best detection
        best_detection = confident_detections[0]
        
        return {
            "bbox": {
                "x1": float(best_detection[0]),
                "y1": float(best_detection[1]), 
                "x2": float(best_detection[2]),
                "y2": float(best_detection[3]),
                "confidence": float(best_detection[4])
            },
            "class_id": int(best_detection[5]) if len(best_detection) > 5 else 0,
            "garment_type": self._map_class_to_garment(int(best_detection[5]) if len(best_detection) > 5 else 0)
        }
    
    def _map_class_to_garment(self, class_id: int) -> str:
        """Map YOLO class ID to garment type"""
        mapping = {0: "shirt", 1: "pants", 2: "dress", 3: "jacket"}
        return mapping.get(class_id, "unknown")


# Pipeline Components for Garment Detection
class GarmentInputValidator(InputValidator):
    """Validates garment detection input"""
    
    def __init__(self):
        super().__init__({
            "max_file_size": 10 * 1024 * 1024,  # 10MB
            "allowed_formats": ["jpg", "jpeg", "png", "webp"]
        })
    
    async def process(self, input_data: Any, context) -> Image.Image:
        """Validate and convert input to PIL Image"""
        if isinstance(input_data, bytes):
            from io import BytesIO
            input_data = Image.open(BytesIO(input_data))
        elif not isinstance(input_data, Image.Image):
            raise ValueError("Input must be PIL Image or bytes")
        
        # Validate image
        if input_data.size[0] * input_data.size[1] > 4096 * 4096:
            raise ValueError("Image too large")
        
        return input_data.convert("RGB")


class GarmentPreprocessor(Preprocessor):
    """Preprocesses images for garment detection"""
    
    def __init__(self):
        super().__init__({
            "target_size": (640, 640),
            "normalize": True
        })
    
    async def process(self, input_data: Image.Image, context) -> Image.Image:
        """Preprocess image"""
        # Resize while maintaining aspect ratio
        img = input_data.copy()
        
        # Store original dimensions in context
        context.add_metadata("original_size", img.size)
        
        return img


class GarmentModelInference(ModelInference):
    """Garment detection model inference"""
    
    def __init__(self, model_manager: ModelManager):
        super().__init__(model_manager, "yolo_garment_detector")


class GarmentPostprocessor(Postprocessor):
    """Postprocesses garment detection results"""
    
    def __init__(self):
        super().__init__({
            "confidence_threshold": 0.5,
            "extract_features": True
        })
    
    async def process(self, input_data: Dict[str, Any], context) -> Dict[str, Any]:
        """Postprocess detection results"""
        if not input_data.get("detections"):
            return {"garment_detected": False, "result": None}
        
        detection = input_data["detections"][0]  # Best detection
        
        # Extract features (simplified)
        features = {
            "color_rgb": [255, 0, 0],  # Red placeholder
            "color_name": "red",
            "pattern": "solid"
        }
        
        # Create result
        result = {
            "type": detection["garment_type"],
            "bbox": detection["bbox"],
            "features": features,
            "confidence": detection["bbox"]["confidence"],
            "dimensions": {
                "width_ratio": abs(detection["bbox"]["x2"] - detection["bbox"]["x1"]),
                "height_ratio": abs(detection["bbox"]["y2"] - detection["bbox"]["y1"])
            }
        }
        
        return {"garment_detected": True, "result": result}


class GarmentOutputFormatter(OutputFormatter):
    """Formats garment detection output"""
    
    def __init__(self):
        super().__init__(GarmentDetectionResult)
    
    async def process(self, input_data: Dict[str, Any], context) -> GarmentDetectionResult:
        """Format output to schema"""
        if not input_data["garment_detected"]:
            return None
        
        result_data = input_data["result"]
        
        return GarmentDetectionResult(
            type=GarmentType(result_data["type"]),
            bbox=BoundingBox(**result_data["bbox"]),
            features=GarmentFeatures(**result_data["features"]),
            confidence=result_data["confidence"],
            dimensions=result_data["dimensions"]
        )


async def setup_ml_pipeline_system():
    """
    Complete setup example for the ML pipeline system
    """
    logger.info("Setting up ML Pipeline System")
    
    # 1. Initialize Device Manager
    device_manager = await initialize_device_manager(
        prefer_gpu=True,
        memory_reserve_mb=512.0
    )
    
    # 2. Configure Model Manager with Caching
    cache_config = CacheConfig(
        max_models_in_memory=2,
        max_memory_usage_mb=2048,
        enable_lazy_loading=True,
        cache_eviction_strategy="lru"
    )
    
    model_manager = ModelManager(device_manager, cache_config)
    
    # 3. Register Models
    garment_config = ModelConfig(
        name="yolo_garment_detector",
        model_type=ModelType.OBJECT_DETECTION,
        model_format=ModelFormat.PYTORCH,
        model_path="./models/yolo_garment.pt",
        device="cuda:0",  # Will be overridden by device manager
        confidence_threshold=0.5,
        warmup_iterations=3
    )
    
    # Register with custom model class
    model_manager.register_model(
        "yolo_garment_detector",
        garment_config,
        lambda config: YOLOGarmentDetector(config)
    )
    
    # 4. Create Pipeline Components
    validator = GarmentInputValidator()
    preprocessor = GarmentPreprocessor()
    model_inference = GarmentModelInference(model_manager)
    postprocessor = GarmentPostprocessor()
    output_formatter = GarmentOutputFormatter()
    
    # 5. Create Complete Pipeline
    garment_pipeline = MLPipeline(
        name="garment_detection",
        validator=validator,
        preprocessor=preprocessor,
        model_inference=model_inference,
        postprocessor=postprocessor,
        output_formatter=output_formatter
    )
    
    # 6. Register Pipeline
    pipeline_registry.register_pipeline(garment_pipeline)
    
    # 7. Preload Models (optional)
    await model_manager.preload_models(["yolo_garment_detector"])
    
    logger.info("ML Pipeline System setup complete")
    
    return {
        "device_manager": device_manager,
        "model_manager": model_manager,
        "pipeline_registry": pipeline_registry
    }


async def example_usage():
    """
    Example of using the complete ML pipeline system
    """
    
    # Setup system
    system = await setup_ml_pipeline_system()
    model_manager = system["model_manager"]
    
    try:
        # Create sample image
        sample_image = Image.new('RGB', (640, 640), color='red')
        
        # Execute pipeline
        result = await pipeline_registry.execute_pipeline(
            pipeline_name="garment_detection",
            input_data=sample_image,
            request_id="example_001",
            device="cuda:0"
        )
        
        # Print results
        if result.success:
            logger.info(f"Pipeline executed successfully in {result.total_time:.3f}s")
            logger.info(f"Result: {result.data}")
            logger.info(f"Stage timings: {result.stage_timings}")
        else:
            logger.error(f"Pipeline failed: {result.error}")
        
        # Get system stats
        stats = model_manager.get_system_stats()
        logger.info(f"System stats: {stats}")
        
    except Exception as e:
        logger.error(f"Example execution failed: {e}")
    
    finally:
        # Cleanup
        await model_manager.shutdown()
        await system["device_manager"].shutdown()


# Usage example for integration with FastAPI
class MLPipelineService:
    """Service class for integrating with FastAPI"""
    
    def __init__(self):
        self.system = None
        self.initialized = False
    
    async def initialize(self):
        """Initialize the ML pipeline system"""
        if not self.initialized:
            self.system = await setup_ml_pipeline_system()
            self.initialized = True
    
    async def detect_garment(self, image_data: bytes, request_id: str) -> Dict[str, Any]:
        """Detect garment in image"""
        if not self.initialized:
            await self.initialize()
        
        # Convert bytes to PIL Image
        from io import BytesIO
        image = Image.open(BytesIO(image_data))
        
        # Execute pipeline
        result = await pipeline_registry.execute_pipeline(
            pipeline_name="garment_detection",
            input_data=image,
            request_id=request_id
        )
        
        return result.to_dict()
    
    async def get_system_status(self) -> Dict[str, Any]:
        """Get system status"""
        if not self.initialized:
            return {"status": "not_initialized"}
        
        model_manager = self.system["model_manager"]
        return {
            "status": "running",
            "pipelines": pipeline_registry.list_pipelines(),
            "system_stats": model_manager.get_system_stats()
        }
    
    async def shutdown(self):
        """Shutdown the service"""
        if self.initialized and self.system:
            await self.system["model_manager"].shutdown()
            await self.system["device_manager"].shutdown()
            self.initialized = False


# Global service instance
ml_service = MLPipelineService()


if __name__ == "__main__":
    # Run example
    asyncio.run(example_usage())