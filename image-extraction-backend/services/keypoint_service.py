"""
Garment keypoint detection service using MMPose.

This service provides keypoint detection for fashion garments to enable
precise AR try-on alignment. Uses MMPose Inferencer for easy integration.
"""
import logging
import tempfile
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# Global variable to hold the inferencer (loaded once at startup)
_inferencer = None
_model_loaded = False


def load_keypoint_model():
    """
    Load MMPose inferencer at application startup.

    Uses a lightweight approach with RTMPose model which is fast and accurate.
    Falls back gracefully if model loading fails.
    """
    global _inferencer, _model_loaded

    try:
        from mmpose.apis import MMPoseInferencer

        logger.info("Loading MMPose keypoint detection model...")

        # Use RTMPose model - lightweight and fast, good for fashion keypoints
        # This model is designed for 2D pose estimation and works well for garments
        _inferencer = MMPoseInferencer(
            pose2d='rtmpose',  # Lightweight real-time model
            device='cpu'  # Use CPU to avoid GPU conflicts with TensorFlow
        )

        _model_loaded = True
        logger.info("✓ MMPose keypoint model loaded successfully")

    except Exception as e:
        logger.error(f"Failed to load MMPose model: {e}")
        logger.warning("Keypoint detection will not be available. Service continues without it.")
        _model_loaded = False
        _inferencer = None


def is_model_loaded() -> bool:
    """Check if keypoint detection model is loaded."""
    return _model_loaded


def _normalize_keypoints(keypoints: np.ndarray, image_width: int, image_height: int) -> List[Dict]:
    """
    Normalize keypoint coordinates to 0-1 range and format for frontend.

    Args:
        keypoints: Array of shape (N, 2) with x, y pixel coordinates
        image_width: Original image width in pixels
        image_height: Original image height in pixels

    Returns:
        List of keypoint dictionaries with normalized coordinates
    """
    # Common fashion keypoint names (subset that's relevant for upper body garments)
    # RTMPose uses COCO format, so we map relevant body keypoints to garment alignment points
    keypoint_names = [
        "nose",           # 0 - can be used for neckline reference
        "left_eye",       # 1
        "right_eye",      # 2
        "left_ear",       # 3
        "right_ear",      # 4
        "left_shoulder",  # 5 - KEY for garment alignment
        "right_shoulder", # 6 - KEY for garment alignment
        "left_elbow",     # 7
        "right_elbow",    # 8
        "left_wrist",     # 9
        "right_wrist",    # 10
        "left_hip",       # 11 - KEY for garment bottom
        "right_hip",      # 12 - KEY for garment bottom
        "left_knee",      # 13
        "right_knee",     # 14
        "left_ankle",     # 15
        "right_ankle",    # 16
    ]

    normalized_keypoints = []

    for idx, (x, y) in enumerate(keypoints):
        # Skip if coordinates are invalid
        if x < 0 or y < 0:
            continue

        normalized_keypoints.append({
            "name": keypoint_names[idx] if idx < len(keypoint_names) else f"keypoint_{idx}",
            "x": float(x / image_width),   # Normalize to 0-1
            "y": float(y / image_height),  # Normalize to 0-1
            "x_pixel": float(x),           # Also provide pixel coordinates
            "y_pixel": float(y),
            "visible": True,
            "confidence": 1.0  # RTMPose provides confidence per keypoint
        })

    return normalized_keypoints


