// lib/pose-utils.ts
import type { PoseLandmark } from './hooks/usePoseDetection';
import type { Garment, Transform } from './types';

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
  garment: Garment,
  containerWidth: number,
  containerHeight: number,
  baseGarmentWidth: number = 200
): GarmentSuggestion | Transform {
  // Try keypoint-based positioning first if available
  if (garment.keypoints && garment.keypoints.detectionConfidence >= 0.5) {
    const keypointTransform = calculateGarmentPositionWithKeypoints(
      shoulderPos,
      garment,
      containerWidth,
      containerHeight
    );
    if (keypointTransform) {
      console.log('🎯 Using keypoint positioning');
      return keypointTransform;
    }
  }

  // Fallback to simple positioning (existing algorithm)
  console.log('📐 Using simple positioning (no keypoints or low confidence)');

  // Calculate scale based on shoulder width
  // Garment should be 180% of shoulder width (2x increase from 90%)
  const targetWidth = shoulderPos.width * 1.8;
  const scale = Math.max(0.5, Math.min(3.0, targetWidth / baseGarmentWidth)); // Clamp scale increased to 3.0

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

/**
 * Calculate garment position using detected keypoints
 * Provides PRECISE alignment by matching garment shoulder seams to body shoulders
 */
export function calculateGarmentPositionWithKeypoints(
  shoulderPos: ShoulderPosition,
  garment: Garment,
  containerWidth: number,
  containerHeight: number,
): Transform | null {
  // Validate inputs
  if (!garment.keypoints) {
    console.warn('⚠️ Garment has no keypoint data');
    return null;
  }

  const keypoints = garment.keypoints;

  // Check keypoint confidence
  const MIN_CONFIDENCE = 0.5;
  if (keypoints.detectionConfidence < MIN_CONFIDENCE) {
    console.warn(
      `⚠️ Low keypoint confidence: ${keypoints.detectionConfidence.toFixed(2)} < ${MIN_CONFIDENCE}`,
    );
    return null;
  }

  // Body shoulder data (already in pixels)
  const bodyCenter = shoulderPos.center;
  const bodyWidth = shoulderPos.width;
  const bodyAngle = shoulderPos.angle;

  // Garment keypoint data (convert normalized to pixels)
  const garmentCenter = {
    x: keypoints.shoulderCenter.x * garment.width,
    y: keypoints.shoulderCenter.y * garment.height,
  };
  const garmentWidth = keypoints.shoulderWidth;
  const garmentAngle = keypoints.shoulderAngle;

  // Calculate scale
  const scale = Math.max(0.5, Math.min(2.0, bodyWidth / garmentWidth));

  // Calculate position
  const scaledCenter = {
    x: garmentCenter.x * scale,
    y: garmentCenter.y * scale,
  };

  const position = {
    x: bodyCenter.x - scaledCenter.x,
    y: bodyCenter.y - scaledCenter.y,
  };

  // Calculate rotation
  const rotation = Math.max(-45, Math.min(45, bodyAngle - garmentAngle));

  console.log('✨ Keypoint transform:', {
    scale: scale.toFixed(2),
    rotation: rotation.toFixed(1),
    position: { x: Math.round(position.x), y: Math.round(position.y) },
  });

  return {
    x: Math.round(position.x),
    y: Math.round(position.y),
    scale,
    rotation,
    opacity: 90,
    lockAspect: true,
  };
}

export function isConfidentPose(landmarks: PoseLandmark[]): boolean {
  if (!landmarks || landmarks.length < 33) return false;

  const criticalLandmarks = [
    POSE_LANDMARKS.LEFT_SHOULDER,
    POSE_LANDMARKS.RIGHT_SHOULDER,
    POSE_LANDMARKS.LEFT_HIP,
    POSE_LANDMARKS.RIGHT_HIP,
  ];

  const visibleCount = criticalLandmarks.filter(
    (idx) => (landmarks[idx]?.visibility || 0) > 0.5,
  ).length;

  return visibleCount >= 3; // At least 3 out of 4 critical points visible
}
