// components/tryon/VideoPreview.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import {
  requestCameraAccess,
  stopCameraStream,
  checkCameraSupport,
  getSecurityWarning,
  checkCameraPermission,
  getCameraDevices,
  type CameraError,
  type PermissionState,
  type CameraDevice
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
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<CameraError | null>(null);
  const [setupState, setSetupState] = useState<SetupState>('idle');
  const [isSupported, setIsSupported] = useState(true);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [availableDevices, setAvailableDevices] = useState<CameraDevice[]>([]);

  // Start camera with selected device
  const startCamera = async (deviceId?: string) => {
    setSetupState('loading');
    setError(null);

    try {
      const mediaStream = await requestCameraAccess(deviceId);

      // Store stream in state (this will trigger useEffect to attach to video)
      setStream(mediaStream);
      setSetupState('active'); // Render video element

      // Load available devices after successful start
      const devices = await getCameraDevices();
      setAvailableDevices(devices);

      // If no device was selected, try to identify the current one
      if (!deviceId && devices.length > 0) {
        const videoTrack = mediaStream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        setSelectedDeviceId(settings.deviceId);
      } else if (deviceId) {
        setSelectedDeviceId(deviceId);
      }

      console.log('📹 Camera stream created, waiting for video element...');
    } catch (err) {
      setError(err as CameraError);
      setSetupState('idle');
      toast.error((err as CameraError).message);
    }
  };

  // Attach stream to video element when both are ready
  useEffect(() => {
    if (stream && videoRef.current && setupState === 'active') {
      const attachStream = async () => {
        try {
          console.log('📹 Attaching stream to video element...');
          videoRef.current!.srcObject = stream;

          // Wait for video to be ready and play
          await videoRef.current!.play();

          console.log('✅ Video playing successfully');

          // Notify parent that stream is ready
          onStreamReady?.(stream, videoRef.current!);

          toast.success('Camera started successfully');
        } catch (error) {
          console.error('❌ Failed to play video:', error);
          setError({
            type: 'not-readable',
            message: 'Failed to play video stream'
          });
          setSetupState('idle');
        }
      };

      attachStream();
    }
  }, [stream, setupState, onStreamReady]);

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

    // Cleanup on unmount
    return () => {
      if (stream) {
        stopCameraStream(stream);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle start camera button
  const handleStartCamera = () => {
    setSetupState('requesting-permission');
    startCamera(selectedDeviceId);
  };

  // Handle device change
  const handleDeviceChange = (deviceId: string) => {
    // Stop current stream
    if (stream) {
      stopCameraStream(stream);
      setStream(null);
    }

    // Start with new device
    startCamera(deviceId);
  };

  // Handle reset
  const handleReset = () => {
    if (stream) {
      stopCameraStream(stream);
      setStream(null);
    }
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
