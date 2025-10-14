// components/tryon/ARStage.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { VideoPreview } from './VideoPreview';
import { GarmentOverlay } from './GarmentOverlay';
import { PoseLandmarks } from './PoseLandmarks';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { AutoAlignButton } from './AutoAlignButton';
import { ContinuousTracker } from './ContinuousTracker';
import { StatusPill } from './StatusPill';
import { GestureEditor } from './GestureEditor';
import { WelcomeGuide } from './WelcomeGuide';
import { CameraPermissionDialog } from './CameraPermissionDialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, X, Hand } from 'lucide-react';
import { useTryonStore } from '@/lib/tryon-store';
import { usePoseDetection } from '@/lib/hooks/usePoseDetection';
import { useOnboarding } from '@/lib/hooks/useOnboarding';
import { TransformFilter, HysteresisGate } from '@/lib/filtering';
import { calculateShoulderPosition, calculateGarmentPosition, calculateAnchorBasedPosition } from '@/lib/pose-utils';
import { loadGarmentMetadata, loadLocalMetadata } from '@/lib/services/metadata';
import type { GarmentMetadata } from '@/lib/types';

export default function ARStage() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });
  const [currentMetadata, setCurrentMetadata] = useState<GarmentMetadata | null>(null);
  const [handsEnabled, setHandsEnabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Onboarding state
  const {
    showWelcomeGuide,
    showCameraPermission,
    markOnboardingComplete,
    markCameraPermissionRequested
  } = useOnboarding();

  const {
    selectedGarmentId,
    garments,
    mediaPipeEnabled,
    landmarksVisible,
    toggleLandmarks,
    setPoseConfidence,
    // NEW: Dual transform state and actions
    tracked,
    userDelta,
    final,
    mode,
    setTracked,
    filterEnabled
  } = useTryonStore();

  const selectedGarment = garments.find((g) => g.id === selectedGarmentId);

  // NEW: Persistent filters (across renders)
  const transformFilterRef = useRef<TransformFilter>(new TransformFilter(0.15, 0.10, 0.10));
  const hysteresisGateRef = useRef<HysteresisGate>(new HysteresisGate(0.70, 0.55));

  // MediaPipe pose detection
  const {
    landmarks,
    confidence,
    fps,
    isLoading: mediaPipeLoading,
    error: mediaPipeError
  } = usePoseDetection(
    mediaPipeEnabled ? videoRef.current : null,
    {
      modelComplexity: 'lite', // Use lite for real-time performance
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    }
  );

  // Update confidence in store
  useEffect(() => {
    if (mediaPipeEnabled) {
      setPoseConfidence(confidence);
    }
  }, [confidence, mediaPipeEnabled, setPoseConfidence]);

  // NEW: Load metadata when garment changes
  useEffect(() => {
    if (!selectedGarmentId) {
      setCurrentMetadata(null);
      return;
    }

    // Try local storage first, then fetch from server
    const localMeta = loadLocalMetadata(selectedGarmentId);
    if (localMeta) {
      setCurrentMetadata(localMeta);
      return;
    }

    // Load from server
    loadGarmentMetadata(selectedGarmentId).then(setCurrentMetadata);
  }, [selectedGarmentId]);

  // NEW: Update tracked transform when pose changes
  useEffect(() => {
    if (mode !== 'AutoTrack' || !landmarks || !mediaPipeEnabled) return;

    // Check hysteresis gate
    const shouldTrack = hysteresisGateRef.current.update(confidence);
    if (!shouldTrack) return;

    // Calculate raw shoulder position
    const shoulderPos = calculateShoulderPosition(landmarks, dimensions.width, dimensions.height);
    if (!shoulderPos) return;

    // Calculate raw garment position
    // NEW: Use anchor-based calculation if metadata available, otherwise fall back to legacy
    const rawGarmentPos = currentMetadata
      ? calculateAnchorBasedPosition(shoulderPos, currentMetadata, dimensions.width, dimensions.height)
      : calculateGarmentPosition(shoulderPos);

    // Apply filter if enabled
    const filteredPos = filterEnabled
      ? transformFilterRef.current.filter({
          x: rawGarmentPos.x,
          y: rawGarmentPos.y,
          scale: rawGarmentPos.scale,
          rotation: rawGarmentPos.rotation
        })
      : rawGarmentPos;

    // Update tracked transform (composition happens automatically in store)
    setTracked(filteredPos);

  }, [landmarks, confidence, mode, dimensions, filterEnabled, setTracked, mediaPipeEnabled, currentMetadata]);

  // Get container dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleStreamReady = (mediaStream: MediaStream, video: HTMLVideoElement) => {
    console.log('📹 Stream ready for overlay and pose detection');
    setStream(mediaStream);
    videoRef.current = video;
  };

  // Onboarding handlers
  const handleWelcomeGuideClose = () => {
    markOnboardingComplete();
  };

  const handleRequestCamera = () => {
    // This will trigger the camera permission dialog
    markCameraPermissionRequested();
  };

  const handleCameraPermissionGranted = () => {
    console.log('✅ Camera permission granted, enabling MediaPipe');
    // Auto-enable MediaPipe when camera permission is granted
    if (!useTryonStore.getState().mediaPipeEnabled) {
      useTryonStore.getState().toggleMediaPipe();
    }
  };

  return (
    <>
      {/* Onboarding Modals */}
      <WelcomeGuide
        open={showWelcomeGuide}
        onClose={handleWelcomeGuideClose}
        onRequestCamera={handleRequestCamera}
      />

      <CameraPermissionDialog
        open={showCameraPermission}
        onClose={() => markCameraPermissionRequested()}
        onPermissionGranted={handleCameraPermissionGranted}
      />

      {/* Main AR Stage */}
    <Card className="relative w-full h-full min-h-[600px] overflow-hidden bg-black/20 backdrop-blur-sm">
      <div ref={containerRef} className="relative w-full h-full">
        {/* Continuous Tracker - tracks pose when enabled */}
        {mediaPipeEnabled && (
          <ContinuousTracker
            landmarks={landmarks}
            containerWidth={dimensions.width}
            containerHeight={dimensions.height}
            metadata={currentMetadata}
            enabled={mode === 'AutoTrack'}
          />
        )}

        {/* Video Background */}
        <VideoPreview
          onStreamReady={handleStreamReady}
          className="w-full h-full"
        />

        {/* Pose Landmarks Overlay */}
        {mediaPipeEnabled && stream && (
          <PoseLandmarks
            landmarks={landmarks}
            width={dimensions.width}
            height={dimensions.height}
            visible={landmarksVisible}
          />
        )}

        {/* NEW: Gesture Editor */}
        {handsEnabled && stream && (
          <GestureEditor
            videoElement={videoRef.current}
            containerWidth={dimensions.width}
            containerHeight={dimensions.height}
            enabled={handsEnabled}
          />
        )}

        {/* Garment Overlay (positioned absolutely over video) */}
        {stream && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="relative w-full h-full pointer-events-auto">
              <GarmentOverlay
                containerWidth={dimensions.width}
                containerHeight={dimensions.height}
                transform={final}
              />
            </div>
          </div>
        )}

        {/* Floating Controls */}
        {stream && (
          <div className="absolute top-4 right-4 space-y-2">
            {/* Auto-Align Button - only show when MediaPipe enabled and garment selected */}
            {mediaPipeEnabled && selectedGarment && (
              <AutoAlignButton
                landmarks={landmarks}
                containerWidth={dimensions.width}
                containerHeight={dimensions.height}
                disabled={mediaPipeLoading || !!mediaPipeError}
              />
            )}

            {/* Landmarks Visibility Toggle */}
            {mediaPipeEnabled && (
              <Button
                size="sm"
                variant="secondary"
                onClick={toggleLandmarks}
                className="backdrop-blur-sm bg-black/30 hover:bg-black/50"
              >
                {landmarksVisible ? (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Hide Landmarks
                  </>
                ) : (
                  <>
                    <Target className="mr-2 h-4 w-4" />
                    Show Landmarks
                  </>
                )}
              </Button>
            )}

            {/* NEW: Hands Detection Toggle */}
            <Button
              size="sm"
              variant={handsEnabled ? 'default' : 'secondary'}
              onClick={() => setHandsEnabled(!handsEnabled)}
              className={handsEnabled
                ? 'backdrop-blur-sm bg-blue-600 hover:bg-blue-700'
                : 'backdrop-blur-sm bg-black/30 hover:bg-black/50'
              }
            >
              <Hand className="mr-2 h-4 w-4" />
              {handsEnabled ? 'Hands ON' : 'Hands OFF'}
            </Button>
          </div>
        )}

        {/* Status Displays */}
        <div className="absolute bottom-4 left-4 space-y-2">
          {/* Camera Status */}
          <div className="text-xs text-white/70 bg-black/30 backdrop-blur-sm px-2 py-1 rounded">
            {stream ? '✅ Camera Active' : '⏳ Waiting for camera...'}
          </div>

          {/* Garment Info */}
          {selectedGarment && (
            <div className="text-xs text-white/70 bg-black/30 backdrop-blur-sm px-2 py-1 rounded">
              👕 {selectedGarment.name}
            </div>
          )}

          {/* NEW: Status Pill - shows current mode */}
          {mediaPipeEnabled && !mediaPipeLoading && !mediaPipeError && (
            <StatusPill mode={mode} confidence={confidence} fps={fps} />
          )}

          {/* MediaPipe Status */}
          {mediaPipeEnabled && (
            <>
              {mediaPipeLoading && (
                <div className="text-xs text-yellow-500 bg-black/30 backdrop-blur-sm px-2 py-1 rounded">
                  ⏳ Loading MediaPipe...
                </div>
              )}
              {mediaPipeError && (
                <div className="text-xs text-red-500 bg-black/30 backdrop-blur-sm px-2 py-1 rounded">
                  ❌ {mediaPipeError}
                </div>
              )}
              {!mediaPipeLoading && !mediaPipeError && (
                <ConfidenceIndicator
                  confidence={confidence}
                  fps={fps}
                />
              )}
            </>
          )}
        </div>
      </div>
    </Card>
    </>
  );
}
