"""
Abstract Base Classes for ML Models

This module defines the abstract base classes and interfaces for all ML models
in the AR Fashion Try-On system. It provides a consistent interface for model
loading, inference, and resource management.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple, Union, TypeVar, Generic
from dataclasses import dataclass
from enum import Enum
import time
import logging
import asyncio
from pathlib import Path
import torch
import numpy as np

logger = logging.getLogger(__name__)

# Type variables for generic model interfaces
ModelInputType = TypeVar('ModelInputType')
ModelOutputType = TypeVar('ModelOutputType')


class ModelType(str, Enum):
    """Supported model types"""
    OBJECT_DETECTION = "object_detection"
    SEGMENTATION = "segmentation"
    POSE_ESTIMATION = "pose_estimation"
    CLASSIFICATION = "classification"
    GENERATION = "generation"
    CUSTOM = "custom"


class ModelFormat(str, Enum):
    """Supported model formats"""
    PYTORCH = "pytorch"
    ONNX = "onnx"
    TENSORRT = "tensorrt"
    TORCHSCRIPT = "torchscript"


class ModelStatus(str, Enum):
    """Model loading/execution status"""
    NOT_LOADED = "not_loaded"
    LOADING = "loading"
    LOADED = "loaded"
    FAILED = "failed"
    INFERENCE = "inference"


@dataclass
class ModelConfig:
    """Model configuration container"""
    name: str
    model_type: ModelType
    model_format: ModelFormat
    model_path: str
    device: str
    batch_size: int = 1
    input_shape: Optional[Tuple[int, ...]] = None
    output_shape: Optional[Tuple[int, ...]] = None
    preprocessing_config: Dict[str, Any] = None
    postprocessing_config: Dict[str, Any] = None
    confidence_threshold: float = 0.5
    nms_threshold: float = 0.4
    max_detections: int = 100
    warmup_iterations: int = 3
    
    def __post_init__(self):
        if self.preprocessing_config is None:
            self.preprocessing_config = {}
        if self.postprocessing_config is None:
            self.postprocessing_config = {}


@dataclass
class ModelMetrics:
    """Model performance metrics"""
    total_inferences: int = 0
    total_inference_time: float = 0.0
    last_inference_time: float = 0.0
    avg_inference_time: float = 0.0
    min_inference_time: float = float('inf')
    max_inference_time: float = 0.0
    memory_usage_mb: float = 0.0
    gpu_memory_usage_mb: float = 0.0
    error_count: int = 0
    last_error: Optional[str] = None
    
    def update_inference_time(self, inference_time: float):
        """Update inference timing metrics"""
        self.total_inferences += 1
        self.total_inference_time += inference_time
        self.last_inference_time = inference_time
        self.avg_inference_time = self.total_inference_time / self.total_inferences
        self.min_inference_time = min(self.min_inference_time, inference_time)
        self.max_inference_time = max(self.max_inference_time, inference_time)
    
    def record_error(self, error_message: str):
        """Record an error"""
        self.error_count += 1
        self.last_error = error_message
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert metrics to dictionary"""
        return {
            "total_inferences": self.total_inferences,
            "avg_inference_time": self.avg_inference_time,
            "min_inference_time": self.min_inference_time if self.min_inference_time != float('inf') else 0.0,
            "max_inference_time": self.max_inference_time,
            "memory_usage_mb": self.memory_usage_mb,
            "gpu_memory_usage_mb": self.gpu_memory_usage_mb,
            "error_count": self.error_count,
            "error_rate": self.error_count / max(self.total_inferences, 1)
        }


