'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTryonStore } from '@/lib/tryon-store';
import {
  getCameraStream,
  stopCameraStream,
  getCameraSettingsURL,
  type CameraError,
} from '@/lib/camera';
import { composeScreenshot, downloadBlob, computeAverageLuminance } from '@/lib/canvas';
import { Camera, RotateCcw, Scan, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

export default function ARStage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();
  const garmentImgRef = useRef<HTMLImageElement | null>(null);

  const {
    selectedGarmentId,
    garments,
    transform,
    landmarksVisible,
    autoAlign,
    resetToBaseline,
    setStatus,
  } = useTryonStore();

  const [cameraError, setCameraError] = useState<CameraError | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [lowLight, setLowLight] = useState(false);
  const [lastLightCheck, setLastLightCheck] = useState(0);

  const selectedGarment = garments.find((g) => g.id === selectedGarmentId);

  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await getCameraStream({ facingMode: 'user' });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
        startRenderLoop();
      }
    } catch (err) {
      setCameraError(err as CameraError);
      setCameraReady(false);
    }
  }, []);

  // Start render loop
  const startRenderLoop = useCallback(() => {
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTime = 0;

    const render = (currentTime: number) => {
      if (!videoRef.current || !cameraReady) return;

      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      // Calculate FPS
      frameCount++;
      fpsTime += deltaTime;
      if (fpsTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / fpsTime);
        setStatus({ fps });
        frameCount = 0;
        fpsTime = 0;
      }

      // Check lighting every 2 seconds
      if (currentTime - lastLightCheck > 2000) {
        const luminance = computeAverageLuminance(videoRef.current);
        setLowLight(luminance < 60); // Threshold for low light
        setLastLightCheck(currentTime);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);
  }, [cameraReady, lastLightCheck, setStatus]);

  // Cleanup camera
  const cleanupCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    stopCameraStream(streamRef.current);
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  // Initialize on mount
  useEffect(() => {
    initCamera();
    return cleanupCamera;
  }, [initCamera, cleanupCamera]);

  // Handle screenshot
  const handleScreenshot = async () => {
    if (!videoRef.current || !cameraReady) {
      toast.error('Camera not ready');
      return;
    }

    try {
      const blob = await composeScreenshot(videoRef.current, garmentImgRef.current, transform);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      downloadBlob(blob, `ar-tryon-${timestamp}.png`);
      toast.success('Screenshot saved to Downloads');
    } catch (err) {
      toast.error('Failed to save screenshot');
      console.error(err);
    }
  };

  // Retry camera access
  const handleRetry = () => {
    cleanupCamera();
    initCamera();
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-muted/20 rounded-lg overflow-hidden">
      {/* Camera Error State */}
      {cameraError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/95 z-20">
          <div className="max-w-md p-6 space-y-4 text-center">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <Camera className="h-8 w-8 text-destructive" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Camera Access Required</h3>
              <p className="text-sm text-muted-foreground">{cameraError.message}</p>
            </div>

            <div className="flex flex-col gap-2">
              {cameraError.retry && (
                <Button onClick={handleRetry} className="w-full">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              )}

              {cameraError.type === 'permission' && getCameraSettingsURL() && (
                <Button
                  variant="outline"
                  onClick={() => window.open(getCameraSettingsURL() || '', '_blank')}
                  className="w-full"
                >
                  Open Browser Settings
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Low Light Warning */}
      {cameraReady && lowLight && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Low light detected - try better lighting for best results
          </Badge>
        </div>
      )}

      {/* Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }} // Mirror for natural selfie view
      />

      {/* Garment Overlay */}
      {selectedGarment && cameraReady && (
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
          style={{ transform: 'scaleX(-1)' }} // Mirror to match video
        >
          <Image
            ref={garmentImgRef}
            src={selectedGarment.src}
            alt={selectedGarment.name}
            width={selectedGarment.width}
            height={selectedGarment.height}
            className="absolute"
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
              opacity: transform.opacity / 100,
              transformOrigin: 'center',
              maxWidth: 'none',
            }}
            priority
            onError={() => {
              toast.error('Failed to load garment image');
            }}
          />
        </div>
      )}

      {/* Shoulder Landmarks (Demo) */}
      {landmarksVisible && cameraReady && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ transform: 'scaleX(-1)' }}
        >
          {/* Left shoulder */}
          <div
            className="absolute h-3 w-3 rounded-full bg-primary border-2 border-white"
            style={{ left: '35%', top: '30%' }}
          />
          {/* Right shoulder */}
          <div
            className="absolute h-3 w-3 rounded-full bg-primary border-2 border-white"
            style={{ left: '65%', top: '30%' }}
          />
          {/* Guide line */}
          <svg className="absolute inset-0 w-full h-full">
            <line
              x1="35%"
              y1="30%"
              x2="65%"
              y2="30%"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="4"
              className="text-primary"
            />
          </svg>
        </div>
      )}

      {/* Floating Controls */}
      {cameraReady && (
        <div className="absolute bottom-4 left-4 flex gap-2 z-10">
          <Button
            size="sm"
            variant={landmarksVisible ? 'default' : 'secondary'}
            onClick={() => useTryonStore.getState().setLandmarksVisible(!landmarksVisible)}
            className="glassmorphic-card"
          >
            {landmarksVisible ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
            Landmarks
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => autoAlign()}
            className="glassmorphic-card"
          >
            <Scan className="h-4 w-4 mr-2" />
            Auto-Align
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => resetToBaseline()}
            className="glassmorphic-card"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>

          {selectedGarment && (
            <Button
              size="sm"
              onClick={handleScreenshot}
              className="glassmorphic-card bg-primary/90 hover:bg-primary"
            >
              <Camera className="h-4 w-4 mr-2" />
              Screenshot
            </Button>
          )}
        </div>
      )}

      {/* No Garment Selected */}
      {!selectedGarment && cameraReady && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="glassmorphic-card p-6 text-center max-w-xs">
            <p className="text-sm text-muted-foreground">
              Select a garment from the panel to start
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
