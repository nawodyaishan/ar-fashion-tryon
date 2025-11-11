// components/tryon/ContinuousTracker.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useTryonStore } from '@/lib/tryon-store';
import { calculateShoulderPosition, calculateGarmentPosition, isConfidentPose } from '@/lib/pose-utils';
import type { PoseLandmark } from '@/lib/hooks/usePoseDetection';

interface ContinuousTrackerProps {
  landmarks: PoseLandmark[] | null;
  containerWidth: number;
  containerHeight: number;
}

export function ContinuousTracker({
  landmarks,
  containerWidth,
  containerHeight
}: ContinuousTrackerProps) {
  const { continuousTracking, autoAlignGarment, selectedGarmentId, lockScale, garments } = useTryonStore();
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    if (!continuousTracking || !landmarks || !selectedGarmentId) return;

    // Throttle updates to 10 FPS (100ms intervals)
    const now = Date.now();
    if (now - lastUpdateRef.current < 100) return;

    if (!isConfidentPose(landmarks)) return;

    const shoulderPos = calculateShoulderPosition(landmarks, containerWidth, containerHeight);
    if (!shoulderPos) return;

    // Get the selected garment
    const selectedGarment = garments.find(g => g.id === selectedGarmentId);
    if (!selectedGarment) return;

    const garmentSuggestion = calculateGarmentPosition(
      shoulderPos,
      selectedGarment,
      containerWidth,
      containerHeight
    );

    autoAlignGarment(
      garmentSuggestion.x,
      garmentSuggestion.y,
      garmentSuggestion.scale,
      garmentSuggestion.rotation
    );

    lastUpdateRef.current = now;
  }, [landmarks, containerWidth, containerHeight, continuousTracking, autoAlignGarment, selectedGarmentId, lockScale, garments]);

  return null; // No UI, just side effects
}
