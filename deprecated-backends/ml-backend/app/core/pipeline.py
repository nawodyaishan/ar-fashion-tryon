"""
ML Pipeline Architecture

This module defines the core pipeline architecture for processing ML requests.
The pipeline follows a standardized flow: Input → Preprocess → Model → Postprocess → Output
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, TypeVar, Generic, Union
from dataclasses import dataclass
from enum import Enum
import time
import logging
from contextlib import contextmanager

logger = logging.getLogger(__name__)

# Type variables for generic pipeline components
InputType = TypeVar('InputType')
OutputType = TypeVar('OutputType')
ModelInputType = TypeVar('ModelInputType')
ModelOutputType = TypeVar('ModelOutputType')


class PipelineStage(str, Enum):
    """Pipeline execution stages"""
    INPUT_VALIDATION = "input_validation"
    PREPROCESSING = "preprocessing"
    MODEL_INFERENCE = "model_inference"
    POSTPROCESSING = "postprocessing"
    OUTPUT_FORMATTING = "output_formatting"


@dataclass
class PipelineContext:
    """Pipeline execution context containing metadata and state"""
    request_id: str
    stage: PipelineStage
    start_time: float
    device: str
    model_version: str
    processing_options: Dict[str, Any]
    metadata: Dict[str, Any]
    
    def elapsed_time(self) -> float:
        """Get elapsed time since pipeline start"""
        return time.time() - self.start_time
    
    def add_metadata(self, key: str, value: Any) -> None:
        """Add metadata to context"""
        self.metadata[key] = value
    
    def set_stage(self, stage: PipelineStage) -> None:
        """Update current pipeline stage"""
        self.stage = stage
        logger.debug(f"Pipeline {self.request_id} entered stage: {stage}")


@dataclass
class PipelineResult(Generic[OutputType]):
    """Standardized pipeline result container"""
    success: bool
    data: Optional[OutputType]
    error: Optional[str]
    context: PipelineContext
    stage_timings: Dict[PipelineStage, float]
    
    @property
    def total_time(self) -> float:
        """Total pipeline execution time"""
        return sum(self.stage_timings.values())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary"""
        return {
            "success": self.success,
            "data": self.data,
            "error": self.error,
            "total_time": self.total_time,
            "stage_timings": self.stage_timings,
            "metadata": self.context.metadata
        }


class PipelineComponent(ABC, Generic[InputType, OutputType]):
    """Abstract base class for pipeline components"""
    
    def __init__(self, name: str):
        self.name = name
        self.logger = logging.getLogger(f"{__name__}.{name}")
    
    @abstractmethod
    async def process(self, input_data: InputType, context: PipelineContext) -> OutputType:
        """Process input data and return output"""
        pass
    
    async def __call__(self, input_data: InputType, context: PipelineContext) -> OutputType:
        """Make component callable"""
        stage_start = time.time()
        try:
            result = await self.process(input_data, context)
            stage_time = time.time() - stage_start
            context.metadata[f"{self.name}_time"] = stage_time
            self.logger.debug(f"{self.name} completed in {stage_time:.3f}s")
            return result
        except Exception as e:
            stage_time = time.time() - stage_start
            context.metadata[f"{self.name}_time"] = stage_time
            context.metadata[f"{self.name}_error"] = str(e)
            self.logger.error(f"{self.name} failed after {stage_time:.3f}s: {e}")
            raise


class InputValidator(PipelineComponent[Any, Any]):
    """Validates and normalizes input data"""
    
    def __init__(self, validation_rules: Dict[str, Any]):
        super().__init__("InputValidator")
        self.validation_rules = validation_rules
    
    async def process(self, input_data: Any, context: PipelineContext) -> Any:
        context.set_stage(PipelineStage.INPUT_VALIDATION)
        
        # Implement validation logic based on rules
        if not self._validate_input(input_data):
            raise ValueError("Input validation failed")
        
        return self._normalize_input(input_data)
    
    def _validate_input(self, input_data: Any) -> bool:
        """Validate input against rules"""
        # Implement specific validation logic
        return True
    
    def _normalize_input(self, input_data: Any) -> Any:
        """Normalize input data"""
        return input_data


class Preprocessor(PipelineComponent[Any, ModelInputType]):
    """Preprocesses data for model consumption"""
    
    def __init__(self, preprocessing_config: Dict[str, Any]):
        super().__init__("Preprocessor")
        self.config = preprocessing_config
    
    async def process(self, input_data: Any, context: PipelineContext) -> ModelInputType:
        context.set_stage(PipelineStage.PREPROCESSING)
        
        # Apply preprocessing transformations
        processed_data = await self._apply_transformations(input_data, context)
        
        return processed_data
    
    async def _apply_transformations(self, data: Any, context: PipelineContext) -> ModelInputType:
        """Apply preprocessing transformations"""
        # Override in specific implementations
        return data


class ModelInference(PipelineComponent[ModelInputType, ModelOutputType]):
    """Handles model inference"""
    
    def __init__(self, model_manager, model_name: str):
        super().__init__(f"ModelInference_{model_name}")
        self.model_manager = model_manager
        self.model_name = model_name
    
    async def process(self, input_data: ModelInputType, context: PipelineContext) -> ModelOutputType:
        context.set_stage(PipelineStage.MODEL_INFERENCE)
        
        # Get model from manager
        model = await self.model_manager.get_model(self.model_name)
        
        # Run inference
        with self._inference_context(context):
            output = await self._run_inference(model, input_data, context)
        
        return output
    
    @contextmanager
    def _inference_context(self, context: PipelineContext):
        """Context manager for inference timing and resource management"""
        inference_start = time.time()
        try:
            yield
        finally:
            inference_time = time.time() - inference_start
            context.add_metadata(f"{self.model_name}_inference_time", inference_time)
    
    async def _run_inference(self, model: Any, input_data: ModelInputType, context: PipelineContext) -> ModelOutputType:
        """Run model inference"""
        # Override in specific implementations
        return model(input_data)