def _extract_garment_specific_keypoints(all_keypoints: List[Dict]) -> Dict:
    """
    Extract and organize keypoints specifically useful for garment alignment.

    For AR try-on, the most important keypoints are:
    - Shoulders (left & right) - primary alignment points
    - Neckline reference (nose/center between shoulders)
    - Hips (left & right) - for garment length/bottom alignment

    Args:
        all_keypoints: List of all detected keypoints

    Returns:
        Dictionary with organized garment-specific keypoints
    """
    keypoint_map = {kp["name"]: kp for kp in all_keypoints}

    # Extract critical points for garment alignment
    garment_keypoints = {
        "left_shoulder": keypoint_map.get("left_shoulder"),
        "right_shoulder": keypoint_map.get("right_shoulder"),
        "left_hip": keypoint_map.get("left_hip"),
        "right_hip": keypoint_map.get("right_hip"),
        "neckline_reference": keypoint_map.get("nose"),  # Use nose as neckline proxy
    }

    # Calculate derived keypoints
    left_shoulder = garment_keypoints.get("left_shoulder")
    right_shoulder = garment_keypoints.get("right_shoulder")

    if left_shoulder and right_shoulder:
        # Calculate shoulder center (critical for garment positioning)
        garment_keypoints["shoulder_center"] = {
            "name": "shoulder_center",
            "x": (left_shoulder["x"] + right_shoulder["x"]) / 2,
            "y": (left_shoulder["y"] + right_shoulder["y"]) / 2,
            "x_pixel": (left_shoulder["x_pixel"] + right_shoulder["x_pixel"]) / 2,
            "y_pixel": (left_shoulder["y_pixel"] + right_shoulder["y_pixel"]) / 2,
            "visible": True,
            "confidence": (left_shoulder["confidence"] + right_shoulder["confidence"]) / 2,
            "derived": True
        }

        # Calculate shoulder width (useful for garment scaling)
        shoulder_width_pixel = np.sqrt(
            (right_shoulder["x_pixel"] - left_shoulder["x_pixel"]) ** 2 +
            (right_shoulder["y_pixel"] - left_shoulder["y_pixel"]) ** 2
        )

        garment_keypoints["shoulder_width_pixel"] = float(shoulder_width_pixel)

        # Calculate shoulder angle (for garment rotation)
        angle_rad = np.arctan2(
            right_shoulder["y_pixel"] - left_shoulder["y_pixel"],
            right_shoulder["x_pixel"] - left_shoulder["x_pixel"]
        )
        garment_keypoints["shoulder_angle_degrees"] = float(np.degrees(angle_rad))

    return garment_keypoints


def detect_keypoints(image_path: Path) -> Dict:
    """
    Detect keypoints from a garment image.

    This function uses body pose estimation as a proxy for garment keypoint detection.
    When a garment is laid flat or worn, the body keypoints align well with garment
    structural points (shoulders, neckline, hem, etc.).

    Args:
        image_path: Path to the garment image file

    Returns:
        Dictionary containing:
        - all_keypoints: List of all detected keypoints (normalized 0-1)
        - garment_keypoints: Organized keypoints for garment alignment
        - image_dimensions: Original image width and height
        - detection_confidence: Overall detection confidence

    Raises:
        ValueError: If model is not loaded or detection fails
    """
    if not _model_loaded or _inferencer is None:
        raise ValueError("Keypoint detection model not loaded")

    logger.info(f"Detecting keypoints for: {image_path}")

    try:
        # Load image to get dimensions
        image = Image.open(image_path)
        img_width, img_height = image.size

        # Run inference
        # MMPose Inferencer expects a file path
        result_generator = _inferencer(str(image_path), show=False, return_vis=False)

        # Extract results (inferencer returns a generator)
        result = next(result_generator)

        # Extract keypoints from result
        # Result structure: {'predictions': [[{'keypoints': array, 'keypoint_scores': array}]]}
        if not result or 'predictions' not in result or len(result['predictions']) == 0:
            logger.warning("No keypoints detected in image")
            return {
                "all_keypoints": [],
                "garment_keypoints": {},
                "image_dimensions": {"width": img_width, "height": img_height},
                "detection_confidence": 0.0,
                "message": "No keypoints detected"
            }

        # Get first detection (assumes single garment/person in image)
        prediction = result['predictions'][0][0]
        keypoints = prediction['keypoints']  # Shape: (N, 2) with x, y coordinates
        scores = prediction.get('keypoint_scores', np.ones(len(keypoints)))

        # Normalize keypoints to 0-1 range
        normalized_keypoints = _normalize_keypoints(keypoints, img_width, img_height)

        # Add confidence scores to keypoints
        for i, kp in enumerate(normalized_keypoints):
            if i < len(scores):
                kp['confidence'] = float(scores[i])

        # Extract garment-specific keypoints
        garment_keypoints = _extract_garment_specific_keypoints(normalized_keypoints)

        # Calculate overall confidence (average of visible keypoint scores)
        visible_scores = [kp['confidence'] for kp in normalized_keypoints if kp['visible']]
        overall_confidence = float(np.mean(visible_scores)) if visible_scores else 0.0

        logger.info(f"✓ Detected {len(normalized_keypoints)} keypoints with confidence {overall_confidence:.2f}")

        return {
            "all_keypoints": normalized_keypoints,
            "garment_keypoints": garment_keypoints,
            "image_dimensions": {
                "width": img_width,
                "height": img_height
            },
            "detection_confidence": overall_confidence,
            "message": "Keypoints detected successfully"
        }

    except Exception as e:
        logger.error(f"Keypoint detection failed: {e}")
        raise ValueError(f"Keypoint detection failed: {str(e)}")
