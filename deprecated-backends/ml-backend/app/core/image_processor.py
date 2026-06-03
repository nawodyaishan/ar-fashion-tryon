"""
Image Processing Module

Provides comprehensive image processing utilities for the AR Fashion Try-On system,
including upload handling, validation, format conversion, and preprocessing.
"""

import cv2
import numpy as np
import base64
import asyncio
import logging
from io import BytesIO
from PIL import Image, ImageOps
from typing import Optional, Tuple, Dict, Any, List, Union
from pathlib import Path
import tempfile
import aiofiles
import hashlib
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class ImageFormat(str, Enum):
    """Supported image formats"""
    JPEG = "jpeg"
    PNG = "png"
    WEBP = "webp"
    BMP = "bmp"
    TIFF = "tiff"


class ProcessingMode(str, Enum):
    """Image processing modes"""
    RESIZE_ONLY = "resize_only"
    CROP_AND_RESIZE = "crop_and_resize"
    PAD_AND_RESIZE = "pad_and_resize"
    LETTERBOX = "letterbox"


@dataclass
class ImageValidationConfig:
    """Configuration for image validation"""
    max_file_size_mb: float = 10.0
    min_width: int = 32
    min_height: int = 32
    max_width: int = 4096
    max_height: int = 4096
    allowed_formats: List[ImageFormat] = None
    
    def __post_init__(self):
        if self.allowed_formats is None:
            self.allowed_formats = [ImageFormat.JPEG, ImageFormat.PNG, ImageFormat.WEBP]


@dataclass
class ImageProcessingConfig:
    """Configuration for image processing"""
    target_size: Tuple[int, int] = (640, 640)
    processing_mode: ProcessingMode = ProcessingMode.LETTERBOX
    maintain_aspect_ratio: bool = True
    normalize: bool = True
    mean: Tuple[float, float, float] = (0.485, 0.456, 0.406)
    std: Tuple[float, float, float] = (0.229, 0.224, 0.225)
    to_rgb: bool = True
    pad_color: Tuple[int, int, int] = (114, 114, 114)


@dataclass
class ImageMetadata:
    """Image metadata container"""
    width: int
    height: int
    channels: int
    format: str
    file_size: int
    color_space: str
    has_alpha: bool
    hash: str


@dataclass 
class ProcessedImage:
    """Container for processed image data"""
    image: np.ndarray
    original_size: Tuple[int, int]
    processed_size: Tuple[int, int]
    scale_factor: float
    padding: Tuple[int, int, int, int]  # top, bottom, left, right
    metadata: ImageMetadata


class ImageValidator:
    """Validates uploaded images"""
    
    def __init__(self, config: ImageValidationConfig):
        self.config = config
        self.logger = logging.getLogger(f"{__name__}.ImageValidator")
    
    async def validate_upload(self, file_data: bytes, filename: str = None) -> Dict[str, Any]:
        """Validate uploaded image file"""
        try:
            # Check file size
            file_size_mb = len(file_data) / (1024 * 1024)
            if file_size_mb > self.config.max_file_size_mb:
                return {
                    "valid": False,
                    "error": f"File too large: {file_size_mb:.2f}MB > {self.config.max_file_size_mb}MB"
                }
            
            # Try to load image
            try:
                # Convert bytes to PIL Image
                image = Image.open(BytesIO(file_data))
                
                # Check format
                if image.format.lower() not in [fmt.value for fmt in self.config.allowed_formats]:
                    return {
                        "valid": False,
                        "error": f"Unsupported format: {image.format}"
                    }
                
                # Check dimensions
                width, height = image.size
                if width < self.config.min_width or height < self.config.min_height:
                    return {
                        "valid": False,
                        "error": f"Image too small: {width}x{height} < {self.config.min_width}x{self.config.min_height}"
                    }
                
                if width > self.config.max_width or height > self.config.max_height:
                    return {
                        "valid": False,
                        "error": f"Image too large: {width}x{height} > {self.config.max_width}x{self.config.max_height}"
                    }
                
                # Generate metadata
                metadata = ImageMetadata(
                    width=width,
                    height=height,
                    channels=len(image.getbands()),
                    format=image.format.lower(),
                    file_size=len(file_data),
                    color_space=image.mode,
                    has_alpha='A' in image.mode,
                    hash=hashlib.md5(file_data).hexdigest()
                )
                
                return {
                    "valid": True,
                    "metadata": metadata,
                    "image": image
                }
                
            except Exception as e:
                return {
                    "valid": False,
                    "error": f"Invalid image file: {e}"
                }
                
        except Exception as e:
            self.logger.error(f"Validation error: {e}")
            return {
                "valid": False,
                "error": f"Validation failed: {e}"
            }


