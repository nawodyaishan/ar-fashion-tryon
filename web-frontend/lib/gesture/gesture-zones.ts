/**
 * Gesture zones for hand detection
 * Prevents false positives from hands in center (near garment)
 */

export interface GestureZone {
  left: { x: number; width: number };  // Left zone (0-35% of screen)
  right: { x: number; width: number }; // Right zone (65-100% of screen)
}

/**
 * Calculate gesture zones based on container dimensions
 * Left zone: 0-35% of width
 * Right zone: 65-100% of width
 * Center: 35-65% (excluded to avoid garment interference)
 */
export function calculateGestureZones(containerWidth: number): GestureZone {
  return {
    left: {
      x: 0,
      width: containerWidth * 0.35  // Left 35%
    },
    right: {
      x: containerWidth * 0.65,     // Start at 65%
      width: containerWidth * 0.35  // Right 35%
    }
  };
}

/**
 * Check if a point is inside a gesture zone (left or right)
 */
export function isInGestureZone(
  point: { x: number; y: number },
  zones: GestureZone
): boolean {
  const inLeftZone = point.x >= zones.left.x && point.x <= zones.left.width;
  const inRightZone = point.x >= zones.right.x && point.x <= (zones.right.x + zones.right.width);

  return inLeftZone || inRightZone;
}

/**
 * Filter pinches to only those in gesture zones
 * This prevents accidental gesture detection when hands are near the garment
 */
export function filterPinchesByZone<T extends { center: { x: number; y: number } }>(
  pinches: T[],
  zones: GestureZone
): T[] {
  return pinches.filter(pinch => isInGestureZone(pinch.center, zones));
}
