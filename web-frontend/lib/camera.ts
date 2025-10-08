// lib/camera.ts
export interface CameraError {
  type: 'permission-denied' | 'not-found' | 'not-readable' | 'overconstrained' | 'unknown';
  message: string;
}

export async function requestCameraAccess(): Promise<MediaStream> {
  // First, try with ideal constraints
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user', // Front camera
        frameRate: { ideal: 30 }
      },
      audio: false
    });

    console.log('✅ Camera access granted (ideal settings)');
    return stream;
  } catch {
    console.log('⚠️ Ideal settings failed, trying basic settings...');

    // Try with basic constraints as fallback
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      console.log('✅ Camera access granted (basic settings)');
      return stream;
    } catch (fallbackError: unknown) {
      const fallbackErr = fallbackError as { name?: string };
      const cameraError: CameraError = {
        type: 'unknown',
        message: 'Failed to access camera'
      };

      if (fallbackErr.name === 'NotAllowedError' || fallbackErr.name === 'PermissionDeniedError') {
        cameraError.type = 'permission-denied';
        cameraError.message = 'Camera permission denied. Please allow camera access.';
      } else if (fallbackErr.name === 'NotFoundError' || fallbackErr.name === 'DevicesNotFoundError') {
        cameraError.type = 'not-found';
        cameraError.message = 'No camera found on this device.';
      } else if (fallbackErr.name === 'NotReadableError' || fallbackErr.name === 'TrackStartError') {
        cameraError.type = 'not-readable';
        cameraError.message = 'Camera is already in use by another application.';
      } else if (fallbackErr.name === 'OverconstrainedError') {
        cameraError.type = 'overconstrained';
        cameraError.message = 'Camera does not meet the required specifications.';
      }

      console.error('❌ Camera error:', cameraError);
      throw cameraError;
    }
  }
}

export function stopCameraStream(stream: MediaStream | null) {
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
      console.log('🛑 Camera track stopped');
    });
  }
}

export function checkCameraSupport(): boolean {
  // Check if we're in a browser environment first
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // Check for MediaDevices API
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.warn('❌ MediaDevices API not available');
    return false;
  }

  // Check for secure context (HTTPS or localhost)
  if (window.location.protocol !== 'https:' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1') {
    console.warn('⚠️ Camera requires HTTPS or localhost. Current:', window.location.protocol + '//' + window.location.hostname);
  }

  return true;
}

export function getSecurityWarning(): string | null {
  if (typeof window === 'undefined') return null;

  if (window.location.protocol !== 'https:' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1' &&
      !window.location.hostname.startsWith('192.168.') &&
      !window.location.hostname.startsWith('10.') &&
      !window.location.hostname.startsWith('172.')) {
    return 'Camera access requires HTTPS. Please use https:// or access via localhost.';
  }

  // For local network IPs (192.168.x.x, 10.x.x.x)
  if ((window.location.hostname.startsWith('192.168.') ||
       window.location.hostname.startsWith('10.') ||
       window.location.hostname.startsWith('172.')) &&
      window.location.protocol !== 'https:') {
    return 'Accessing via local network IP requires HTTPS. Please use https:// or access via http://localhost:3000';
  }

  return null;
}