class ImageProcessor:
    """Main image processing class"""
    
    def __init__(self, processing_config: ImageProcessingConfig = None):
        self.config = processing_config or ImageProcessingConfig()
        self.logger = logging.getLogger(f"{__name__}.ImageProcessor")
    
    async def process_image(self, 
                           image_data: Union[bytes, np.ndarray, Image.Image],
                           config: ImageProcessingConfig = None) -> ProcessedImage:
        """Process image according to configuration"""
        
        config = config or self.config
        
        # Convert input to numpy array
        if isinstance(image_data, bytes):
            image = self._bytes_to_numpy(image_data)
        elif isinstance(image_data, Image.Image):
            image = self._pil_to_numpy(image_data)
        elif isinstance(image_data, np.ndarray):
            image = image_data.copy()
        else:
            raise ValueError(f"Unsupported image type: {type(image_data)}")
        
        original_size = (image.shape[1], image.shape[0])  # (width, height)
        
        # Convert color space if needed
        if config.to_rgb and image.shape[2] == 3:
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Apply processing mode
        if config.processing_mode == ProcessingMode.RESIZE_ONLY:
            processed_image, scale_factor, padding = self._resize_only(image, config.target_size)
        elif config.processing_mode == ProcessingMode.CROP_AND_RESIZE:
            processed_image, scale_factor, padding = self._crop_and_resize(image, config.target_size)
        elif config.processing_mode == ProcessingMode.PAD_AND_RESIZE:
            processed_image, scale_factor, padding = self._pad_and_resize(image, config.target_size, config.pad_color)
        elif config.processing_mode == ProcessingMode.LETTERBOX:
            processed_image, scale_factor, padding = self._letterbox(image, config.target_size, config.pad_color)
        else:
            raise ValueError(f"Unknown processing mode: {config.processing_mode}")
        
        # Normalize if requested
        if config.normalize:
            processed_image = self._normalize(processed_image, config.mean, config.std)
        
        # Create metadata
        metadata = ImageMetadata(
            width=original_size[0],
            height=original_size[1],
            channels=image.shape[2],
            format="processed",
            file_size=image.nbytes,
            color_space="RGB" if config.to_rgb else "BGR",
            has_alpha=False,
            hash=hashlib.md5(image.tobytes()).hexdigest()
        )
        
        return ProcessedImage(
            image=processed_image,
            original_size=original_size,
            processed_size=config.target_size,
            scale_factor=scale_factor,
            padding=padding,
            metadata=metadata
        )
    
    def _bytes_to_numpy(self, image_data: bytes) -> np.ndarray:
        """Convert bytes to numpy array"""
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Failed to decode image from bytes")
        return image
    
    def _pil_to_numpy(self, pil_image: Image.Image) -> np.ndarray:
        """Convert PIL Image to numpy array"""
        # Convert to RGB if needed
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')
        
        # Convert to numpy and change from RGB to BGR for OpenCV
        image = np.array(pil_image)
        return cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    
    def _resize_only(self, image: np.ndarray, target_size: Tuple[int, int]) -> Tuple[np.ndarray, float, Tuple[int, int, int, int]]:
        """Simple resize without maintaining aspect ratio"""
        h, w = image.shape[:2]
        target_w, target_h = target_size
        
        resized = cv2.resize(image, (target_w, target_h))
        scale_factor = min(target_w / w, target_h / h)
        
        return resized, scale_factor, (0, 0, 0, 0)
    
    def _crop_and_resize(self, image: np.ndarray, target_size: Tuple[int, int]) -> Tuple[np.ndarray, float, Tuple[int, int, int, int]]:
        """Crop to square and resize"""
        h, w = image.shape[:2]
        size = min(h, w)
        
        # Center crop
        start_x = (w - size) // 2
        start_y = (h - size) // 2
        cropped = image[start_y:start_y + size, start_x:start_x + size]
        
        # Resize
        target_w, target_h = target_size
        resized = cv2.resize(cropped, (target_w, target_h))
        scale_factor = target_w / size
        
        return resized, scale_factor, (0, 0, 0, 0)
    
    def _pad_and_resize(self, image: np.ndarray, target_size: Tuple[int, int], pad_color: Tuple[int, int, int]) -> Tuple[np.ndarray, float, Tuple[int, int, int, int]]:
        """Pad to square and resize"""
        h, w = image.shape[:2]
        size = max(h, w)
        
        # Calculate padding
        pad_h = (size - h) // 2
        pad_w = (size - w) // 2
        
        # Pad image
        padded = cv2.copyMakeBorder(
            image, pad_h, size - h - pad_h, pad_w, size - w - pad_w,
            cv2.BORDER_CONSTANT, value=pad_color
        )
        
        # Resize
        target_w, target_h = target_size
        resized = cv2.resize(padded, (target_w, target_h))
        scale_factor = target_w / size
        
        return resized, scale_factor, (pad_h, size - h - pad_h, pad_w, size - w - pad_w)
    
    def _letterbox(self, image: np.ndarray, target_size: Tuple[int, int], pad_color: Tuple[int, int, int]) -> Tuple[np.ndarray, float, Tuple[int, int, int, int]]:
        """Letterbox resize maintaining aspect ratio"""
        h, w = image.shape[:2]
        target_w, target_h = target_size
        
        # Calculate scale factor
        scale = min(target_w / w, target_h / h)
        
        # Resize
        new_w = int(w * scale)
        new_h = int(h * scale)
        resized = cv2.resize(image, (new_w, new_h))
        
        # Calculate padding
        pad_w = (target_w - new_w) // 2
        pad_h = (target_h - new_h) // 2
        
        # Pad to target size
        padded = cv2.copyMakeBorder(
            resized, 
            pad_h, target_h - new_h - pad_h,
            pad_w, target_w - new_w - pad_w,
            cv2.BORDER_CONSTANT, value=pad_color
        )
        
        return padded, scale, (pad_h, target_h - new_h - pad_h, pad_w, target_w - new_w - pad_w)
    
    def _normalize(self, image: np.ndarray, mean: Tuple[float, float, float], std: Tuple[float, float, float]) -> np.ndarray:
        """Normalize image with mean and std"""
        normalized = image.astype(np.float32) / 255.0
        
        for i in range(3):
            normalized[:, :, i] = (normalized[:, :, i] - mean[i]) / std[i]
        
        return normalized


