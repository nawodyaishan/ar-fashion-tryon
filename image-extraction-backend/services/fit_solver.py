"""
Fit solver for automatic garment positioning and warping.
Calculates similarity transform and TPS warping from pose landmarks.
"""
import logging
from typing import Dict, List, Tuple, Optional
import numpy as np

logger = logging.getLogger(__name__)


class FitSolver:
    """Solve garment fit from pose landmarks."""

    def __init__(self):
        # EMA filter state (per session)
        self.ema_state = {}

        # Hysteresis thresholds
        self.confidence_enter = 0.70
        self.confidence_exit = 0.55
        self.is_tracking = {}

    def solve(
        self,
        gsm: Dict,
        pose: Dict,
        prev_state: Optional[Dict] = None,
        session_id: str = "default"
    ) -> Dict:
        """
        Solve garment fit from pose landmarks.

        Args:
            gsm: Garment Shape Model from /process/garment/top
            pose: Pose landmarks {L_shoulder, R_shoulder, L_hip, R_hip, ...}
                  Each landmark is [x, y, visibility]
            prev_state: Previous EMA state for smoothing
            session_id: Session identifier for tracking state

        Returns:
            {
              "mode": "tracking|paused",
              "confidence": 0.78,
              "similarity": {"tx", "ty", "scale", "rot"},
              "warp": {"type": "tps", "src_ctrl": [...], "dst_ctrl": [...]},
              "occlusion": {"neck_clip": {...}}
            }
        """
        # Extract landmarks
        L_shoulder = np.array(pose.get("L_shoulder", [0, 0, 0]))
        R_shoulder = np.array(pose.get("R_shoulder", [0, 0, 0]))
        L_hip = np.array(pose.get("L_hip", [0, 0, 0]))
        R_hip = np.array(pose.get("R_hip", [0, 0, 0]))

        # Check visibility (3rd element is visibility)
        shoulder_confidence = min(L_shoulder[2], R_shoulder[2])

        # Hysteresis gate
        if session_id not in self.is_tracking:
            self.is_tracking[session_id] = False

        if not self.is_tracking[session_id]:
            if shoulder_confidence >= self.confidence_enter:
                self.is_tracking[session_id] = True
                logger.info(f"[{session_id}] Tracking started")
        else:
            if shoulder_confidence < self.confidence_exit:
                self.is_tracking[session_id] = False
                logger.info(f"[{session_id}] Tracking paused")

        if not self.is_tracking[session_id]:
            return {
                "mode": "paused",
                "confidence": round(float(shoulder_confidence), 3),
                "similarity": None,
                "warp": None,
                "occlusion": None
            }

        # Calculate base similarity transform
        similarity = self._calculate_similarity(
            L_shoulder, R_shoulder, L_hip, R_hip, gsm
        )

        # Calculate non-rigid warp (TPS)
        warp = self._calculate_warp(
            L_shoulder, R_shoulder, L_hip, R_hip, gsm, similarity
        )

        # Apply EMA smoothing
        if prev_state and session_id in self.ema_state:
            similarity = self._apply_ema(similarity, self.ema_state[session_id]["similarity"], alpha=0.15)
            warp = self._apply_ema_warp(warp, self.ema_state[session_id].get("warp"), alpha=0.10)

        # Store state
        if session_id not in self.ema_state:
            self.ema_state[session_id] = {}
        self.ema_state[session_id]["similarity"] = similarity
        self.ema_state[session_id]["warp"] = warp

        # Calculate occlusion hints
        occlusion = self._calculate_occlusion(L_shoulder, R_shoulder, gsm)

        return {
            "mode": "tracking",
            "confidence": round(float(shoulder_confidence), 3),
            "similarity": {
                "tx": round(float(similarity["tx"]), 2),
                "ty": round(float(similarity["ty"]), 2),
                "scale": round(float(similarity["scale"]), 4),
                "rot": round(float(similarity["rot"]), 4)
            },
            "warp": warp,
            "occlusion": occlusion
        }

    def _calculate_similarity(
        self,
        L_shoulder: np.ndarray,
        R_shoulder: np.ndarray,
        L_hip: np.ndarray,
        R_hip: np.ndarray,
        gsm: Dict
    ) -> Dict:
        """Calculate base similarity transform (translation, scale, rotation)."""
        # Shoulder center and width (video pixels)
        shoulder_center = (L_shoulder[:2] + R_shoulder[:2]) / 2
        shoulder_vec = R_shoulder[:2] - L_shoulder[:2]
        shoulder_width = np.linalg.norm(shoulder_vec)
        shoulder_angle = np.arctan2(shoulder_vec[1], shoulder_vec[0])

        # Garment collar center and width (normalized 0-1)
        anchors = gsm["anchors"]
        collar_left = np.array(anchors["collar_left"])
        collar_right = np.array(anchors["collar_right"])
        collar_center_norm = (collar_left + collar_right) / 2
        collar_width_norm = np.linalg.norm(collar_right - collar_left)

        # Calculate scale (map collar to shoulder with 110% ease)
        garment_w = gsm["image"]["w"]
        garment_h = gsm["image"]["h"]
        collar_width_px = collar_width_norm * garment_w
        target_collar_width = shoulder_width * 1.10
        scale = target_collar_width / collar_width_px

        # Clamp scale
        scale = np.clip(scale, 0.35, 2.8)

        # Calculate neck drop
        neck_drop_ratio = gsm["body_offsets"]["neck_drop_ratio"]
        neck_drop = neck_drop_ratio * shoulder_width
        target_collar_y = shoulder_center[1] + neck_drop

        # Calculate garment position (top-left corner in video pixels)
        collar_center_px = collar_center_norm * np.array([garment_w, garment_h])
        scaled_collar_center = collar_center_px * scale

        tx = shoulder_center[0] - scaled_collar_center[0]
        ty = target_collar_y - scaled_collar_center[1]

        # Torso length bias (if hips visible)
        if L_hip[2] > 0.5 and R_hip[2] > 0.5:
            hip_center = (L_hip[:2] + R_hip[:2]) / 2
            torso_length = np.linalg.norm(hip_center - shoulder_center)

            # Check if garment hem would be at correct height
            keypoints = gsm.get("keypoints", {})
            hem_keypoint = keypoints.get("hem_center", [0.5, 0.95])
            hem_y_norm = hem_keypoint[1]
            hem_y_px = hem_y_norm * garment_h * scale
            projected_hem_y = ty + hem_y_px

            target_hem_y = hip_center[1] + (gsm["body_offsets"]["torso_length_ratio"] * shoulder_width)

            # Adjust scale slightly to match torso length
            if abs(projected_hem_y - target_hem_y) > 10:  # More than 10px off
                scale_adjustment = target_hem_y / projected_hem_y
                scale *= np.clip(scale_adjustment, 0.95, 1.05)  # Max 5% adjustment

        return {
            "tx": tx,
            "ty": ty,
            "scale": scale,
            "rot": shoulder_angle
        }

    def _calculate_warp(
        self,
        L_shoulder: np.ndarray,
        R_shoulder: np.ndarray,
        L_hip: np.ndarray,
        R_hip: np.ndarray,
        gsm: Dict,
        similarity: Dict
    ) -> Dict:
        """Calculate non-rigid warp using TPS (Thin-Plate Spline) control points."""
        # Source control points (garment space, normalized 0-1)
        anchors = gsm["anchors"]
        keypoints = gsm.get("keypoints", {})

        src_ctrl = [
            anchors["collar_left"],
            anchors["collar_right"],
            keypoints.get("armpit_left", [0.2, 0.3]),
            keypoints.get("armpit_right", [0.8, 0.3]),
            keypoints.get("side_left", [0.25, 0.6]),
            keypoints.get("side_right", [0.75, 0.6]),
            keypoints.get("hem_center", [0.5, 0.95])
        ]

        # Target control points (video space, pixels)
        shoulder_center = (L_shoulder[:2] + R_shoulder[:2]) / 2
        shoulder_width = np.linalg.norm(R_shoulder[:2] - L_shoulder[:2])

        # Project targets
        dst_ctrl = [
            L_shoulder[:2].tolist(),  # collar_left → L_shoulder
            R_shoulder[:2].tolist(),  # collar_right → R_shoulder
            # Armpit targets (rough estimates)
            (L_shoulder[:2] + np.array([shoulder_width * 0.15, shoulder_width * 0.25])).tolist(),
            (R_shoulder[:2] + np.array([-shoulder_width * 0.15, shoulder_width * 0.25])).tolist(),
            # Side seams
            (L_shoulder[:2] + np.array([shoulder_width * 0.10, shoulder_width * 0.80])).tolist(),
            (R_shoulder[:2] + np.array([-shoulder_width * 0.10, shoulder_width * 0.80])).tolist(),
            # Hem center
            (shoulder_center + np.array([0, shoulder_width * 1.05])).tolist()
        ]

        # Convert to arrays
        src_ctrl = np.array(src_ctrl)
        dst_ctrl = np.array(dst_ctrl)

        # Normalize dst to garment space for TPS computation
        garment_w = gsm["image"]["w"]
        garment_h = gsm["image"]["h"]

        # Transform dst back to garment-relative coordinates
        # Inverse similarity: (dst - t) / scale
        dst_ctrl_norm = []
        for pt in dst_ctrl:
            # Apply inverse transform
            pt_rel = (pt - np.array([similarity["tx"], similarity["ty"]])) / similarity["scale"]
            pt_norm = pt_rel / np.array([garment_w, garment_h])
            dst_ctrl_norm.append(pt_norm.tolist())

        dst_ctrl_norm = np.array(dst_ctrl_norm)

        # Clamp warp magnitude (prevent extreme distortions)
        max_warp = 0.08  # 8% of garment dimensions
        for i in range(len(dst_ctrl_norm)):
            delta = dst_ctrl_norm[i] - src_ctrl[i]
            delta_mag = np.linalg.norm(delta)
            if delta_mag > max_warp:
                dst_ctrl_norm[i] = src_ctrl[i] + (delta / delta_mag) * max_warp

        return {
            "type": "tps",
            "src_ctrl": src_ctrl.tolist(),
            "dst_ctrl": dst_ctrl_norm.tolist()
        }

    def _calculate_occlusion(
        self,
        L_shoulder: np.ndarray,
        R_shoulder: np.ndarray,
        gsm: Dict
    ) -> Dict:
        """Calculate occlusion hints (neck clip ellipse)."""
        shoulder_center = (L_shoulder[:2] + R_shoulder[:2]) / 2
        shoulder_width = np.linalg.norm(R_shoulder[:2] - L_shoulder[:2])

        # Neck clip ellipse (in video pixels)
        neck_clip = {
            "center": shoulder_center.tolist(),
            "rx": float(shoulder_width * 0.20),  # 20% of shoulder width
            "ry": float(shoulder_width * 0.15)   # 15% of shoulder width
        }

        return {
            "neck_clip": neck_clip,
            "arm_over_shirt": {"left": False, "right": False}  # TODO: Implement arm detection
        }

    def _apply_ema(self, current: Dict, prev: Dict, alpha: float = 0.15) -> Dict:
        """Apply EMA smoothing to similarity transform."""
        smoothed = {}
        for key in current:
            if key in prev:
                smoothed[key] = alpha * current[key] + (1 - alpha) * prev[key]
            else:
                smoothed[key] = current[key]
        return smoothed

    def _apply_ema_warp(self, current: Dict, prev: Optional[Dict], alpha: float = 0.10) -> Dict:
        """Apply EMA smoothing to warp control points."""
        if prev is None or "dst_ctrl" not in prev:
            return current

        current_dst = np.array(current["dst_ctrl"])
        prev_dst = np.array(prev["dst_ctrl"])

        smoothed_dst = alpha * current_dst + (1 - alpha) * prev_dst

        return {
            "type": current["type"],
            "src_ctrl": current["src_ctrl"],
            "dst_ctrl": smoothed_dst.tolist()
        }


# Singleton instance
_solver = None


def get_solver() -> FitSolver:
    """Get singleton solver instance."""
    global _solver
    if _solver is None:
        _solver = FitSolver()
    return _solver
