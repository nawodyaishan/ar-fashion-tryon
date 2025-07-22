import cv2
import numpy as np
from typing import Optional
import logging

from app.models.schemas import PoseDetectionResult
from app.models.ml_models import PoseEstimator, ModelManager
from app.config import settings

logger = logging.getLogger(__name__)

class PoseService:
    """Service for pose detection operations"""
    
    def __init__(self):
        self.model_manager = ModelManager(settings)
        self.estimator = PoseEstimator(self.model_manager)
        
    async def detect_pose(self, image_data: bytes) -> Optional[PoseDetectionResult]:
        """Detect pose from uploaded image"""
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                logger.error("Failed to decode image")
                return None
            
            # Detect pose
            result = self.estimator.detect(image)
            
            return result
            
        except Exception as e:
            logger.error(f"Error detecting pose: {e}")
            return None
    
    def visualize_pose(self, image: np.ndarray, pose_result: PoseDetectionResult) -> np.ndarray:
        """Draw pose keypoints on image"""
        image_copy = image.copy()
        
        # Draw keypoints
        for kp in pose_result.keypoints:
            if kp.visibility > 0.5:
                x = int(kp.x * image.shape[1])
                y = int(kp.y * image.shape[0])
                cv2.circle(image_copy, (x, y), 5, (0, 255, 0), -1)
        
        # Draw skeleton connections
        connections = [
            (11, 12), (11, 13), (13, 15), (12, 14), (14, 16),  # Arms
            (11, 23), (12, 24), (23, 24), (23, 25), (24, 26),  # Torso
            (25, 27), (26, 28), (27, 29), (28, 30)  # Legs
        ]
        
        for connection in connections:
            kp1 = pose_result.keypoints[connection[0]]
            kp2 = pose_result.keypoints[connection[1]]
            
            if kp1.visibility > 0.5 and kp2.visibility > 0.5:
                pt1 = (int(kp1.x * image.shape[1]), int(kp1.y * image.shape[0]))
                pt2 = (int(kp2.x * image.shape[1]), int(kp2.y * image.shape[0]))
                cv2.line(image_copy, pt1, pt2, (0, 255, 0), 2)
        
        return image_copy