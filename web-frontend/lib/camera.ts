// lib/camera.ts
export interface CameraError {
  type: 'permission-denied' | 'not-found' | 'not-readable' | 'overconstrained' | 'unknown';
  message: string;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

/**
 * Check camera permission state without triggering permission prompt
 */
export async function checkCameraPermission(): Promise<PermissionState> {
  try {
    // Check if Permissions API is available
    if (!navigator.permissions || !navigator.permissions.query) {
      console.warn('⚠️ Permissions API not available');
      return 'unsupported';
    }

    // Query camera permission
    const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
    console.log('🔐 Camera permission state:', result.state);
    return result.state as PermissionState;
  } catch (error) {
    console.warn('⚠️ Permission check failed:', error);
    return 'unsupported';
  }
}

/**
 * Get list of available video input devices
 */
export async function getCameraDevices(): Promise<CameraDevice[]> {
  try {
    // First request basic camera access to get device labels
    // (labels are empty without permission)
    const permissionState = await checkCameraPermission();

    if (permissionState === 'denied') {
      console.warn('⚠️ Camera permission denied, cannot enumerate devices');
      return [];
    }

    // Enumerate devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices
      .filter(device => device.kind === 'videoinput')
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${index + 1}`,
        groupId: device.groupId
      }));

    console.log(`📹 Found ${videoDevices.length} camera device(s):`, videoDevices);
    return videoDevices;
  } catch (error) {
    console.error('❌ Failed to enumerate devices:', error);
    return [];
  }
}

/**
 * Request camera access with optional device ID
 */
export async function requestCameraAccess(deviceId?: string): Promise<MediaStream> {
  // Build video constraints
  const videoConstraints: MediaTrackConstraints = deviceId
    ? {
        // Use specific device ID
        deviceId: { exact: deviceId },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      }
    : {
        // Use default front camera
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
        frameRate: { ideal: 30 }
      };

  // First, try with ideal constraints
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: false
    });

    console.log(`✅ Camera access granted${deviceId ? ' (device: ' + deviceId + ')' : ' (ideal settings)'}`);
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
