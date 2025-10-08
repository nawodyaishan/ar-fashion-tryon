// components/tryon/VideoPreview.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { requestCameraAccess, stopCameraStream, checkCameraSupport, getSecurityWarning, type CameraError } from '@/lib/camera';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Camera, AlertCircle, RefreshCcw, Shield } from 'lucide-react';

interface VideoPreviewProps {
  onStreamReady?: (stream: MediaStream) => void;
  className?: string;
}

export function VideoPreview({ onStreamReady, className = '' }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<CameraError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(true);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);

  // Initialize camera
  const initializeCamera = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const mediaStream = await requestCameraAccess();
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Wait for video to be ready
        await videoRef.current.play();
      }

      onStreamReady?.(mediaStream);
      setIsLoading(false);
    } catch (err) {
      setError(err as CameraError);
      setIsLoading(false);
    }
  };

  // Check support on mount
  useEffect(() => {
    // Check for security warnings
    const warning = getSecurityWarning();
    if (warning) {
      setSecurityWarning(warning);
      setIsLoading(false);
      return;
    }

    if (!checkCameraSupport()) {
      setIsSupported(false);
      setIsLoading(false);
      return;
    }

    initializeCamera();

    // Cleanup on unmount
    return () => {
      if (stream) {
        stopCameraStream(stream);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Retry handler
  const handleRetry = () => {
    if (stream) {
      stopCameraStream(stream);
    }
    initializeCamera();
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

  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg ${className}`}>
        <div className="text-center p-6 space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
          <Button onClick={handleRetry} variant="outline" size="sm">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Retry Camera Access
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
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg ${className}`}>
        <div className="text-center space-y-4">
          <Camera className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">Accessing camera...</p>
        </div>
      </div>
    );
  }

  // Video display
  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover scale-x-[-1]" // Mirror effect
      />
      {/* Optional: Overlay for FPS or status */}
      <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
        Camera Active
      </div>
    </div>
  );
}
