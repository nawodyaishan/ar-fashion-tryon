import { useEffect, useRef, useState, useCallback } from 'react';
import type { PoseLandmark } from './usePoseDetection';
import { FitClient, type FitResponse, type PoseLandmarks } from '@/lib/services/fit-client';

interface UseFitSolverProps {
  gsmId: string | null;
  landmarks: PoseLandmark[] | null;
  enabled: boolean;
  apiBaseUrl?: string;
}

export function useFitSolver({
  gsmId,
  landmarks,
  enabled,
  apiBaseUrl = process.env.NEXT_PUBLIC_GARMENT_API_BASE || 'http://localhost:5000'
}: UseFitSolverProps) {
  const [fitResult, setFitResult] = useState<FitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fitClientRef = useRef<FitClient | null>(null);

  // Initialize FitClient
  useEffect(() => {
    if (enabled && !fitClientRef.current) {
      fitClientRef.current = new FitClient(apiBaseUrl);
      console.log('✅ FitClient initialized:', apiBaseUrl);
    }

    return () => {
      if (fitClientRef.current && !enabled) {
        fitClientRef.current.reset();
        fitClientRef.current = null;
      }
    };
  }, [enabled, apiBaseUrl]);

  // Process landmarks and send to backend
  useEffect(() => {
    if (!enabled || !gsmId || !landmarks || landmarks.length < 33 || !fitClientRef.current) {
      return;
    }

    // Extract pose landmarks (MediaPipe indices)
    // MediaPipe Pose: 11=L_shoulder, 12=R_shoulder, 23=L_hip, 24=R_hip
    const pose: PoseLandmarks = {
      L_shoulder: [
        landmarks[11].x,
        landmarks[11].y,
        landmarks[11].visibility || 0
      ],
      R_shoulder: [
        landmarks[12].x,
        landmarks[12].y,
        landmarks[12].visibility || 0
      ],
      L_hip: [
        landmarks[23].x,
        landmarks[23].y,
        landmarks[23].visibility || 0
      ],
      R_hip: [
        landmarks[24].x,
        landmarks[24].y,
        landmarks[24].visibility || 0
      ],
      L_elbow: [
        landmarks[13].x,
        landmarks[13].y,
        landmarks[13].visibility || 0
      ],
      R_elbow: [
        landmarks[15].x,
        landmarks[15].y,
        landmarks[15].visibility || 0
      ]
    };

    // Send to backend (automatically throttled to 10 Hz)
    fitClientRef.current.getFit(gsmId, pose).then(result => {
      if (result) {
        setFitResult(result);
        setError(null);
      }
    }).catch(err => {
      console.error('useFitSolver: Error', err);
      setError(err.message);
    });

  }, [enabled, gsmId, landmarks]);

  // Reset when garment changes
  const reset = useCallback(() => {
    if (fitClientRef.current) {
      fitClientRef.current.reset();
      setFitResult(null);
      setError(null);
      console.log('🔄 FitClient reset');
    }
  }, []);

  return {
    fitResult,
    error,
    reset
  };
}
