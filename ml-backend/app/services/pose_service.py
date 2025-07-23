import cv2
import numpy as np
import logging
from typing import Optional

from ..core.model_manager import ModelManager
from ..core.device_manager import DeviceManager
from ..models.schemas import PoseDetectionResult, ProcessingOptions
from .pipeline_service import PipelineService

logger = logging.getLogger(__name__)


class PoseService:
    """Service for pose detection operations using ML pipelines"""

    def __init__(self, model_manager: ModelManager, device_manager: DeviceManager):
        self.model_manager = model_manager
        self.device_manager = device_manager
        self.pipeline_service = PipelineService(model_manager, device_manager)

    async def detect_pose(self, 
                         image_data: bytes, 
                         processing_options: ProcessingOptions = None) -> Optional[PoseDetectionResult]:
        """Detect human pose using ML pipeline"""
        try:
            # Use pipeline service for processing
            result = await self.pipeline_service.process_pose_detection(
                image_data, 
                processing_options or ProcessingOptions()
            )
            
            if result.success:
                return result.data
            else:
                logger.error(f"Pose detection failed: {result.error}")
                return None

        except Exception as e:
            logger.error(f"Error detecting pose: {e}")
            return None

    async def analyze_pose_quality(self, image_data: bytes) -> Optional[dict]:
        """Analyze pose quality and provide feedback"""
        result = await self.detect_pose(image_data)
        
        if result:
            # Calculate additional quality metrics
            quality_score = self._calculate_quality_score(result)
            
            return {
                "pose_quality": result.pose_quality,
                "quality_score": quality_score,
                "keypoint_count": len(result.keypoints),
                "confidence": result.confidence,
                "recommendations": self._generate_recommendations(result)
            }
        
        return None

    def _calculate_quality_score(self, pose_result: PoseDetectionResult) -> float:
        """Calculate overall pose quality score"""
        try:
            # Base score from confidence
            score = pose_result.confidence * 0.5
            
            # Add score for keypoint visibility
            visible_keypoints = sum(1 for kp in pose_result.keypoints if kp.visibility > 0.5)
            keypoint_score = (visible_keypoints / len(pose_result.keypoints)) * 0.3
            
            # Add score for key body parts being visible
            key_parts = ["left_shoulder", "right_shoulder", "left_hip", "right_hip"]
            key_visible = sum(
                1 for kp in pose_result.keypoints 
                if kp.name in key_parts and kp.visibility > 0.7
            )
            key_score = (key_visible / len(key_parts)) * 0.2
            
            return min(1.0, score + keypoint_score + key_score)
            
        except Exception:
            return pose_result.confidence

    def _generate_recommendations(self, pose_result: PoseDetectionResult) -> list:
        """Generate recommendations for improving pose quality"""
        recommendations = []
        
        # Check if person is facing camera
        face_keypoints = [kp for kp in pose_result.keypoints if "eye" in kp.name or "ear" in kp.name]
        if not any(kp.visibility > 0.5 for kp in face_keypoints):
            recommendations.append("Face the camera for better detection")
        
        # Check key body parts visibility
        key_parts = {
            "shoulders": ["left_shoulder", "right_shoulder"],
            "arms": ["left_elbow", "right_elbow", "left_wrist", "right_wrist"],
            "torso": ["left_hip", "right_hip"]
        }
        
        for part_name, part_keypoints in key_parts.items():
            visible_count = sum(
                1 for kp in pose_result.keypoints
                if kp.name in part_keypoints and kp.visibility > 0.5
            )
            if visible_count < len(part_keypoints) * 0.5:
                recommendations.append(f"Ensure {part_name} are visible and not occluded")
        
        # Check pose confidence
        if pose_result.confidence < 0.7:
            recommendations.append("Move to better lighting and remove background clutter")
        
        return recommendations if recommendations else ["Pose looks good!"]
    
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
            if connection[0] < len(pose_result.keypoints) and connection[1] < len(pose_result.keypoints):
                kp1 = pose_result.keypoints[connection[0]]
                kp2 = pose_result.keypoints[connection[1]]
                
                if kp1.visibility > 0.5 and kp2.visibility > 0.5:
                    pt1 = (int(kp1.x * image.shape[1]), int(kp1.y * image.shape[0]))
                    pt2 = (int(kp2.x * image.shape[1]), int(kp2.y * image.shape[0]))
                    cv2.line(image_copy, pt1, pt2, (0, 255, 0), 2)
        
        return image_copy