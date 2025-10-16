'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Camera,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  getCameraPermissionStatus,
  getPermissionMessage,
  getCameraEnableInstructions,
  isFirstTimeRequest,
  type CameraPermissionStatus,
} from '@/lib/utils/cameraPermissions';

interface CameraPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAllow: () => void;
  onDeny: () => void;
}

export default function CameraPermissionDialog({
  open,
  onOpenChange,
  onAllow,
  onDeny,
}: CameraPermissionDialogProps) {
  const [permissionStatus, setPermissionStatus] = useState<CameraPermissionStatus>('prompt');
  const [isFirstTime, setIsFirstTime] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      const status = await getCameraPermissionStatus();
      setPermissionStatus(status);
      setIsFirstTime(isFirstTimeRequest());
    };

    if (open) {
      checkStatus();
    }
  }, [open]);

  const getStatusIcon = () => {
    switch (permissionStatus) {
      case 'granted':
        return <CheckCircle2 className="h-12 w-12 text-green-500" />;
      case 'denied':
        return <XCircle className="h-12 w-12 text-red-500" />;
      case 'unsupported':
        return <AlertCircle className="h-12 w-12 text-amber-500" />;
      default:
        return <Camera className="h-12 w-12 text-primary" />;
    }
  };

  const getStatusColor = () => {
    switch (permissionStatus) {
      case 'granted':
        return 'bg-green-500/10 border-green-500/20';
      case 'denied':
        return 'bg-red-500/10 border-red-500/20';
      case 'unsupported':
        return 'bg-amber-500/10 border-amber-500/20';
      default:
        return 'bg-primary/10 border-primary/20';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] glassmorphic-card border-2">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Camera Permission
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Icon */}
          <div className="flex justify-center">
            <div
              className={`h-24 w-24 rounded-full ${getStatusColor()} flex items-center justify-center border-2`}
            >
              {getStatusIcon()}
            </div>
          </div>

          {/* Status Message */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">
              {permissionStatus === 'prompt' && isFirstTime
                ? 'Camera Access Required'
                : getPermissionMessage(permissionStatus)}
            </h3>

            {permissionStatus === 'prompt' && isFirstTime && (
              <p className="text-sm text-muted-foreground">
                To use AR try-on features, we need access to your device camera. Your privacy is
                important - we never record or store any video.
              </p>
            )}

            {permissionStatus === 'denied' && (
              <p className="text-sm text-muted-foreground">
                Camera access was denied. To use AR features, please enable camera permissions in
                your browser.
              </p>
            )}

            {permissionStatus === 'unsupported' && (
              <p className="text-sm text-muted-foreground">
                Your device or browser does not support camera access. Please try using a different
                device or browser.
              </p>
            )}
          </div>

          {/* Privacy Assurance */}
          {permissionStatus === 'prompt' && (
            <Alert className="bg-primary/5 border-primary/20">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2 text-xs">
                  <p className="font-medium">Privacy & Security:</p>
                  <ul className="space-y-1 ml-4 list-disc">
                    <li>All processing happens locally on your device</li>
                    <li>No video or images are uploaded to servers</li>
                    <li>Camera access is only active when you&apos;re using AR features</li>
                    <li>You can revoke permission at any time in browser settings</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Browser-Specific Instructions for Denied */}
          {permissionStatus === 'denied' && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2 text-xs">
                  <p className="font-medium">How to enable camera:</p>
                  <p>{getCameraEnableInstructions()}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge variant="outline" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              100% Private
            </Badge>
            <Badge variant="outline" className="text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Local Processing
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Camera className="h-3 w-3 mr-1" />
              No Recording
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {permissionStatus === 'prompt' && (
              <>
                <Button variant="outline" onClick={onDeny} className="flex-1">
                  Not Now
                </Button>
                <Button onClick={onAllow} className="flex-1 gap-2">
                  <Camera className="h-4 w-4" />
                  Allow Camera
                </Button>
              </>
            )}

            {permissionStatus === 'denied' && (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    onAllow(); // Retry permission request
                  }}
                  className="flex-1 gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </Button>
              </>
            )}

            {permissionStatus === 'granted' && (
              <Button onClick={() => onOpenChange(false)} className="w-full gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Continue
              </Button>
            )}

            {permissionStatus === 'unsupported' && (
              <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                Close
              </Button>
            )}
          </div>

          {/* Help Text */}
          {permissionStatus === 'prompt' && (
            <p className="text-xs text-center text-muted-foreground">
              By allowing camera access, you agree that we can use your device camera for AR
              try-on features only.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
