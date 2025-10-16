/**
 * Camera Permissions Management
 * Handles camera access permissions with first-time flow and status tracking
 */

export type CameraPermissionStatus =
  | 'granted' // Permission granted
  | 'denied' // Permission denied
  | 'prompt' // Not yet requested
  | 'unsupported'; // Camera API not supported

export interface CameraPermissionState {
  status: CameraPermissionStatus;
  hasAskedBefore: boolean;
  timestamp?: number;
}

const STORAGE_KEY = 'camera-permission-state';

/**
 * Check if camera API is supported
 */
export function isCameraSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Get current camera permission status
 * Uses Permissions API if available, otherwise checks localStorage history
 */
export async function getCameraPermissionStatus(): Promise<CameraPermissionStatus> {
  if (!isCameraSupported()) {
    return 'unsupported';
  }

  // Try Permissions API first (not supported in all browsers)
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return result.state as CameraPermissionStatus;
    } catch (error) {
      // Permissions API not available or query failed
      console.warn('Permissions API not available:', error);
    }
  }

  // Fallback: Check if we've asked before via localStorage
  const state = getStoredPermissionState();
  if (state.hasAskedBefore) {
    // We've asked before, but can't determine current status without Permissions API
    // Default to 'prompt' to allow retry
    return 'prompt';
  }

  return 'prompt';
}

/**
 * Request camera access
 * Returns the stream if granted, null if denied
 */
export async function requestCameraAccess(
  facingMode: 'user' | 'environment' = 'user',
): Promise<{ stream: MediaStream | null; status: CameraPermissionStatus }> {
  if (!isCameraSupported()) {
    return { stream: null, status: 'unsupported' };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });

    // Success - update state
    savePermissionState({
      status: 'granted',
      hasAskedBefore: true,
      timestamp: Date.now(),
    });

    console.log('✅ Camera permission granted');
    return { stream, status: 'granted' };
  } catch (error) {
    // Permission denied or error occurred
    const errorName = error instanceof Error ? error.name : 'Unknown';
    console.error('❌ Camera permission denied:', errorName, error);

    // Determine status based on error
    let status: CameraPermissionStatus = 'denied';
    if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
      status = 'denied';
    } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
      status = 'unsupported'; // No camera device found
    }

    // Update state
    savePermissionState({
      status,
      hasAskedBefore: true,
      timestamp: Date.now(),
    });

    return { stream: null, status };
  }
}

/**
 * Check if this is the first time requesting camera access
 */
export function isFirstTimeRequest(): boolean {
  const state = getStoredPermissionState();
  return !state.hasAskedBefore;
}

/**
 * Get stored permission state from localStorage
 */
export function getStoredPermissionState(): CameraPermissionState {
  if (typeof window === 'undefined') {
    return { status: 'prompt', hasAskedBefore: false };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to read camera permission state:', error);
  }

  return { status: 'prompt', hasAskedBefore: false };
}

/**
 * Save permission state to localStorage
 */
function savePermissionState(state: CameraPermissionState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save camera permission state:', error);
  }
}

/**
 * Reset permission state (useful for testing)
 */
export function resetPermissionState(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🔄 Camera permission state reset');
  } catch (error) {
    console.warn('Failed to reset camera permission state:', error);
  }
}

/**
 * Get user-friendly message for permission status
 */
export function getPermissionMessage(status: CameraPermissionStatus): string {
  switch (status) {
    case 'granted':
      return 'Camera access granted';
    case 'denied':
      return 'Camera access denied. Please enable camera permissions in your browser settings.';
    case 'prompt':
      return 'Camera permission required. Click to allow access.';
    case 'unsupported':
      return 'Camera not available on this device or browser.';
    default:
      return 'Unknown camera status';
  }
}

/**
 * Get browser-specific instructions for enabling camera
 */
