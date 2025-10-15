"""
Garment Shape Model (GSM) processor for AR try-on.
Extracts anchors, keypoints, and mesh from garment images.
"""
import io
import logging
from typing import Dict, List, Tuple, Optional
import numpy as np
import cv2
from PIL import Image
from scipy import ndimage
from scipy.spatial import Delaunay
from scipy.signal import savgol_filter
from skimage import morphology, measure

logger = logging.getLogger(__name__)


class GarmentProcessor:
    """Process garment images into Garment Shape Models (GSM)."""

    def __init__(self):
        self.default_anchors = {
            "shirt": {
                "collar_left": [0.30, 0.12],
                "neck_apex": [0.50, 0.18],
                "collar_right": [0.70, 0.12]
            },
            "tshirt": {
                "collar_left": [0.32, 0.15],
                "neck_apex": [0.50, 0.20],
                "collar_right": [0.68, 0.15]
            }
        }

    def process(
        self,
        rgba_image: Image.Image,
        category: str = "shirt",
        custom_anchors: Optional[Dict] = None,
        auto_detect_anchors: bool = True
    ) -> Tuple[Image.Image, Dict]:
        """
        Process RGBA garment image into GSM.

        Args:
            rgba_image: PIL Image with alpha channel
            category: "shirt" or "tshirt"
            custom_anchors: Optional manual anchors
            auto_detect_anchors: Whether to auto-detect anchors

        Returns:
            Tuple of (cropped_image, gsm_dict)
        """
        # Convert to numpy
        img_array = np.array(rgba_image)
        h, w = img_array.shape[:2]

        # Extract alpha mask
        alpha = img_array[:, :, 3] if img_array.shape[2] == 4 else np.ones((h, w), dtype=np.uint8) * 255
        mask = (alpha > 10).astype(np.uint8)

        # Auto-crop to garment bounds
        coords = np.column_stack(np.where(mask > 0))
        if len(coords) == 0:
            raise ValueError("No garment detected in image (empty alpha)")

        y_min, x_min = coords.min(axis=0)
        y_max, x_max = coords.max(axis=0)

        # Add 5% padding
        pad = int(min(h, w) * 0.05)
        y_min = max(0, y_min - pad)
        y_max = min(h, y_max + pad)
        x_min = max(0, x_min - pad)
        x_max = min(w, x_max + pad)

        # Crop
        cropped_img = rgba_image.crop((x_min, y_min, x_max, y_max))
        cropped_mask = mask[y_min:y_max, x_min:x_max]

        crop_w = x_max - x_min
        crop_h = y_max - y_min

        logger.info(f"Cropped garment: {crop_w}x{crop_h} (from {w}x{h})")

        # Detect anchors
        if auto_detect_anchors and not custom_anchors:
            anchors, confidence = self._detect_anchors(cropped_mask, category)
        elif custom_anchors:
            anchors = custom_anchors
            confidence = 1.0
        else:
            anchors = self.default_anchors.get(category, self.default_anchors["shirt"])
            confidence = 0.0

        # Extract keypoints (armpit, side seams, hem)
        keypoints = self._extract_keypoints(cropped_mask, anchors)

        # Generate mesh (triangulation)
        mesh = self._generate_mesh(cropped_mask, anchors, keypoints)

        # Prepare output
        gsm = {
            "image": {
                "w": crop_w,
                "h": crop_h
            },
            "anchors": anchors,
            "anchor_confidence": round(confidence, 3),
            "keypoints": keypoints,
            "mesh": mesh,
            "body_offsets": {
                "neck_drop_ratio": 0.06,
                "torso_length_ratio": 1.05
            }
        }

        return cropped_img, gsm

    def _detect_anchors(self, mask: np.ndarray, category: str) -> Tuple[Dict, float]:
        """
        Auto-detect collar anchors using contour analysis.

        Returns:
            (anchors_dict, confidence_score)
        """
        h, w = mask.shape

        # Focus on top 35% for collar detection
        top_region = mask[:int(h * 0.35), :]

        # Find contours
        contours, _ = cv2.findContours(top_region, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if len(contours) == 0:
            logger.warning("No contours found, using defaults")
            return self.default_anchors[category], 0.0

        # Get largest contour (outer garment edge)
        contour = max(contours, key=cv2.contourArea)
        contour = contour.squeeze()

        if len(contour) < 10:
            logger.warning("Contour too small, using defaults")
            return self.default_anchors[category], 0.0

        # Smooth contour
        contour_smooth = self._smooth_contour(contour)

        # Find neck apex (topmost point near center)
        center_x = w / 2
        top_points = contour_smooth[contour_smooth[:, 1] < h * 0.2]

        if len(top_points) == 0:
            logger.warning("No top points found, using defaults")
            return self.default_anchors[category], 0.0

        # Find point closest to center horizontally
        distances = np.abs(top_points[:, 0] - center_x)
        neck_idx = np.argmin(distances)
        neck_apex = top_points[neck_idx]

        # Find collar left and right (move along contour from neck)
        collar_offset = w * 0.15  # 15% of width from center

        left_candidates = contour_smooth[
            (contour_smooth[:, 0] < center_x - collar_offset * 0.5) &
            (contour_smooth[:, 1] < h * 0.25)
        ]

        right_candidates = contour_smooth[
            (contour_smooth[:, 0] > center_x + collar_offset * 0.5) &
            (contour_smooth[:, 1] < h * 0.25)
        ]

        if len(left_candidates) == 0 or len(right_candidates) == 0:
            logger.warning("Collar candidates not found, using defaults")
            return self.default_anchors[category], 0.0

        # Pick leftmost and rightmost
        collar_left = left_candidates[np.argmin(left_candidates[:, 0])]
        collar_right = right_candidates[np.argmax(right_candidates[:, 0])]

        # Normalize to 0-1
        anchors = {
            "collar_left": [float(collar_left[0] / w), float(collar_left[1] / h)],
            "neck_apex": [float(neck_apex[0] / w), float(neck_apex[1] / h)],
            "collar_right": [float(collar_right[0] / w), float(collar_right[1] / h)]
        }

        # Calculate confidence based on geometry
        collar_width = collar_right[0] - collar_left[0]
        expected_width = w * 0.4  # Expect ~40% of width
        width_score = 1.0 - abs(collar_width - expected_width) / expected_width
        width_score = np.clip(width_score, 0.0, 1.0)

        # Check if neck is roughly centered
        neck_center_score = 1.0 - abs(neck_apex[0] - center_x) / (w * 0.1)
        neck_center_score = np.clip(neck_center_score, 0.0, 1.0)

        confidence = float((width_score + neck_center_score) / 2)

        logger.info(f"Auto-detected anchors: confidence={confidence:.2f}")

        return anchors, confidence

    def _smooth_contour(self, contour: np.ndarray, window: int = 5) -> np.ndarray:
        """Smooth contour using Savitzky-Golay filter."""
        if len(contour) < window * 2:
            return contour

        x = savgol_filter(contour[:, 0], window, 3, mode='wrap')
        y = savgol_filter(contour[:, 1], window, 3, mode='wrap')

        return np.column_stack([x, y])

    def _extract_keypoints(self, mask: np.ndarray, anchors: Dict) -> Dict:
        """Extract keypoints: armpit, side seams, hem."""
        h, w = mask.shape

        # Find contours
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if len(contours) == 0:
            return {}

        contour = max(contours, key=cv2.contourArea).squeeze()

        # Ensure contour is 2D
        if len(contour.shape) == 1:
            contour = contour.reshape(-1, 2)

        # Find armpit notches (curvature maxima on sides)
        # Simple heuristic: narrowest points in upper 50% on each side
        upper_half = contour[contour[:, 1] < h * 0.5]

        if len(upper_half) == 0:
            upper_half = contour[:len(contour)//2]

        left_side = upper_half[upper_half[:, 0] < w * 0.4]
        right_side = upper_half[upper_half[:, 0] > w * 0.6]

        armpit_left = left_side[np.argmax(left_side[:, 0])] if len(left_side) > 0 else np.array([w * 0.2, h * 0.3])
        armpit_right = right_side[np.argmin(right_side[:, 0])] if len(right_side) > 0 else np.array([w * 0.8, h * 0.3])

        # Find side seams (narrowest points at waist level)
        waist_region = contour[(contour[:, 1] > h * 0.4) & (contour[:, 1] < h * 0.7)]

        if len(waist_region) == 0:
            waist_region = contour[int(len(contour)*0.4):int(len(contour)*0.7)]

        left_waist = waist_region[waist_region[:, 0] < w * 0.5] if len(waist_region) > 0 else np.array([[w * 0.25, h * 0.6]])
        right_waist = waist_region[waist_region[:, 0] > w * 0.5] if len(waist_region) > 0 else np.array([[w * 0.75, h * 0.6]])

        side_left = left_waist[np.argmax(left_waist[:, 0])] if len(left_waist) > 0 else np.array([w * 0.25, h * 0.6])
        side_right = right_waist[np.argmin(right_waist[:, 0])] if len(right_waist) > 0 else np.array([w * 0.75, h * 0.6])

        # Find hem center (bottommost point near center)
        bottom_region = contour[contour[:, 1] > h * 0.85]

        if len(bottom_region) == 0:
            bottom_region = contour[-int(len(contour)*0.15):]

        center_bottom = bottom_region[np.argmin(np.abs(bottom_region[:, 0] - w / 2))] if len(bottom_region) > 0 else np.array([w * 0.5, h * 0.95])

        # Normalize to 0-1
        keypoints = {
            "armpit_left": [float(armpit_left[0] / w), float(armpit_left[1] / h)],
            "armpit_right": [float(armpit_right[0] / w), float(armpit_right[1] / h)],
            "side_left": [float(side_left[0] / w), float(side_left[1] / h)],
            "side_right": [float(side_right[0] / w), float(side_right[1] / h)],
            "hem_center": [float(center_bottom[0] / w), float(center_bottom[1] / h)]
        }

        return keypoints

    def _generate_mesh(self, mask: np.ndarray, anchors: Dict, keypoints: Dict) -> Dict:
        """Generate triangulated mesh for warping."""
        h, w = mask.shape

        # Collect all control points
        control_points = []

        # Add anchors
        for key, point in anchors.items():
            control_points.append([point[0] * w, point[1] * h])

        # Add keypoints
        for key, point in keypoints.items():
            control_points.append([point[0] * w, point[1] * h])

        # Add contour points (simplified)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if len(contours) > 0:
            contour = max(contours, key=cv2.contourArea).squeeze()

            # Ensure contour is 2D
            if len(contour.shape) == 1:
                contour = contour.reshape(-1, 2)

            # Simplify contour (keep ~50 points)
            if len(contour) > 50:
                step = len(contour) // 50
                contour = contour[::step]

            control_points.extend(contour.tolist())

        control_points = np.array(control_points)

        # Remove duplicates
        control_points = np.unique(control_points, axis=0)

        # Triangulate
        try:
            tri = Delaunay(control_points)
            triangles = tri.simplices.tolist()
        except Exception as e:
            logger.warning(f"Triangulation failed: {e}")
            triangles = []

        # Normalize vertices to 0-1
        verts_norm = control_points / [w, h]

        return {
            "verts": verts_norm.tolist(),
            "tris": triangles
        }


# Singleton instance
_processor = None


def get_processor() -> GarmentProcessor:
    """Get singleton processor instance."""
    global _processor
    if _processor is None:
        _processor = GarmentProcessor()
    return _processor