class BaseModel(ABC, Generic[ModelInputType, ModelOutputType]):
    """Abstract base class for all ML models"""
    
    def __init__(self, config: ModelConfig):
        self.config = config
        self.status = ModelStatus.NOT_LOADED
        self.model = None
        self.device = torch.device(config.device)
        self.metrics = ModelMetrics()
        self.logger = logging.getLogger(f"{__name__}.{config.name}")
        self._lock = asyncio.Lock()
    
    @abstractmethod
    async def load_model(self) -> None:
        """Load the model from disk"""
        pass
    
    @abstractmethod
    async def preprocess(self, input_data: Any) -> ModelInputType:
        """Preprocess input data for the model"""
        pass
    
    @abstractmethod
    async def forward(self, model_input: ModelInputType) -> Any:
        """Run forward pass through the model"""
        pass
    
    @abstractmethod
    async def postprocess(self, model_output: Any) -> ModelOutputType:
        """Postprocess model output"""
        pass
    
    async def predict(self, input_data: Any) -> ModelOutputType:
        """Complete prediction pipeline"""
        async with self._lock:
            if self.status != ModelStatus.LOADED:
                raise RuntimeError(f"Model {self.config.name} is not loaded (status: {self.status})")
            
            start_time = time.time()
            self.status = ModelStatus.INFERENCE
            
            try:
                # Preprocessing
                model_input = await self.preprocess(input_data)
                
                # Model inference
                model_output = await self.forward(model_input)
                
                # Postprocessing
                result = await self.postprocess(model_output)
                
                # Update metrics
                inference_time = time.time() - start_time
                self.metrics.update_inference_time(inference_time)
                self.status = ModelStatus.LOADED
                
                self.logger.debug(f"Inference completed in {inference_time:.3f}s")
                return result
                
            except Exception as e:
                self.metrics.record_error(str(e))
                self.status = ModelStatus.LOADED
                self.logger.error(f"Inference failed: {e}")
                raise
    
    async def initialize(self) -> None:
        """Initialize the model"""
        try:
            self.status = ModelStatus.LOADING
            self.logger.info(f"Loading model {self.config.name}")
            
            await self.load_model()
            await self._warmup()
            
            self.status = ModelStatus.LOADED
            self.logger.info(f"Model {self.config.name} loaded successfully")
            
        except Exception as e:
            self.status = ModelStatus.FAILED
            self.logger.error(f"Failed to load model {self.config.name}: {e}")
            raise
    
    async def _warmup(self) -> None:
        """Warm up the model with dummy inputs"""
        if self.config.warmup_iterations > 0 and self.config.input_shape:
            self.logger.info(f"Warming up model with {self.config.warmup_iterations} iterations")
            
            for i in range(self.config.warmup_iterations):
                try:
                    dummy_input = self._create_dummy_input()
                    await self.forward(dummy_input)
                except Exception as e:
                    self.logger.warning(f"Warmup iteration {i+1} failed: {e}")
    
    def _create_dummy_input(self) -> ModelInputType:
        """Create dummy input for warmup"""
        if self.config.input_shape:
            return torch.randn(1, *self.config.input_shape).to(self.device)
        return None
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return {
            "name": self.config.name,
            "type": self.config.model_type.value,
            "format": self.config.model_format.value,
            "device": str(self.device),
            "status": self.status.value,
            "batch_size": self.config.batch_size,
            "input_shape": self.config.input_shape,
            "output_shape": self.config.output_shape,
            "metrics": self.metrics.to_dict()
        }
    
    def is_loaded(self) -> bool:
        """Check if model is loaded and ready"""
        return self.status == ModelStatus.LOADED


class PyTorchModel(BaseModel):
    """Base class for PyTorch models"""
    
    async def load_model(self) -> None:
        """Load PyTorch model"""
        model_path = Path(self.config.model_path)
        
        if not model_path.exists():
            raise FileNotFoundError(f"Model file not found: {model_path}")
        
        # Load model based on format
        if self.config.model_format == ModelFormat.PYTORCH:
            self.model = torch.load(model_path, map_location=self.device)
        elif self.config.model_format == ModelFormat.TORCHSCRIPT:
            self.model = torch.jit.load(model_path, map_location=self.device)
        else:
            raise ValueError(f"Unsupported model format: {self.config.model_format}")
        
        # Set to evaluation mode
        self.model.eval()
        
        # Move to device
        self.model = self.model.to(self.device)
    
    async def forward(self, model_input: ModelInputType) -> torch.Tensor:
        """PyTorch forward pass"""
        with torch.no_grad():
            return self.model(model_input)