export function getCameraEnableInstructions(): string {
  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes('chrome')) {
    return 'Chrome: Click the camera icon in the address bar, then select "Always allow" and reload the page.';
  } else if (userAgent.includes('firefox')) {
    return 'Firefox: Click the crossed-out camera icon in the address bar, then select "Allow" and reload.';
  } else if (userAgent.includes('safari')) {
    return 'Safari: Go to Safari → Settings → Websites → Camera, then allow access for this site.';
  } else if (userAgent.includes('edge')) {
    return 'Edge: Click the camera icon in the address bar, select "Always allow" and reload the page.';
  }

  return 'Please enable camera access in your browser settings and reload the page.';
}

/**
 * Monitor permission changes (if supported by browser)
 */
export async function monitorPermissionChanges(
  callback: (status: CameraPermissionStatus) => void,
): Promise<(() => void) | null> {
  if (!navigator.permissions || !navigator.permissions.query) {
    return null; // Not supported
  }

  try {
    const result = await navigator.permissions.query({ name: 'camera' as PermissionName });

    const handleChange = () => {
      callback(result.state as CameraPermissionStatus);
    };

    result.addEventListener('change', handleChange);

    // Return cleanup function
    return () => {
      result.removeEventListener('change', handleChange);
    };
  } catch (error) {
    console.warn('Failed to monitor permission changes:', error);
    return null;
  }
}

// ============================================================================
// CAMERA DEVICE ENUMERATION & SWITCHING
// ============================================================================

export interface CameraDevice {
  deviceId: string;
  label: string;
  kind: 'videoinput';
  groupId?: string;
}

/**
 * Get list of available camera devices
 * Requires camera permission to be granted first
 */
export async function enumerateCameraDevices(): Promise<CameraDevice[]> {
  if (!isCameraSupported()) {
    return [];
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices
      .filter((device) => device.kind === 'videoinput')
      .map((device) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${device.deviceId.substring(0, 8)}`,
        kind: device.kind as 'videoinput',
        groupId: device.groupId,
      }));

    console.log(`📷 Found ${cameras.length} camera(s):`, cameras);
    return cameras;
  } catch (error) {
    console.error('Failed to enumerate cameras:', error);
    return [];
  }
}

/**
 * Request camera access with specific device ID
 */
export async function requestCameraWithDevice(
  deviceId: string,
): Promise<{ stream: MediaStream | null; status: CameraPermissionStatus }> {
  if (!isCameraSupported()) {
    return { stream: null, status: 'unsupported' };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: { exact: deviceId },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });

    console.log('✅ Camera switched successfully');
    return { stream, status: 'granted' };
  } catch (error) {
    console.error('❌ Failed to switch camera:', error);
    return { stream: null, status: 'denied' };
  }
}

/**
 * Detect if device has multiple cameras (front + back)
 */
export async function hasMultipleCameras(): Promise<boolean> {
  const cameras = await enumerateCameraDevices();
  return cameras.length > 1;
}

/**
 * Get user-facing (front) camera device
 */
export async function getFrontCamera(): Promise<CameraDevice | null> {
  const cameras = await enumerateCameraDevices();

  // Look for labels that indicate front camera
  const frontCamera = cameras.find((camera) =>
    camera.label.toLowerCase().includes('front') ||
    camera.label.toLowerCase().includes('user') ||
    camera.label.toLowerCase().includes('facing')
  );

  return frontCamera || (cameras.length > 0 ? cameras[0] : null);
}

/**
 * Get environment-facing (back) camera device
 */
export async function getBackCamera(): Promise<CameraDevice | null> {
  const cameras = await enumerateCameraDevices();

  // Look for labels that indicate back camera
  const backCamera = cameras.find((camera) =>
    camera.label.toLowerCase().includes('back') ||
    camera.label.toLowerCase().includes('rear') ||
    camera.label.toLowerCase().includes('environment')
  );

  return backCamera || (cameras.length > 1 ? cameras[1] : null);
}
