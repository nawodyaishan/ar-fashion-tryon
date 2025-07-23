"""
Tests for ML Pipeline Architecture

Basic test coverage for the core pipeline components.
"""

import pytest
import asyncio
import numpy as np
from unittest.mock import Mock, AsyncMock, patch
from typing import Dict, Any

from app.core.pipeline import (
    MLPipeline, PipelineContext, PipelineResult, PipelineStage,
    InputValidator, Preprocessor, ModelInference, Postprocessor, OutputFormatter
)
from app.core.image_processor import ImageProcessor, ImageValidator, ImageValidationConfig
from app.models.schemas import ProcessingOptions, GarmentDetectionResult, PoseDetectionResult


class MockValidator(InputValidator):
    """Mock validator for testing"""
    
    def __init__(self, should_pass: bool = True):
        super().__init__({})
        self.should_pass = should_pass
    
    async def process(self, input_data: Any, context: PipelineContext) -> Any:
        if not self.should_pass:
            raise ValueError("Validation failed")
        return input_data


class MockPreprocessor(Preprocessor):
    """Mock preprocessor for testing"""
    
    def __init__(self):
        super().__init__({})
    
    async def process(self, input_data: Any, context: PipelineContext) -> Dict[str, Any]:
        return {"processed_data": input_data, "metadata": "test"}


class MockModelInference(ModelInference):
    """Mock model inference for testing"""
    
    def __init__(self, model_manager: Mock):
        super().__init__(model_manager, "test_model")
    
    async def process(self, input_data: Dict[str, Any], context: PipelineContext) -> Dict[str, Any]:
        return {**input_data, "model_output": "test_result"}


class MockPostprocessor(Postprocessor):
    """Mock postprocessor for testing"""
    
    def __init__(self):
        super().__init__({})
    
    async def process(self, input_data: Dict[str, Any], context: PipelineContext) -> Dict[str, Any]:
        return {"final_result": input_data["model_output"]}


class MockOutputFormatter(OutputFormatter):
    """Mock output formatter for testing"""
    
    def __init__(self):
        super().__init__(dict)
    
    async def process(self, input_data: Dict[str, Any], context: PipelineContext) -> Dict[str, Any]:
        return input_data


@pytest.fixture
def mock_model_manager():
    """Create mock model manager"""
    manager = Mock()
    manager.get_model = AsyncMock()
    return manager


@pytest.fixture
def test_pipeline(mock_model_manager):
    """Create test pipeline"""
    return MLPipeline(
        name="test_pipeline",
        validator=MockValidator(),
        preprocessor=MockPreprocessor(),
        model_inference=MockModelInference(mock_model_manager),
        postprocessor=MockPostprocessor(),
        output_formatter=MockOutputFormatter()
    )


@pytest.mark.asyncio
async def test_pipeline_success(test_pipeline):
    """Test successful pipeline execution"""
    result = await test_pipeline.execute(
        input_data="test_input",
        request_id="test_123",
        device="cpu",
        model_version="1.0"
    )
    
    assert result.success is True
    assert result.data is not None
    assert result.error is None
    assert result.context.request_id == "test_123"
    assert "final_result" in result.data


@pytest.mark.asyncio
async def test_pipeline_validation_failure():
    """Test pipeline failure during validation"""
    pipeline = MLPipeline(
        name="test_pipeline_fail",
        validator=MockValidator(should_pass=False),
        preprocessor=MockPreprocessor(),
        model_inference=MockModelInference(Mock()),
        postprocessor=MockPostprocessor(),
        output_formatter=MockOutputFormatter()
    )
    
    result = await pipeline.execute(
        input_data="test_input",
        request_id="test_456"
    )
    
    assert result.success is False
    assert result.data is None
    assert "Validation failed" in result.error


@pytest.mark.asyncio
async def test_image_processor():
    """Test image processor functionality"""
    # Create test image
    test_image = np.zeros((480, 640, 3), dtype=np.uint8)
    
    processor = ImageProcessor()
    result = await processor.process_image(test_image)
    
    assert result.image is not None
    assert result.original_size == (640, 480)
    assert result.processed_size == (640, 640)  # Default target size
    assert result.scale_factor > 0
    assert result.metadata is not None


@pytest.mark.asyncio
async def test_image_validator():
    """Test image validation"""
    # Create mock image data (simple PNG header)
    mock_image_data = b'\x89PNG\r\n\x1a\n' + b'\x00' * 100
    
    validator = ImageValidator(ImageValidationConfig())
    
    with patch('PIL.Image.open') as mock_open:
        mock_image = Mock()
        mock_image.format = 'PNG'
        mock_image.size = (640, 480)
        mock_image.getbands.return_value = ['R', 'G', 'B']
        mock_image.mode = 'RGB'
        mock_open.return_value = mock_image
        
        result = await validator.validate_upload(mock_image_data, "test.png")
        
        assert result["valid"] is True
        assert result["metadata"] is not None


