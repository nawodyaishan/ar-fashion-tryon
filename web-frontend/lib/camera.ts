// lib/camera.ts
export interface CameraError {
  type: 'permission-denied' | 'not-found' | 'not-readable' | 'overconstrained' | 'unknown';
  message: string;
}

export async function requestCameraAccess(): Promise<MediaStream> {
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

    console.log('✅ Camera access granted');
    return stream;
  } catch (error: unknown) {
    const err = error as { name?: string };
    const cameraError: CameraError = {
      type: 'unknown',
      message: 'Failed to access camera'
    };

    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      cameraError.type = 'permission-denied';
      cameraError.message = 'Camera permission denied. Please allow camera access.';
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      cameraError.type = 'not-found';
      cameraError.message = 'No camera found on this device.';
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      cameraError.type = 'not-readable';
      cameraError.message = 'Camera is already in use by another application.';
    } else if (err.name === 'OverconstrainedError') {
      cameraError.type = 'overconstrained';
      cameraError.message = 'Camera does not meet the required specifications.';
    }

    console.error('❌ Camera error:', cameraError);
    throw cameraError;
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
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
