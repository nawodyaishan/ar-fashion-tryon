/**
 * Backend-Driven AR Stage
 * All fitting logic handled by backend - no gestures, no manual controls
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Eye, EyeOff } from 'lucide-react';
import { useTryonStore } from '@/lib/tryon-store';
import { usePoseDetection } from '@/lib/hooks/usePoseDetection';
import { useFitSolver } from '@/lib/hooks/useFitSolver';
import { VideoPreview } from './VideoPreview';
import { PoseLandmarks } from './PoseLandmarks';
import { GarmentOverlay } from './GarmentOverlay';
import { StatusFooter } from './StatusFooter';

export default function ARStageBackend() {
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
  const gsmId = selectedGarment?.gsmId || null;

  // MediaPipe Pose Detection
  const { landmarks, confidence, fps, isLoading, error } = usePoseDetection(
    mediaPipeEnabled ? videoRef.current : null,
    { modelComplexity: 'lite', minDetectionConfidence: 0.5 }
  );

  // Backend Fit Solver (NEW - replaces all manual logic)
  const { fitResult, reset: resetFit } = useFitSolver({
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

  // Apply backend transform to store (NEW)
  useEffect(() => {
    if (fitResult && fitResult.mode === 'tracking' && fitResult.similarity) {
      const { tx, ty, scale, rot } = fitResult.similarity;

      setTransform({
        tx,
        ty,
        scale,
        rotation: rot
      });

      console.log('📐 Backend fit applied:', { tx, ty, scale, rot });
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

  // Reset fit when garment changes
  useEffect(() => {
    resetFit();
  }, [selectedGarmentId, resetFit]);

  const handleStreamReady = (mediaStream: MediaStream, video: HTMLVideoElement) => {
    videoRef.current = video;
    setStream(mediaStream);
    console.log('📹 Stream ready');
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

        {/* Garment Overlay (Backend-Driven Transform) */}
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
        <div className="absolute top-4 right-4 flex flex-col gap-2">
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
        </div>

        {/* Status Footer */}
        <StatusFooter
          cameraActive={!!stream}
          mediaPipeActive={mediaPipeEnabled}
          fitting={fitResult?.mode === 'tracking'}
          confidence={fitResult?.confidence || 0}
          fps={fps}
        />

        {/* Loading/Error States */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white">Loading MediaPipe...</div>
          </div>
        )}

        {error && (
          <div className="absolute bottom-20 left-4 right-4 bg-red-500/90 text-white p-4 rounded">
            {error}
          </div>
        )}

        {/* GSM ID Missing Warning */}
        {mediaPipeEnabled && selectedGarment && !gsmId && (
          <div className="absolute top-20 left-4 right-4 bg-yellow-500/90 text-white p-4 rounded">
            ⚠️ Garment not processed for AR. Upload a new garment or select a processed one.
          </div>
        )}
      </div>
    </Card>
  );
}
