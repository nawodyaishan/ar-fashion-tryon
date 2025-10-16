import { useCallback, useEffect, useRef, useState } from 'react';
import type { PoseLandmark } from './usePoseDetection';
import { type FitData, type PoseLandmarks, WSFitClient } from '@/lib/services/ws-fit-client';

interface UseWSFitSolverProps {
  gsmId: string | null;
  landmarks: PoseLandmark[] | null;
  enabled: boolean;
  wsUrl?: string;
}

/**
 * Hook for WebSocket-based fit solver
 * Connects to backend WebSocket API for real-time garment fitting
 */
export function useWSFitSolver({
  gsmId,
  landmarks,
  enabled,
  wsUrl = process.env.NEXT_PUBLIC_WS_FIT_URL ||
    'wss://ar-fashion-tryon-production.up.railway.app/ws/fit/top',
}: UseWSFitSolverProps) {
  const [fitResult, setFitResult] = useState<FitData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const clientRef = useRef<WSFitClient | null>(null);

  // Initialize and connect
  useEffect(() => {
    if (!enabled || !gsmId) {
      // Disconnect if disabled
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
        setIsConnected(false);
        setSessionId(null);
      }
      return;
    }

    // Create client
    const client = new WSFitClient(wsUrl, gsmId);
    clientRef.current = client;

    // Set up callbacks
    client.onConnect(() => {
      console.log('✅ Connected to fit solver');
      setIsConnected(true);
      setError(null);
      const status = client.getStatus();
      setSessionId(status.sessionId);
    });

    client.onDisconnect((reason) => {
      console.log('🔌 Disconnected:', reason);
      setIsConnected(false);
    });

    client.onFit((fit) => {
      setFitResult(fit);
    });

    client.onError((err) => {
      console.error('❌ Fit solver error:', err);
      setError(err);
    });

    // Connect
    client.connect().catch((err) => {
      console.error('Failed to connect:', err);
      setError('Failed to connect to fit solver');
    });

    // Cleanup on unmount
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
    };
  }, [enabled, gsmId, wsUrl]);

  // Update pose when landmarks change
  useEffect(() => {
    if (!enabled || !landmarks || landmarks.length < 33 || !clientRef.current || !isConnected) {
      return;
    }

    // Extract pose landmarks (MediaPipe indices)
    // 11=L_shoulder, 12=R_shoulder, 23=L_hip, 24=R_hip, 13=L_elbow, 15=R_elbow
    const pose: PoseLandmarks = {
      L_shoulder: [landmarks[11].x, landmarks[11].y, landmarks[11].visibility || 0],
      R_shoulder: [landmarks[12].x, landmarks[12].y, landmarks[12].visibility || 0],
      L_hip: [landmarks[23].x, landmarks[23].y, landmarks[23].visibility || 0],
      R_hip: [landmarks[24].x, landmarks[24].y, landmarks[24].visibility || 0],
      L_elbow: [landmarks[13].x, landmarks[13].y, landmarks[13].visibility || 0],
      R_elbow: [landmarks[15].x, landmarks[15].y, landmarks[15].visibility || 0],
    };

    // Update pose (client handles throttling/coalescing at 12 Hz)
    clientRef.current.updatePose(pose);
  }, [enabled, landmarks, isConnected]);

  // Manual disconnect
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
  }, []);

  // Set send frequency
  const setSendHz = useCallback((hz: number) => {
    if (clientRef.current) {
      clientRef.current.setSendHz(hz);
    }
  }, []);

  return {
    fitResult,
    isConnected,
    error,
    sessionId,
    disconnect,
    setSendHz,
  };
}