class Postprocessor(PipelineComponent[ModelOutputType, Any]):
    """Postprocesses model output"""
    
    def __init__(self, postprocessing_config: Dict[str, Any]):
        super().__init__("Postprocessor")
        self.config = postprocessing_config
    
    async def process(self, input_data: ModelOutputType, context: PipelineContext) -> Any:
        context.set_stage(PipelineStage.POSTPROCESSING)
        
        # Apply postprocessing transformations
        processed_data = await self._apply_postprocessing(input_data, context)
        
        return processed_data
    
    async def _apply_postprocessing(self, data: ModelOutputType, context: PipelineContext) -> Any:
        """Apply postprocessing transformations"""
        # Override in specific implementations
        return data


class OutputFormatter(PipelineComponent[Any, OutputType]):
    """Formats final output"""
    
    def __init__(self, output_schema: type):
        super().__init__("OutputFormatter")
        self.output_schema = output_schema
    
    async def process(self, input_data: Any, context: PipelineContext) -> OutputType:
        context.set_stage(PipelineStage.OUTPUT_FORMATTING)
        
        # Format output according to schema
        formatted_output = await self._format_output(input_data, context)
        
        return formatted_output
    
    async def _format_output(self, data: Any, context: PipelineContext) -> OutputType:
        """Format output data"""
        if self.output_schema:
            return self.output_schema(**data) if isinstance(data, dict) else self.output_schema(data)
        return data


class MLPipeline(Generic[InputType, OutputType]):
    """Main ML Pipeline orchestrator"""
    
    def __init__(self, 
                 name: str,
                 validator: InputValidator,
                 preprocessor: Preprocessor,
                 model_inference: ModelInference,
                 postprocessor: Postprocessor,
                 output_formatter: OutputFormatter):
        self.name = name
        self.validator = validator
        self.preprocessor = preprocessor
        self.model_inference = model_inference
        self.postprocessor = postprocessor
        self.output_formatter = output_formatter
        self.logger = logging.getLogger(f"{__name__}.{name}")
        
        # Pipeline components in order
        self.components = [
            self.validator,
            self.preprocessor,
            self.model_inference,
            self.postprocessor,
            self.output_formatter
        ]
    
    async def execute(self, 
                     input_data: InputType, 
                     request_id: str,
                     device: str = "cpu",
                     model_version: str = "1.0",
                     processing_options: Optional[Dict[str, Any]] = None) -> PipelineResult[OutputType]:
        """Execute the complete pipeline"""
        
        # Initialize context
        context = PipelineContext(
            request_id=request_id,
            stage=PipelineStage.INPUT_VALIDATION,
            start_time=time.time(),
            device=device,
            model_version=model_version,
            processing_options=processing_options or {},
            metadata={}
        )
        
        stage_timings = {}
        
        try:
            self.logger.info(f"Starting pipeline {self.name} for request {request_id}")
            
            # Execute pipeline stages
            current_data = input_data
            
            for component in self.components:
                stage_start = time.time()
                current_data = await component(current_data, context)
                stage_timings[context.stage] = time.time() - stage_start
            
            total_time = time.time() - context.start_time
            self.logger.info(f"Pipeline {self.name} completed successfully in {total_time:.3f}s")
            
            return PipelineResult(
                success=True,
                data=current_data,
                error=None,
                context=context,
                stage_timings=stage_timings
            )
            
        except Exception as e:
            total_time = time.time() - context.start_time
            self.logger.error(f"Pipeline {self.name} failed after {total_time:.3f}s: {e}")
            
            return PipelineResult(
                success=False,
                data=None,
                error=str(e),
                context=context,
                stage_timings=stage_timings
            )
    
    def get_pipeline_info(self) -> Dict[str, Any]:
        """Get pipeline information"""
        return {
            "name": self.name,
            "components": [comp.name for comp in self.components],
            "stages": [stage.value for stage in PipelineStage]
        }


class PipelineRegistry:
    """Registry for managing multiple pipelines"""
    
    def __init__(self):
        self.pipelines: Dict[str, MLPipeline] = {}
        self.logger = logging.getLogger(f"{__name__}.PipelineRegistry")
    
    def register_pipeline(self, pipeline: MLPipeline) -> None:
        """Register a pipeline"""
        self.pipelines[pipeline.name] = pipeline
        self.logger.info(f"Registered pipeline: {pipeline.name}")
    
    def get_pipeline(self, name: str) -> MLPipeline:
        """Get a registered pipeline"""
        if name not in self.pipelines:
            raise ValueError(f"Pipeline '{name}' not found")
        return self.pipelines[name]
    
    def list_pipelines(self) -> List[str]:
        """List all registered pipelines"""
        return list(self.pipelines.keys())
    
    async def execute_pipeline(self, 
                              pipeline_name: str, 
                              input_data: Any,
                              request_id: str,
                              **kwargs) -> PipelineResult:
        """Execute a pipeline by name"""
        pipeline = self.get_pipeline(pipeline_name)
        return await pipeline.execute(input_data, request_id, **kwargs)


# Global pipeline registry instance
pipeline_registry = PipelineRegistry()