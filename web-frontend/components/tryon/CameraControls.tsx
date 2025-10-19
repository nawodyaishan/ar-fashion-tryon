'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Camera, RefreshCw, Video } from 'lucide-react';
import { getCameraDevices, type CameraDevice } from '@/lib/camera';
import { toast } from 'sonner';

interface CameraControlsProps {
  currentDeviceId?: string;
  onDeviceChange: (deviceId: string) => void;
  onReset: () => void;
  disabled?: boolean;
}

export function CameraControls({
  currentDeviceId,
  onDeviceChange,
  onReset,
  disabled = false
}: CameraControlsProps) {
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load available camera devices
  useEffect(() => {
    const loadDevices = async () => {
      setIsLoading(true);
      const cameraDevices = await getCameraDevices();
      setDevices(cameraDevices);
      setIsLoading(false);

      if (cameraDevices.length === 0) {
        toast.error('No cameras detected');
      } else {
        console.log(`📹 ${cameraDevices.length} camera(s) available`);
      }
    };

    loadDevices();
  }, []);

  // Don't show controls if only one camera or no cameras
  if (devices.length <= 1) {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onReset}
          disabled={disabled}
          className="backdrop-blur-sm bg-black/30 hover:bg-black/50 border-white/20"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset Camera
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {/* Camera Device Selector */}
      <Select
        value={currentDeviceId}
        onValueChange={onDeviceChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className="w-full sm:w-[200px] backdrop-blur-sm bg-black/30 hover:bg-black/40 border-white/20 text-white">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            <SelectValue placeholder="Select camera..." />
          </div>
        </SelectTrigger>
        <SelectContent>
          {devices.map((device) => (
            <SelectItem key={device.deviceId} value={device.deviceId}>
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                {device.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Reset Button */}
      <Button
        size="sm"
        variant="outline"
        onClick={onReset}
        disabled={disabled}
        className="backdrop-blur-sm bg-black/30 hover:bg-black/50 border-white/20"
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Reset
      </Button>
    </div>
  );
}