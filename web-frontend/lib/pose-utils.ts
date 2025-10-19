// lib/pose-utils.ts
import type { PoseLandmark } from './hooks/usePoseDetection';

// MediaPipe landmark indices
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_HIP: 23,
  RIGHT_HIP: 24
};

export interface ShoulderPosition {
  leftShoulder: { x: number; y: number };
  rightShoulder: { x: number; y: number };
  center: { x: number; y: number };
  width: number;
  angle: number; // Shoulder tilt in degrees
}

export function calculateShoulderPosition(
  landmarks: PoseLandmark[],
  containerWidth: number,
  containerHeight: number
): ShoulderPosition | null {
  if (!landmarks || landmarks.length < 33) return null;

  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

  // Check visibility
  if (!leftShoulder || !rightShoulder ||
      (leftShoulder.visibility || 0) < 0.5 ||
      (rightShoulder.visibility || 0) < 0.5) {
    return null;
  }

  // Convert normalized coordinates to pixels
  const left = {
    x: leftShoulder.x * containerWidth,
    y: leftShoulder.y * containerHeight
  };

  const right = {
    x: rightShoulder.x * containerWidth,
    y: rightShoulder.y * containerHeight
  };

  // Calculate center point
  const center = {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2
  };

  // Calculate shoulder width
  const width = Math.sqrt(
    Math.pow(right.x - left.x, 2) + Math.pow(right.y - left.y, 2)
  );

  // Calculate shoulder angle (for rotation)
  // Note: Landmarks are already flipped in usePoseDetection (x: 1 - l.x)
  // This flip naturally reverses the angle direction, so no negation needed
  const angle = Math.atan2(right.y - left.y, right.x - left.x) * (180 / Math.PI);

  // Clamp angle to reasonable range (-45° to +45°)
  const clampedAngle = Math.max(-45, Math.min(45, angle));

  return {
    leftShoulder: left,
    rightShoulder: right,
    center,
    width,
    angle: clampedAngle
  };
}

export interface GarmentSuggestion {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export function calculateGarmentPosition(
  shoulderPos: ShoulderPosition,
  baseGarmentWidth: number = 200
): GarmentSuggestion {
  // Calculate scale based on shoulder width
  // Garment should be ~90% of shoulder width for better fit (reduced from 120%)
  const targetWidth = shoulderPos.width * 0.9;
  const scale = Math.max(0.5, Math.min(1.5, targetWidth / baseGarmentWidth)); // Clamp scale for safety

  // Position garment centered on shoulders, slightly below
  const x = shoulderPos.center.x - (baseGarmentWidth * scale) / 2;
  const y = shoulderPos.center.y - (baseGarmentWidth * scale * 0.15); // Offset upward slightly

  return {
    x,
    y,
    scale,
    rotation: shoulderPos.angle
  };
}

export function isConfidentPose(landmarks: PoseLandmark[]): boolean {
  if (!landmarks || landmarks.length < 33) return false;

  const criticalLandmarks = [
    POSE_LANDMARKS.LEFT_SHOULDER,
    POSE_LANDMARKS.RIGHT_SHOULDER,
    POSE_LANDMARKS.LEFT_HIP,
    POSE_LANDMARKS.RIGHT_HIP
  ];

  const visibleCount = criticalLandmarks.filter(idx =>
    (landmarks[idx]?.visibility || 0) > 0.5
  ).length;

  return visibleCount >= 3; // At least 3 out of 4 critical points visible
}
