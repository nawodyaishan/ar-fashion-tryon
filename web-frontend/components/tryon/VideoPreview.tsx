// components/tryon/VideoPreview.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import {
  requestCameraAccess,
  stopCameraStream,
  checkCameraSupport,
  getSecurityWarning,
  checkCameraPermission,
  type CameraError,
  type PermissionState
} from '@/lib/camera';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Camera, AlertCircle, RefreshCcw, Shield, Settings } from 'lucide-react';
import { CameraControls } from './CameraControls';
import { toast } from 'sonner';

interface VideoPreviewProps {
  onStreamReady?: (stream: MediaStream, video: HTMLVideoElement) => void;
  className?: string;
}

type SetupState = 'idle' | 'checking-permission' | 'requesting-permission' | 'loading' | 'active';

export function VideoPreview({ onStreamReady, className = '' }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamAttachedRef = useRef<MediaStream | null>(null); // Track which stream is attached
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<CameraError | null>(null);
  const [setupState, setSetupState] = useState<SetupState>('idle');
  const [isSupported, setIsSupported] = useState(true);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);

  // Start camera with selected device
  const startCamera = async (deviceId?: string) => {
    console.log(`📹 Starting camera${deviceId ? ` with device: ${deviceId}` : ' (default)'}`);

    // Clear any previous errors
    setSetupState('loading');
    setError(null);
    streamAttachedRef.current = null; // Reset attached stream tracker

    try {
      // Request camera access
      const mediaStream = await requestCameraAccess(deviceId);

      // Validate stream has video tracks
      if (!mediaStream.getVideoTracks().length) {
        throw {
          type: 'not-found',
          message: 'No video track found in media stream'
        } as CameraError;
      }

      // Store stream in state (this will trigger useEffect to attach to video)
      setStream(mediaStream);
      setSetupState('active'); // Render video element

      // Auto-detect current device (but don't block on this)
      if (!deviceId) {
        // If no specific device was requested, try to identify the current one
        const videoTrack = mediaStream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        setSelectedDeviceId(settings.deviceId);
        console.log('📹 Auto-detected camera device:', settings.deviceId);
      } else {
        setSelectedDeviceId(deviceId);
      }

      console.log('✅ Camera stream created, waiting for video element...');
    } catch (err) {
      const cameraError = err as CameraError;
      console.error('❌ Failed to start camera:', cameraError);

      setError(cameraError);
      setSetupState('idle');
      streamAttachedRef.current = null;

      // Show user-friendly error message
      const errorMsg = cameraError.message || 'Failed to access camera';
      toast.error(errorMsg);
    }
  };

  // Attach stream to video element when both are ready (runs only once per stream)
  useEffect(() => {
    // Only attach if:
    // 1. We have a stream
    // 2. Video element exists
    // 3. We're in active state
    // 4. This stream hasn't been attached yet (prevent duplicates)
    if (stream && videoRef.current && setupState === 'active' && streamAttachedRef.current !== stream) {
      let isCancelled = false;

      const attachStream = async () => {
        try {
          console.log('📹 Attaching stream to video element...');

          // Check if cancelled (component unmounted or stream changed)
          if (isCancelled || !videoRef.current) {
            console.log('⚠️ Stream attachment cancelled');
            return;
          }

          // Mark this stream as attached to prevent duplicates
          streamAttachedRef.current = stream;

          // Attach stream to video element
          videoRef.current.srcObject = stream;

          // Wait for video metadata to load before playing
          await new Promise<void>((resolve, reject) => {
            const video = videoRef.current;
            if (!video) {
              reject(new Error('Video element not available'));
              return;
            }

            const onLoadedMetadata = () => {
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('error', onError);
              resolve();
            };

            const onError = () => {
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('error', onError);
              reject(new Error('Video metadata failed to load'));
            };

            video.addEventListener('loadedmetadata', onLoadedMetadata);
            video.addEventListener('error', onError);

            // If metadata is already loaded, resolve immediately
            if (video.readyState >= 1) {
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('error', onError);
              resolve();
            }
          });

          // Check again if cancelled
          if (isCancelled || !videoRef.current) {
            console.log('⚠️ Stream attachment cancelled after metadata load');
            return;
          }

          // Play the video
          await videoRef.current.play();

          console.log('✅ Video playing successfully');

          // Notify parent that stream is ready (only once)
          if (!isCancelled && videoRef.current) {
            onStreamReady?.(stream, videoRef.current);
          }
        } catch (error) {
          if (!isCancelled) {
            console.error('❌ Failed to play video:', error);

            // Only show error if it's a real error, not a cancellation
            const errorMessage = error instanceof Error ? error.message : 'Failed to play video stream';
            if (!errorMessage.includes('interrupted') && !errorMessage.includes('removed from the document')) {
              setError({
                type: 'not-readable',
                message: errorMessage
              });
              setSetupState('idle');
              streamAttachedRef.current = null; // Reset on error
            }
          }
        }
      };

      attachStream();

      // Cleanup function: cancel if stream changes or component unmounts
      return () => {
        isCancelled = true;
        console.log('🧹 Cleaning up stream attachment');
      };
    }
  }, [stream, setupState, onStreamReady]); // onStreamReady is now stable thanks to useCallback in ARStage

  // Check permissions and support on mount
  useEffect(() => {
    const checkSetup = async () => {
      // Check for security warnings
      const warning = getSecurityWarning();
      if (warning) {
        setSecurityWarning(warning);
        setSetupState('idle');
        return;
      }

      if (!checkCameraSupport()) {
        setIsSupported(false);
        setSetupState('idle');
        return;
      }

      // Check permission state
      setSetupState('checking-permission');
      const permission = await checkCameraPermission();
      setPermissionState(permission);
      setSetupState('idle');

      console.log('📹 Camera setup check complete. Permission:', permission);
    };

    checkSetup();

    // Cleanup on unmount: stop stream and clear video
    return () => {
      console.log('🧹 Component unmounting, cleaning up camera...');

      if (stream) {
        stopCameraStream(stream);
      }

      // Capture ref value for cleanup (suppressing false positive warning)
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const video = videoRef.current;
      if (video) {
        video.srcObject = null;
      }

      streamAttachedRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle start camera button
  const handleStartCamera = () => {
    setSetupState('requesting-permission');
    startCamera(selectedDeviceId);
  };

  // Handle device change
  const handleDeviceChange = (deviceId: string) => {
    console.log('📹 Switching camera device...');

    // Stop current stream and clear attached ref
    if (stream) {
      stopCameraStream(stream);
      setStream(null);
      streamAttachedRef.current = null;
    }

    // Clear video element source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Start with new device
    startCamera(deviceId);
  };

  // Handle reset
  const handleReset = () => {
    console.log('🔄 Resetting camera...');

    // Stop current stream and clear all state
    if (stream) {
      stopCameraStream(stream);
      setStream(null);
      streamAttachedRef.current = null;
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Reset state
    setSetupState('idle');
    setError(null);
    setSelectedDeviceId(undefined);

    toast.info('Camera reset');
  };

  // Security warning (HTTPS required for network access)
  if (securityWarning) {
    return (
      <div className={`flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg ${className}`}>
        <div className="text-center p-6 space-y-4 max-w-md">
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>{securityWarning}</AlertDescription>
          </Alert>
          <div className="text-xs text-muted-foreground space-y-2">
            <p>To use camera features:</p>
            <ul className="list-disc list-inside text-left space-y-1">
              <li>Access via <code className="bg-black/20 px-1 rounded">http://localhost:3000</code></li>
              <li>Or enable HTTPS for network access</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Browser not supported
  if (!isSupported) {
    return (
      <div className={`flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg ${className}`}>
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your browser doesn&apos;t support camera access. Please use a modern browser like Chrome, Firefox, or Edge.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Idle state - Show "Start Camera" button
  if (setupState === 'idle' && !stream && !error) {
    return (
      <div className={`flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg ${className}`}>
        <div className="text-center p-6 space-y-4">
          <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Camera className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Start Live Camera</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {permissionState === 'denied'
                ? 'Camera permission was denied. Please allow camera access in your browser settings.'
                : permissionState === 'granted'
                  ? 'Camera permission granted. Click below to start.'
                  : 'We need camera access to show the live preview.'}
            </p>
          </div>
          <Button onClick={handleStartCamera} size="lg" disabled={permissionState === 'denied'}>
            <Camera className="mr-2 h-5 w-5" />
            Start Camera
          </Button>
          {permissionState === 'denied' && (
            <p className="text-xs text-muted-foreground">
              <Settings className="inline h-3 w-3 mr-1" />
              Check browser settings → Site permissions → Camera
            </p>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg ${className}`}>
        <div className="text-center p-6 space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
          <Button onClick={handleReset} variant="outline" size="sm">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          {error.type === 'permission-denied' && (
            <p className="text-xs text-muted-foreground">
              Check your browser settings to allow camera access for this site.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  if (setupState === 'checking-permission' || setupState === 'requesting-permission' || setupState === 'loading') {
    return (
      <div className={`flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg ${className}`}>
        <div className="text-center space-y-4">
          <Camera className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">
            {setupState === 'checking-permission' && 'Checking permissions...'}
            {setupState === 'requesting-permission' && 'Requesting camera access...'}
            {setupState === 'loading' && 'Starting camera...'}
          </p>
        </div>
      </div>
    );
  }

  // Video display (active state)
  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover scale-x-[-1]" // Mirror effect
      />

      {/* Camera Controls Overlay */}
      <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2">
        <div className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
          Camera Active
        </div>

        {/* Camera Controls */}
        <CameraControls
          currentDeviceId={selectedDeviceId}
          onDeviceChange={handleDeviceChange}
          onReset={handleReset}
          disabled={setupState !== 'active'}
        />
      </div>
    </div>
  );
}
