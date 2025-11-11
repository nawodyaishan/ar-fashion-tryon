// components/tryon/AutoAlignButton.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Target, Loader2, CheckCircle2 } from 'lucide-react';
import { useTryonStore } from '@/lib/tryon-store';
import { calculateShoulderPosition, calculateGarmentPosition, isConfidentPose } from '@/lib/pose-utils';
import type { PoseLandmark } from '@/lib/hooks/usePoseDetection';
import { toast } from 'sonner';

interface AutoAlignButtonProps {
  landmarks: PoseLandmark[] | null;
  containerWidth: number;
  containerHeight: number;
  disabled?: boolean;
}

export function AutoAlignButton({
  landmarks,
  containerWidth,
  containerHeight,
  disabled
}: AutoAlignButtonProps) {
  const { autoAlignGarment, selectedGarmentId, garments } = useTryonStore();
  const [isAligning, setIsAligning] = useState(false);
  const [justAligned, setJustAligned] = useState(false);

  const canAutoAlign = landmarks && isConfidentPose(landmarks) && selectedGarmentId;

  const handleAutoAlign = () => {
    if (!landmarks || !canAutoAlign) {
      toast.error('No confident pose detected. Please face the camera with shoulders visible.');
      return;
    }

    setIsAligning(true);

    // Slight delay for visual feedback
    setTimeout(() => {
      const shoulderPos = calculateShoulderPosition(landmarks, containerWidth, containerHeight);

      if (!shoulderPos) {
        toast.error('Could not detect shoulders. Please adjust your position.');
        setIsAligning(false);
        return;
      }

      // Get the selected garment
      const selectedGarment = garments.find(g => g.id === selectedGarmentId);
      if (!selectedGarment) {
        toast.error('No garment selected');
        setIsAligning(false);
        return;
      }

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

      setIsAligning(false);
      setJustAligned(true);

      // Enhanced success message
      if (selectedGarment.keypoints && selectedGarment.keypoints.detectionConfidence >= 0.5) {
        toast.success('🎯 Garment aligned using keypoint detection');
      } else {
        toast.success('Garment aligned to shoulders');
      }
    }, 300);
  };

  // Reset "just aligned" state after 2 seconds
  useEffect(() => {
    if (justAligned) {
      const timer = setTimeout(() => setJustAligned(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [justAligned]);

  return (
    <Button
      onClick={handleAutoAlign}
      disabled={disabled || !canAutoAlign || isAligning}
      variant={justAligned ? "default" : "secondary"}
      size="sm"
      className="backdrop-blur-sm bg-black/30 hover:bg-black/50"
    >
      {isAligning ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Aligning...
        </>
      ) : justAligned ? (
        <>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Aligned!
        </>
      ) : (
        <>
          <Target className="mr-2 h-4 w-4" />
          Auto-Align
        </>
      )}
    </Button>
  );
}
