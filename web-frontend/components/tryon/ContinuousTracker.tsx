// components/tryon/ContinuousTracker.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useTryonStore } from '@/lib/tryon-store';
import { calculateShoulderPosition, calculateAnchorBasedPosition, calculateGarmentPosition, isConfidentPose } from '@/lib/pose-utils';
import type { PoseLandmark } from '@/lib/hooks/usePoseDetection';
import type { GarmentMetadata } from '@/lib/types';

interface ContinuousTrackerProps {
  landmarks: PoseLandmark[] | null;
  containerWidth: number;
  containerHeight: number;
  metadata: GarmentMetadata | null;
  enabled: boolean;
}

export function ContinuousTracker({
  landmarks,
  containerWidth,
  containerHeight,
  metadata,
  enabled
}: ContinuousTrackerProps) {
  const { mode, setTracked, selectedGarmentId } = useTryonStore();
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    // CRITICAL: Only run if enabled, in AutoTrack mode, and have required data
    if (!enabled || mode !== 'AutoTrack' || !landmarks || !selectedGarmentId) {
      return;
    }

    // Throttle updates to 15 FPS (~67ms intervals)
    const now = Date.now();
    if (now - lastUpdateRef.current < 67) return;

    // Check for confident pose
    if (!isConfidentPose(landmarks)) {
      return;
    }

    // Calculate shoulder position
    const shoulderPos = calculateShoulderPosition(landmarks, containerWidth, containerHeight);
    if (!shoulderPos) return;

    // CRITICAL FIX: Use anchor-based positioning if metadata available, else fallback
    const garmentSuggestion = metadata
      ? calculateAnchorBasedPosition(shoulderPos, metadata, containerWidth, containerHeight)
      : calculateGarmentPosition(shoulderPos);

    // Update tracked transform (part of dual transform system)
    setTracked({
      x: garmentSuggestion.x,
      y: garmentSuggestion.y,
      scale: garmentSuggestion.scale,
      rotation: garmentSuggestion.rotation
    });

    lastUpdateRef.current = now;
  }, [landmarks, containerWidth, containerHeight, enabled, mode, selectedGarmentId, metadata, setTracked]);

  return null; // No UI, just side effects
}