class TestPipelineComponents:
    """Test individual pipeline components"""
    
    @pytest.mark.asyncio
    async def test_input_validator(self):
        """Test input validator component"""
        validator = InputValidator({"test": True})
        context = PipelineContext(
            request_id="test",
            stage=PipelineStage.INPUT_VALIDATION,
            start_time=0.0,
            device="cpu",
            model_version="1.0",
            processing_options={},
            metadata={}
        )
        
        # Should pass validation
        result = await validator.process("test_data", context)
        assert result == "test_data"
    
    @pytest.mark.asyncio
    async def test_preprocessor(self):
        """Test preprocessor component"""
        preprocessor = Preprocessor({"resize": True})
        context = PipelineContext(
            request_id="test",
            stage=PipelineStage.PREPROCESSING,
            start_time=0.0,
            device="cpu",
            model_version="1.0",
            processing_options={},
            metadata={}
        )
        
        result = await preprocessor.process("test_data", context)
        # Base preprocessor returns input unchanged
        assert result == "test_data"
    
    @pytest.mark.asyncio
    async def test_postprocessor(self):
        """Test postprocessor component"""
        postprocessor = Postprocessor({"format": "json"})
        context = PipelineContext(
            request_id="test",
            stage=PipelineStage.POSTPROCESSING,
            start_time=0.0,
            device="cpu",
            model_version="1.0",
            processing_options={},
            metadata={}
        )
        
        result = await postprocessor.process("test_data", context)
        # Base postprocessor returns input unchanged
        assert result == "test_data"


class TestPipelineContext:
    """Test pipeline context functionality"""
    
    def test_context_creation(self):
        """Test context creation and basic functionality"""
        context = PipelineContext(
            request_id="test_123",
            stage=PipelineStage.INPUT_VALIDATION,
            start_time=1000.0,
            device="cuda",
            model_version="2.0",
            processing_options={"option1": "value1"},
            metadata={}
        )
        
        assert context.request_id == "test_123"
        assert context.stage == PipelineStage.INPUT_VALIDATION
        assert context.device == "cuda"
        assert context.model_version == "2.0"
    
    def test_context_metadata(self):
        """Test context metadata operations"""
        context = PipelineContext(
            request_id="test",
            stage=PipelineStage.INPUT_VALIDATION,
            start_time=0.0,
            device="cpu",
            model_version="1.0",
            processing_options={},
            metadata={}
        )
        
        # Add metadata
        context.add_metadata("test_key", "test_value")
        assert context.metadata["test_key"] == "test_value"
        
        # Set stage
        context.set_stage(PipelineStage.PREPROCESSING)
        assert context.stage == PipelineStage.PREPROCESSING


class TestPipelineResult:
    """Test pipeline result functionality"""
    
    def test_result_creation(self):
        """Test result creation"""
        context = PipelineContext(
            request_id="test",
            stage=PipelineStage.OUTPUT_FORMATTING,
            start_time=0.0,
            device="cpu",
            model_version="1.0",
            processing_options={},
            metadata={}
        )
        
        result = PipelineResult(
            success=True,
            data={"result": "test"},
            error=None,
            context=context,
            stage_timings={PipelineStage.INPUT_VALIDATION: 0.1}
        )
        
        assert result.success is True
        assert result.data["result"] == "test"
        assert result.error is None
        assert result.total_time == 0.1
    
    def test_result_to_dict(self):
        """Test result serialization"""
        context = PipelineContext(
            request_id="test",
            stage=PipelineStage.OUTPUT_FORMATTING,
            start_time=0.0,
            device="cpu",
            model_version="1.0",
            processing_options={},
            metadata={"test": "value"}
        )
        
        result = PipelineResult(
            success=True,
            data={"result": "test"},
            error=None,
            context=context,
            stage_timings={PipelineStage.INPUT_VALIDATION: 0.1}
        )
        
        result_dict = result.to_dict()
        assert result_dict["success"] is True
        assert result_dict["data"]["result"] == "test"
        assert result_dict["total_time"] == 0.1
        assert result_dict["metadata"]["test"] == "value"


@pytest.mark.integration
class TestPipelineIntegration:
    """Integration tests for pipeline system"""
    
    @pytest.mark.asyncio
    async def test_end_to_end_pipeline(self, mock_model_manager):
        """Test complete pipeline execution"""
        # Setup mock model
        mock_model = Mock()
        mock_model.predict = AsyncMock(return_value="model_result")
        mock_model_manager.get_model.return_value = mock_model
        
        # Create pipeline
        pipeline = MLPipeline(
            name="integration_test",
            validator=MockValidator(should_pass=True),
            preprocessor=MockPreprocessor(),
            model_inference=MockModelInference(mock_model_manager),
            postprocessor=MockPostprocessor(),
            output_formatter=MockOutputFormatter()
        )
        
        # Execute pipeline
        result = await pipeline.execute(
            input_data="integration_test_data",
            request_id="integration_123",
            device="cpu"
        )
        
        # Verify results
        assert result.success is True
        assert result.data is not None
        assert result.context.request_id == "integration_123"
        assert len(result.stage_timings) > 0


if __name__ == "__main__":
    pytest.main([__file__])