class DetectionModel(PyTorchModel):
    """Base class for object detection models"""
    
    def __init__(self, config: ModelConfig):
        super().__init__(config)
        self.confidence_threshold = config.confidence_threshold
        self.nms_threshold = config.nms_threshold
        self.max_detections = config.max_detections
    
    async def postprocess(self, model_output: torch.Tensor) -> List[Dict[str, Any]]:
        """Postprocess detection results"""
        detections = []
        
        # Apply confidence filtering
        scores = model_output[:, 4]  # Assuming YOLO-style output
        mask = scores > self.confidence_threshold
        filtered_output = model_output[mask]
        
        # Apply NMS if needed
        if len(filtered_output) > 0:
            filtered_output = self._apply_nms(filtered_output)
        
        # Convert to detection format
        for detection in filtered_output[:self.max_detections]:
            detections.append({
                "bbox": detection[:4].tolist(),
                "confidence": float(detection[4]),
                "class_id": int(detection[5]) if len(detection) > 5 else 0
            })
        
        return detections
    
    def _apply_nms(self, detections: torch.Tensor) -> torch.Tensor:
        """Apply Non-Maximum Suppression"""
        if len(detections) == 0:
            return detections
        
        # Simple NMS implementation
        boxes = detections[:, :4]
        scores = detections[:, 4]
        
        indices = torch.ops.torchvision.nms(boxes, scores, self.nms_threshold)
        return detections[indices]


class SegmentationModel(PyTorchModel):
    """Base class for segmentation models"""
    
    async def postprocess(self, model_output: torch.Tensor) -> Dict[str, Any]:
        """Postprocess segmentation results"""
        # Apply softmax to get probabilities
        probs = torch.softmax(model_output, dim=1)
        
        # Get predicted classes
        pred_classes = torch.argmax(probs, dim=1)
        
        return {
            "segmentation_mask": pred_classes.cpu().numpy(),
            "probabilities": probs.cpu().numpy(),
            "shape": list(pred_classes.shape)
        }


class PoseEstimationModel(PyTorchModel):
    """Base class for pose estimation models"""
    
    async def postprocess(self, model_output: torch.Tensor) -> Dict[str, Any]:
        """Postprocess pose estimation results"""
        # Extract keypoints (assuming output is [batch, keypoints, 3] for x,y,confidence)
        keypoints = model_output.cpu().numpy()
        
        # Filter by confidence
        valid_keypoints = []
        for i, keypoint in enumerate(keypoints[0]):  # Assuming batch size 1
            if len(keypoint) >= 3 and keypoint[2] > self.confidence_threshold:
                valid_keypoints.append({
                    "id": i,
                    "x": float(keypoint[0]),
                    "y": float(keypoint[1]),
                    "confidence": float(keypoint[2])
                })
        
        return {
            "keypoints": valid_keypoints,
            "pose_confidence": float(np.mean([kp["confidence"] for kp in valid_keypoints]))
        }


class ModelFactory:
    """Factory for creating model instances"""
    
    _model_classes = {
        ModelType.OBJECT_DETECTION: DetectionModel,
        ModelType.SEGMENTATION: SegmentationModel,
        ModelType.POSE_ESTIMATION: PoseEstimationModel,
        ModelType.CLASSIFICATION: PyTorchModel,
        ModelType.GENERATION: PyTorchModel,
        ModelType.CUSTOM: PyTorchModel
    }
    
    @classmethod
    def create_model(cls, config: ModelConfig) -> BaseModel:
        """Create a model instance based on configuration"""
        model_class = cls._model_classes.get(config.model_type, PyTorchModel)
        return model_class(config)
    
    @classmethod
    def register_model_class(cls, model_type: ModelType, model_class: type):
        """Register a custom model class"""
        cls._model_classes[model_type] = model_class


# Model interface for external libraries
class ExternalModelWrapper(BaseModel):
    """Wrapper for external model libraries (e.g., Ultralytics, MediaPipe)"""
    
    def __init__(self, config: ModelConfig, model_loader_func):
        super().__init__(config)
        self.model_loader_func = model_loader_func
    
    async def load_model(self) -> None:
        """Load external model using provided loader function"""
        self.model = await self.model_loader_func(self.config)
    
    async def preprocess(self, input_data: Any) -> Any:
        """Default preprocessing - override in subclasses"""
        return input_data
    
    async def forward(self, model_input: Any) -> Any:
        """Forward pass through external model"""
        return self.model(model_input)
    
    async def postprocess(self, model_output: Any) -> Any:
        """Default postprocessing - override in subclasses"""
        return model_output