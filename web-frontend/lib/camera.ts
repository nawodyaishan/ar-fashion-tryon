export interface CameraError {
  type: 'permission' | 'not-found' | 'not-supported' | 'unknown';
  message: string;
  retry?: boolean;
}

export interface CameraOptions {
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
}

/**
 * Request camera access with proper error handling
 */
export async function getCameraStream(
  options: CameraOptions = { facingMode: 'user' },
): Promise<MediaStream> {
  try {
    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('getUserMedia not supported in this browser');
    }

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: options.facingMode || 'user',
        ...(options.width && { width: { ideal: options.width } }),
        ...(options.height && { height: { ideal: options.height } }),
      },
      audio: false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  } catch (error) {
    throw parseCameraError(error);
  }
}

/**
 * Stop all tracks in a media stream
 */
export function stopCameraStream(stream: MediaStream | null): void {
  if (!stream) return;

  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

/**
 * Parse MediaStream errors into user-friendly messages
 */
function parseCameraError(error: unknown): CameraError {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return {
          type: 'permission',
          message: 'Camera access denied. Please allow camera permission in your browser settings.',
          retry: true,
        };

      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return {
          type: 'not-found',
          message: 'No camera found. Please connect a camera and try again.',
          retry: true,
        };

      case 'NotSupportedError':
        return {
          type: 'not-supported',
          message: 'Camera not supported in this browser. Try using Chrome, Firefox, or Safari.',
          retry: false,
        };

      case 'NotReadableError':
      case 'TrackStartError':
        return {
          type: 'unknown',
          message: 'Camera is in use by another application. Please close other apps and try again.',
          retry: true,
        };

      default:
        return {
          type: 'unknown',
          message: `Camera error: ${error.message}`,
          retry: true,
        };
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('not supported')) {
      return {
        type: 'not-supported',
        message: 'Camera not supported in this browser. Try using Chrome, Firefox, or Safari.',
        retry: false,
      };
    }

    return {
      type: 'unknown',
      message: error.message,
      retry: true,
    };
  }

  return {
    type: 'unknown',
    message: 'An unknown error occurred while accessing the camera.',
    retry: true,
  };
}

/**
 * Get browser-specific camera settings help URL
 */
export function getCameraSettingsURL(): string | null {
  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
    return 'chrome://settings/content/camera';
  } else if (userAgent.includes('firefox')) {
    return 'about:preferences#privacy';
  } else if (userAgent.includes('safari')) {
    return null; // Safari uses system preferences
  } else if (userAgent.includes('edg')) {
    return 'edge://settings/content/camera';
  }

  return null;
}

/**
 * Check if camera is available without requesting permission
 */
export async function isCameraAvailable(): Promise<boolean> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return false;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some((device) => device.kind === 'videoinput');
  } catch {
    return false;
  }
}
