// lib/pose-utils.ts
import type { PoseLandmark } from './hooks/usePoseDetection';
import type { GarmentMetadata } from './types';

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
  // Garment should be ~120% of shoulder width for natural fit
  const targetWidth = shoulderPos.width * 1.2;
  const scale = targetWidth / baseGarmentWidth;

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

/**
 * NEW: Calculate garment position using anchor metadata
 * This is the core of the "snap-to-shoulders" system
 */
export function calculateAnchorBasedPosition(
  shoulderPos: ShoulderPosition,
  metadata: GarmentMetadata,
  containerWidth: number,
  _containerHeight: number // Reserved for future hem-based adjustments
): GarmentSuggestion {
  const { anchors, body_offsets, width: garmentWidth, height: garmentHeight } = metadata;

  // 1. Calculate garment collar points in pixels
  const garmentCollarLeft = {
    x: anchors.collar_left[0] * garmentWidth,
    y: anchors.collar_left[1] * garmentHeight
  };

  const garmentCollarRight = {
    x: anchors.collar_right[0] * garmentWidth,
    y: anchors.collar_right[1] * garmentHeight
  };

  // 2. Garment collar distance
  const garmentCollarDist = Math.sqrt(
    Math.pow(garmentCollarRight.x - garmentCollarLeft.x, 2) +
    Math.pow(garmentCollarRight.y - garmentCollarLeft.y, 2)
  );

  // 3. Calculate scale: map garment collar to shoulder width (with 110% ease)
  const shoulderWidth = shoulderPos.width;
  const targetCollarWidth = shoulderWidth * 1.10;
  const scale = targetCollarWidth / garmentCollarDist;

  // Clamp scale to reasonable bounds
  const clampedScale = Math.max(0.35, Math.min(2.8, scale));

  // 4. Calculate rotation from shoulder angle
  let rotation = shoulderPos.angle;

  // Clamp rotation if low confidence
  if (shoulderPos.width < containerWidth * 0.15) { // Heuristic for distance
    rotation = Math.max(-45, Math.min(45, rotation));
  }

  // 5. Calculate garment collar midpoint
  const garmentCollarMid = {
    x: (garmentCollarLeft.x + garmentCollarRight.x) / 2,
    y: (garmentCollarLeft.y + garmentCollarRight.y) / 2
  };

  // 6. Calculate where collar midpoint should be (shoulders + neck drop)
  const neckDrop = body_offsets.neck_drop_ratio * shoulderWidth;
  const targetCollarY = shoulderPos.center.y + neckDrop;

  // 7. Calculate top-left position of garment image
  // (We need to place the image such that the collar midpoint lands at targetCollarY)
  const scaledCollarMid = {
    x: garmentCollarMid.x * clampedScale,
    y: garmentCollarMid.y * clampedScale
  };

  const x = shoulderPos.center.x - scaledCollarMid.x;
  const y = targetCollarY - scaledCollarMid.y;

  // 8. Optional: Torso length bias (if hem_center provided and hips visible)
  // TODO: Implement hem adjustment when both shoulders and hips are visible
  // For now, we just use collar alignment

  return {
    x: Math.round(x),
    y: Math.round(y),
    scale: clampedScale,
    rotation: Math.round(rotation)
  };
}
