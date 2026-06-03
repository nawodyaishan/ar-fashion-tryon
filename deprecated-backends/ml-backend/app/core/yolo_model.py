"""
YOLO Model Implementation

Concrete implementation of YOLO model for garment detection and segmentation.
"""

import torch
import numpy as np
import cv2
from typing import Dict, Any, List, Optional, Tuple
from ultralytics import YOLO
import logging

from .models import BaseModel, ModelConfig
from ..models.schemas import GarmentDetectionResult, BoundingBox, GarmentFeatures, GarmentType

logger = logging.getLogger(__name__)


class YOLOModel(BaseModel):
    """YOLO model for garment detection and segmentation"""
    
    def __init__(self, config: ModelConfig):
        super().__init__(config)
        self.class_names = {
            0: GarmentType.SHIRT,
            1: GarmentType.PANTS, 
            2: GarmentType.DRESS,
            3: GarmentType.SKIRT,
            4: GarmentType.JACKET
        }
        self.color_detector = ColorDetector()
    
    async def _load_model(self) -> None:
        """Load YOLO model"""
        try:
            self.model = YOLO(self.config.model_path)
            if self.device.type == 'cuda':
                self.model.to('cuda')
        except Exception as e:
            self.logger.error(f"Failed to load YOLO model: {e}")
            raise
    
    async def preprocess(self, input_data: np.ndarray) -> np.ndarray:
        """Preprocess image for YOLO"""
        # YOLO expects BGR format
        if len(input_data.shape) == 3 and input_data.shape[2] == 3:
            # Ensure image is in correct format
            if input_data.dtype != np.uint8:
                input_data = (input_data * 255).astype(np.uint8)
        
        return input_data
    
    async def forward(self, model_input: np.ndarray) -> Any:
        """Run YOLO inference"""
        results = self.model(model_input, conf=self.config.confidence_threshold)
        return results
    
    async def postprocess(self, model_output: Any) -> Optional[GarmentDetectionResult]:
        """Postprocess YOLO results"""
        try:
            results = model_output[0]  # Get first result
            
            if len(results.boxes) == 0:
                return None
            
            # Get best detection (highest confidence)
            best_idx = torch.argmax(results.boxes.conf).item()
            box = results.boxes[best_idx]
            
            # Extract bounding box
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            confidence = float(box.conf[0].cpu().numpy())
            class_id = int(box.cls[0].cpu().numpy())
            
            # Get original image for feature extraction
            original_img = results.orig_img
            h, w = original_img.shape[:2]
            
            # Normalize coordinates
            bbox = BoundingBox(
                x1=x1 / w,
                y1=y1 / h,
                x2=x2 / w,
                y2=y2 / h,
                confidence=confidence
            )
            
            # Extract garment region for feature analysis
            garment_region = original_img[int(y1):int(y2), int(x1):int(x2)]
            features = self._extract_features(garment_region)
            
            # Get segmentation mask if available
            mask = None
            if hasattr(results, 'masks') and results.masks is not None:
                mask = results.masks.data[best_idx].cpu().numpy()
                mask = mask.tolist()  # Convert to list for JSON serialization
            
            # Calculate dimensions
            dimensions = {
                "width_ratio": (x2 - x1) / w,
                "height_ratio": (y2 - y1) / h,
                "aspect_ratio": (x2 - x1) / (y2 - y1),
                "area_ratio": ((x2 - x1) * (y2 - y1)) / (w * h)
            }
            
            return GarmentDetectionResult(
                type=self.class_names.get(class_id, GarmentType.UNKNOWN),
                bbox=bbox,
                mask=mask,
                features=features,
                confidence=confidence,
                dimensions=dimensions
            )
            
        except Exception as e:
            self.logger.error(f"YOLO postprocessing error: {e}")
            return None
    
    def _extract_features(self, garment_region: np.ndarray) -> GarmentFeatures:
        """Extract visual features from garment region"""
        if garment_region.size == 0:
            return GarmentFeatures(
                color_rgb=[128, 128, 128],
                color_name="gray",
                pattern="unknown",
                texture="unknown"
            )
        
        # Get dominant color
        dominant_color = self.color_detector.get_dominant_color(garment_region)
        color_name = self.color_detector.rgb_to_name(dominant_color)
        
        # Detect pattern (simple implementation)
        pattern = self._detect_pattern(garment_region)
        
        # Detect texture (simple implementation)  
        texture = self._detect_texture(garment_region)
        
        return GarmentFeatures(
            color_rgb=dominant_color,
            color_name=color_name,
            pattern=pattern,
            texture=texture
        )
    
    def _detect_pattern(self, region: np.ndarray) -> str:
        """Simple pattern detection"""
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
            
            # Calculate standard deviation of pixel values
            std_dev = np.std(gray)
            
            if std_dev < 20:
                return "solid"
            elif std_dev < 40:
                return "simple"
            else:
                return "patterned"
                
        except Exception:
            return "unknown"
    
    def _detect_texture(self, region: np.ndarray) -> str:
        """Simple texture detection"""
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
            
            # Apply Laplacian filter to detect edges/texture
            laplacian = cv2.Laplacian(gray, cv2.CV_64F)
            variance = laplacian.var()
            
            if variance < 100:
                return "smooth"
            elif variance < 500:
                return "textured"
            else:
                return "rough"
                
        except Exception:
            return "unknown"
    
    def _create_dummy_input(self) -> np.ndarray:
        """Create dummy input for warmup"""
        return np.zeros((640, 640, 3), dtype=np.uint8)


class ColorDetector:
    """Simple color detection utility"""
    
    def get_dominant_color(self, image: np.ndarray) -> List[int]:
        """Get dominant color from image using k-means clustering"""
        try:
            # Reshape image to be a list of pixels
            pixels = image.reshape(-1, 3)
            
            # Simple approach: use mean color
            mean_color = np.mean(pixels, axis=0)
            
            # Convert BGR to RGB
            return [int(mean_color[2]), int(mean_color[1]), int(mean_color[0])]
            
        except Exception:
            return [128, 128, 128]  # Default gray
    
    def rgb_to_name(self, rgb: List[int]) -> str:
        """Convert RGB values to color name"""
        r, g, b = rgb
        
        # Simple color naming based on dominant channel
        if r > g and r > b:
            if r > 150:
                return "red" if g < 100 and b < 100 else "pink"
            else:
                return "dark_red"
        elif g > r and g > b:
            if g > 150:
                return "green" if r < 100 and b < 100 else "light_green"
            else:
                return "dark_green"
        elif b > r and b > g:
            if b > 150:
                return "blue" if r < 100 and g < 100 else "light_blue"
            else:
                return "dark_blue"
        elif r > 150 and g > 150 and b < 100:
            return "yellow"
        elif r > 150 and g < 100 and b > 150:
            return "purple"
        elif r < 100 and g > 150 and b > 150:
            return "cyan"
        elif r > 200 and g > 200 and b > 200:
            return "white"
        elif r < 50 and g < 50 and b < 50:
            return "black"
        elif abs(r - g) < 30 and abs(g - b) < 30 and abs(r - b) < 30:
            if np.mean([r, g, b]) > 128:
                return "light_gray"
            else:
                return "dark_gray"
        else:
            return "mixed"