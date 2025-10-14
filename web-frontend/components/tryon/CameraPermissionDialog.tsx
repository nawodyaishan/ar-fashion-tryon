'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, CheckCircle2, XCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface CameraPermissionDialogProps {
  open: boolean;
  onClose: () => void;
  onPermissionGranted: () => void;
}

type PermissionState = 'pending' | 'requesting' | 'granted' | 'denied' | 'error';

export function CameraPermissionDialog({ open, onClose, onPermissionGranted }: CameraPermissionDialogProps) {
  const [permissionState, setPermissionState] = useState<PermissionState>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (open) {
      // Check current permission state
      checkCurrentPermission();
    }
  }, [open]);

  const checkCurrentPermission = async () => {
    try {
      // Check if Permissions API is supported
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });

        if (result.state === 'granted') {
          setPermissionState('granted');
          setTimeout(() => {
            onPermissionGranted();
            onClose();
          }, 1000);
        } else if (result.state === 'denied') {
          setPermissionState('denied');
        } else {
          setPermissionState('pending');
        }
      } else {
        setPermissionState('pending');
      }
    } catch (error) {
      console.error('Error checking camera permission:', error);
      setPermissionState('pending');
    }
  };

  const requestCameraPermission = async () => {
    setPermissionState('requesting');
    setErrorMessage('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });

      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach(track => track.stop());

      setPermissionState('granted');

      // Auto-close after showing success
      setTimeout(() => {
        onPermissionGranted();
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Camera permission error:', error);

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setPermissionState('denied');
          setErrorMessage('Camera access was denied. Please allow camera access in your browser settings.');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          setPermissionState('error');
          setErrorMessage('No camera found. Please connect a camera and try again.');
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          setPermissionState('error');
          setErrorMessage('Camera is already in use by another application.');
        } else {
          setPermissionState('error');
          setErrorMessage(`Error: ${error.message}`);
        }
      } else {
        setPermissionState('error');
        setErrorMessage('An unknown error occurred while requesting camera access.');
      }
    }
  };

  const getBrowserInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('chrome')) {
      return {
        browser: 'Chrome',
        steps: [
          'Click the camera icon in the address bar',
          'Select "Always allow" for camera access',
          'Click "Done" and refresh the page'
        ]
      };
    } else if (userAgent.includes('firefox')) {
      return {
        browser: 'Firefox',
        steps: [
          'Click the permissions icon in the address bar',
          'Enable camera access',
          'Refresh the page'
        ]
      };
    } else if (userAgent.includes('safari')) {
      return {
        browser: 'Safari',
        steps: [
          'Go to Safari > Preferences > Websites',
          'Select Camera from the left sidebar',
          'Set this website to "Allow"'
        ]
      };
    } else {
      return {
        browser: 'Your Browser',
        steps: [
          'Look for camera/permissions icon in address bar',
          'Allow camera access for this website',
          'Refresh the page'
        ]
      };
    }
  };

  const instructions = getBrowserInstructions();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Camera Permission Required
          </DialogTitle>
          <DialogDescription>
            AR Try-On needs camera access to provide live virtual try-on experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Pending State */}
          {permissionState === 'pending' && (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Click the button below to grant camera access. Your browser will show a permission prompt.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <p className="text-sm font-medium">Why we need camera access:</p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• Real-time pose detection for garment alignment</li>
                  <li>• Live preview of virtual try-on</li>
                  <li>• Hand gesture recognition for controls</li>
                </ul>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Privacy & Security
                </p>
                <p className="text-xs text-muted-foreground">
                  All processing happens locally in your browser. No video or images are uploaded to our servers.
                </p>
              </div>

              <Button onClick={requestCameraPermission} className="w-full gap-2" size="lg">
                <Camera className="h-4 w-4" />
                Grant Camera Access
              </Button>
            </>
          )}

          {/* Requesting State */}
          {permissionState === 'requesting' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 animate-pulse">
                <Camera className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm font-medium">Requesting camera access...</p>
              <p className="text-xs text-muted-foreground mt-2">
                Please check your browser for the permission prompt
              </p>
            </div>
          )}

          {/* Granted State */}
          {permissionState === 'granted' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Camera access granted!
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Starting AR experience...
              </p>
            </div>
          )}

          {/* Denied State */}
          {permissionState === 'denied' && (
            <>
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  Camera access was denied. Follow the steps below to enable it.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <p className="text-sm font-medium">How to enable camera in {instructions.browser}:</p>
                <ol className="text-sm space-y-2 ml-4">
                  {instructions.steps.map((step, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="font-medium text-primary">{index + 1}.</span>
                      <span className="text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex gap-2">
                <Button onClick={requestCameraPermission} variant="outline" className="flex-1">
                  Try Again
                </Button>
                <Button onClick={onClose} variant="ghost" className="flex-1">
                  Skip for Now
                </Button>
              </div>
            </>
          )}

          {/* Error State */}
          {permissionState === 'error' && (
            <>
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  {errorMessage}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <p className="text-sm font-medium">Troubleshooting:</p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• Make sure your camera is connected</li>
                  <li>• Close other apps using the camera</li>
                  <li>• Check browser camera permissions</li>
                  <li>• Try refreshing the page</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button onClick={requestCameraPermission} variant="outline" className="flex-1">
                  Try Again
                </Button>
                <Button onClick={onClose} variant="ghost" className="flex-1">
                  Cancel
                </Button>
              </div>
            </>
          )}

          {/* Help Link */}
          <div className="text-center pt-2 border-t">
            <a
              href="https://support.google.com/chrome/answer/2693767"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              Need help with camera settings?
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