class ImageUtils:
    """Utility functions for image handling"""
    
    @staticmethod
    def numpy_to_base64(image: np.ndarray, format: str = "JPEG") -> str:
        """Convert numpy array to base64 string"""
        # Ensure image is in correct format (0-255, uint8)
        if image.dtype != np.uint8:
            if image.max() <= 1.0:
                image = (image * 255).astype(np.uint8)
            else:
                image = image.astype(np.uint8)
        
        # Convert BGR to RGB if needed
        if len(image.shape) == 3 and image.shape[2] == 3:
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Convert to PIL Image
        pil_image = Image.fromarray(image)
        
        # Save to bytes
        buffer = BytesIO()
        pil_image.save(buffer, format=format)
        
        # Encode to base64
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    @staticmethod
    def base64_to_numpy(base64_string: str) -> np.ndarray:
        """Convert base64 string to numpy array"""
        # Decode base64
        image_data = base64.b64decode(base64_string)
        
        # Convert to PIL Image
        pil_image = Image.open(BytesIO(image_data))
        
        # Convert to numpy array
        image = np.array(pil_image)
        
        # Convert RGB to BGR for OpenCV
        if len(image.shape) == 3 and image.shape[2] == 3:
            image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        
        return image
    
    @staticmethod
    async def save_temp_image(image: np.ndarray, format: str = "jpg") -> str:
        """Save image to temporary file and return path"""
        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=f".{format}")
        temp_path = temp_file.name
        temp_file.close()
        
        # Save image
        success = cv2.imwrite(temp_path, image)
        if not success:
            raise ValueError(f"Failed to save image to {temp_path}")
        
        return temp_path
    
    @staticmethod
    async def load_image_async(file_path: str) -> np.ndarray:
        """Load image asynchronously"""
        def _load():
            return cv2.imread(file_path)
        
        loop = asyncio.get_event_loop()
        image = await loop.run_in_executor(None, _load)
        
        if image is None:
            raise ValueError(f"Failed to load image from {file_path}")
        
        return image


class TemporaryFileManager:
    """Manages temporary files for image processing"""
    
    def __init__(self, max_files: int = 100, cleanup_interval: int = 3600):
        self.max_files = max_files
        self.cleanup_interval = cleanup_interval
        self.temp_files: Dict[str, float] = {}  # file_path -> timestamp
        self.logger = logging.getLogger(f"{__name__}.TemporaryFileManager")
        
        # Start cleanup task
        asyncio.create_task(self._cleanup_task())
    
    async def create_temp_file(self, data: bytes, suffix: str = ".jpg") -> str:
        """Create temporary file with data"""
        # Create temp file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        temp_path = temp_file.name
        
        # Write data
        async with aiofiles.open(temp_path, 'wb') as f:
            await f.write(data)
        
        # Track file
        self.temp_files[temp_path] = asyncio.get_event_loop().time()
        
        # Cleanup if too many files
        if len(self.temp_files) > self.max_files:
            await self._cleanup_old_files()
        
        return temp_path
    
    async def cleanup_file(self, file_path: str):
        """Clean up specific temporary file"""
        try:
            if file_path in self.temp_files:
                del self.temp_files[file_path]
            
            path = Path(file_path)
            if path.exists():
                path.unlink()
                
        except Exception as e:
            self.logger.warning(f"Failed to cleanup file {file_path}: {e}")
    
    async def _cleanup_old_files(self):
        """Cleanup old temporary files"""
        current_time = asyncio.get_event_loop().time()
        cleanup_threshold = current_time - self.cleanup_interval
        
        files_to_remove = [
            path for path, timestamp in self.temp_files.items()
            if timestamp < cleanup_threshold
        ]
        
        for file_path in files_to_remove:
            await self.cleanup_file(file_path)
    
    async def _cleanup_task(self):
        """Background cleanup task"""
        while True:
            try:
                await asyncio.sleep(self.cleanup_interval)
                await self._cleanup_old_files()
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Cleanup task error: {e}")