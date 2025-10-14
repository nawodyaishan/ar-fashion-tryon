import type { HandLandmark } from '@/lib/hooks/useHandsDetection';
import type { PinchData } from './types';

/**
 * Calculate pinch center in pixel coordinates
 */
export function calculatePinchCenter(
  landmarks: HandLandmark[],
  containerWidth: number,
  containerHeight: number
): { x: number; y: number } {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];

  return {
    x: ((thumbTip.x + indexTip.x) / 2) * containerWidth,
    y: ((thumbTip.y + indexTip.y) / 2) * containerHeight
  };
}

/**
 * Extract active pinches from hand detection result
 */
export function extractPinches(
  hands: { left: HandLandmark[] | null; right: HandLandmark[] | null; leftPinching: boolean; rightPinching: boolean },
  containerWidth: number,
  containerHeight: number
): PinchData[] {
  const pinches: PinchData[] = [];

  if (hands.leftPinching && hands.left) {
    pinches.push({
      center: calculatePinchCenter(hands.left, containerWidth, containerHeight),
      active: true,
      hand: 'left'
    });
  }

  if (hands.rightPinching && hands.right) {
    pinches.push({
      center: calculatePinchCenter(hands.right, containerWidth, containerHeight),
      active: true,
      hand: 'right'
    });
  }

  return pinches;
}

/**
 * Calculate distance between two pinches
 */
export function pinchDistance(p1: PinchData, p2: PinchData): number {
  return Math.sqrt(
    Math.pow(p2.center.x - p1.center.x, 2) +
    Math.pow(p2.center.y - p1.center.y, 2)
  );
}

/**
 * Calculate angle between two pinches (in degrees)
 */
export function pinchAngle(p1: PinchData, p2: PinchData): number {
  return Math.atan2(p2.center.y - p1.center.y, p2.center.x - p1.center.x) * (180 / Math.PI);
}

/**
 * Calculate midpoint between two pinches
 */
export function pinchMidpoint(p1: PinchData, p2: PinchData): { x: number; y: number } {
  return {
    x: (p1.center.x + p2.center.x) / 2,
    y: (p1.center.y + p2.center.y) / 2
  };
}
