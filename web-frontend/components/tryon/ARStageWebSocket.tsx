/**
 * ARStageWebSocket - Real-time WebSocket-driven AR try-on
 * Uses WebSocket for 2-3x lower latency vs HTTP polling
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, Eye, EyeOff, Wifi, WifiOff } from 'lucide-react';
import { useTryonStore } from '@/lib/tryon-store';
import { usePoseDetection } from '@/lib/hooks/usePoseDetection';
import { useWSFitSolver } from '@/lib/hooks/useWSFitSolver';
import { VideoPreview } from './VideoPreview';
import { PoseLandmarks } from './PoseLandmarks';
import { GarmentOverlayBackend as GarmentOverlay } from './GarmentOverlayBackend';
import { StatusFooter } from './StatusFooter';

export default function ARStageWebSocket() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    selectedGarmentId,
    garments,
    mediaPipeEnabled,
    landmarksVisible,
    toggleMediaPipe,
    toggleLandmarks,
    setPoseConfidence,
    setTransform
  } = useTryonStore();

  // Get selected garment
  const selectedGarment = garments.find(g => g.id === selectedGarmentId);
  const gsmId = selectedGarment?.gsmId || selectedGarment?.id || null;

  // MediaPipe Pose Detection
  const { landmarks, confidence, fps, isLoading, error: poseError } = usePoseDetection(
    mediaPipeEnabled ? videoRef.current : null,
    { modelComplexity: 'lite', minDetectionConfidence: 0.5 }
  );

  // WebSocket Fit Solver (NEW - replaces HTTP polling)
  const {
    fitResult,
    isConnected: wsConnected,
    error: wsError,
    sessionId,
    disconnect: wsDisconnect
  } = useWSFitSolver({
    gsmId,
    landmarks,
    enabled: mediaPipeEnabled && !!gsmId
  });

  // Update confidence in store
  useEffect(() => {
    if (mediaPipeEnabled && confidence > 0) {
      setPoseConfidence(confidence);
    }
  }, [confidence, mediaPipeEnabled, setPoseConfidence]);

  // Apply WebSocket transform to store (NEW)
  useEffect(() => {
    if (fitResult && fitResult.mode === 'tracking' && fitResult.similarity) {
      const { tx, ty, scale, rot } = fitResult.similarity;

      setTransform({
        x: tx,
        y: ty,
        scale,
        rotation: rot
      });

      // console.log('📐 WebSocket fit applied:', { tx, ty, scale, rot, qos: fitResult.qos });
    }
  }, [fitResult, setTransform]);

  // Track container dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      wsDisconnect();
    };
  }, [wsDisconnect]);

  const handleStreamReady = (mediaStream: MediaStream, video: HTMLVideoElement) => {
    videoRef.current = video;
    setStream(mediaStream);
    console.log('📹 Stream ready for WebSocket AR');
  };

  return (
    <Card className="relative w-full h-full min-h-[600px] bg-black">
      <div ref={containerRef} className="relative w-full h-full">
        {/* Video Feed */}
        <VideoPreview onStreamReady={handleStreamReady} />

        {/* Pose Landmarks (Debug) */}
        {mediaPipeEnabled && landmarksVisible && landmarks && (
          <PoseLandmarks
            landmarks={landmarks}
            width={dimensions.width}
            height={dimensions.height}
            visible={landmarksVisible}
          />
        )}

        {/* Garment Overlay (WebSocket-Driven Transform) */}
        {stream && selectedGarment && (
          <GarmentOverlay
            garmentSrc={selectedGarment.src}
            containerWidth={dimensions.width}
            containerHeight={dimensions.height}
            warpData={fitResult?.warp || null}
            occlusionData={fitResult?.occlusion || null}
          />
        )}

        {/* Floating Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
          <Button
            size="sm"
            variant={mediaPipeEnabled ? 'default' : 'secondary'}
            onClick={toggleMediaPipe}
            className="backdrop-blur-sm bg-black/30 hover:bg-black/50"
          >
            <Activity className="mr-2 h-4 w-4" />
            {mediaPipeEnabled ? 'MediaPipe ON' : 'MediaPipe OFF'}
          </Button>

          {mediaPipeEnabled && (
            <Button
              size="sm"
              variant="secondary"
              onClick={toggleLandmarks}
              className="backdrop-blur-sm bg-black/30 hover:bg-black/50"
            >
              {landmarksVisible ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              {landmarksVisible ? 'Hide' : 'Show'} Landmarks
            </Button>
          )}

          {/* WebSocket Status (NEW) */}
          {mediaPipeEnabled && gsmId && (
            <Badge
              variant="secondary"
              className={`backdrop-blur-sm ${wsConnected ? 'bg-green-500/80' : 'bg-red-500/80'} text-white`}
            >
              {wsConnected ? <Wifi className="mr-1 h-3 w-3" /> : <WifiOff className="mr-1 h-3 w-3" />}
              {wsConnected ? 'WS Connected' : 'WS Disconnected'}
            </Badge>
          )}

          {/* Session ID (Debug) */}
          {sessionId && process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-white/50 backdrop-blur-sm bg-black/30 px-2 py-1 rounded">
              Session: {sessionId.substring(0, 8)}
            </div>
          )}
        </div>

        {/* Status Footer with QoS */}
        <StatusFooter
          cameraActive={!!stream}
          mediaPipeActive={mediaPipeEnabled}
          fitting={fitResult?.mode === 'tracking'}
          confidence={fitResult?.confidence || 0}
          fps={fps}
          wsConnected={wsConnected}
          qos={fitResult?.qos}
        />

        {/* Loading/Error States */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
            <div className="text-white">Loading MediaPipe...</div>
          </div>
        )}

        {(poseError || wsError) && (
          <div className="absolute bottom-20 left-4 right-4 bg-red-500/90 text-white p-4 rounded z-30">
            {poseError || wsError}
          </div>
        )}

        {/* GSM ID Missing Warning */}
        {mediaPipeEnabled && selectedGarment && !gsmId && (
          <div className="absolute top-20 left-4 right-4 bg-yellow-500/90 text-white p-4 rounded z-30">
            ⚠️ Garment not processed for AR. Upload a new garment or select a processed one.
          </div>
        )}
      </div>
    </Card>
  );
}
