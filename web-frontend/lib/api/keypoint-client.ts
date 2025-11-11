import type { Garment } from '../types';

// Backend API configuration
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ar-fashion-tryon-production.up.railway.app';

export interface KeypointAPIResponse {
  success: boolean;
  garment_url: string;
  garment_public_id: string;
  garment_keypoints: {
    left_shoulder?: {
      x: number;
      y: number;
      x_pixel: number;
      y_pixel: number;
      visible: boolean;
      confidence: number;
    };
    right_shoulder?: {
      x: number;
      y: number;
      x_pixel: number;
      y_pixel: number;
      visible: boolean;
      confidence: number;
    };
    shoulder_center?: {
      x: number;
      y: number;
      x_pixel: number;
      y_pixel: number;
      visible: boolean;
      confidence: number;
      derived: true;
    };
    shoulder_width_pixel?: number;
    shoulder_angle_degrees?: number;
    left_hip?: {
      x: number;
      y: number;
      x_pixel: number;
      y_pixel: number;
      visible: boolean;
      confidence: number;
    };
    right_hip?: {
      x: number;
      y: number;
      x_pixel: number;
      y_pixel: number;
      visible: boolean;
      confidence: number;
    };
  };
  image_dimensions: {
    width: number;
    height: number;
  };
  detection_confidence: number;
  message: string;
}

/**
 * Upload garment and detect keypoints
 */
export async function uploadGarmentWithKeypoints(
  file: File,
): Promise<KeypointAPIResponse | null> {
  try {
    const formData = new FormData();
    formData.append('garment', file);

    console.log('🔍 Uploading garment with keypoint detection...');
    const startTime = Date.now();

    const response = await fetch(`${BACKEND_URL}/detect_garment_keypoints`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Keypoint detection failed:', error.detail);

      // Handle specific error cases
      if (response.status === 503) {
        throw new Error('Keypoint detection service unavailable');
      } else if (response.status === 413) {
        throw new Error('Image file too large (max 16MB)');
      }

      throw new Error(error.detail || 'Keypoint detection failed');
    }

    const data: KeypointAPIResponse = await response.json();

    // Validate response
    if (!data.success) {
      throw new Error('Keypoint detection unsuccessful');
    }

    const duration = Date.now() - startTime;
    console.log(
      `✅ Keypoint detection successful (${duration}ms, confidence: ${(data.detection_confidence * 100).toFixed(1)}%)`,
    );

    // Check confidence threshold
    if (data.detection_confidence < 0.5) {
      console.warn('⚠️ Low detection confidence:', data.detection_confidence);
    }

    return data;
  } catch (error) {
    console.error('❌ Keypoint API error:', error);
    return null;
  }
}

/**
 * Detect keypoints from existing image URL
 */
export async function detectKeypointsFromURL(
  sourceUrl: string,
): Promise<KeypointAPIResponse | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/detect_garment_keypoints_by_url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source_url: sourceUrl }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Keypoint detection failed:', error.detail);
      throw new Error(error.detail || 'Keypoint detection failed');
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Keypoint API error:', error);
    return null;
  }
}

/**
 * Check if keypoint API is available
 */
export async function checkKeypointAPIHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    const data = await response.json();
    return data.keypoint_model_loaded === true;
  } catch (error) {
    console.error('❌ Health check failed:', error);
    return false;
  }
}

/**
 * Transform API response to internal Garment format
 */
export function transformAPIResponseToGarment(
  file: File,
  apiResponse: KeypointAPIResponse,
): Garment {
  const gk = apiResponse.garment_keypoints;

  return {
    id: crypto.randomUUID(),
    name: file.name,
    src: apiResponse.garment_url,
    width: apiResponse.image_dimensions.width,
    height: apiResponse.image_dimensions.height,
    sizeKb: Math.round(file.size / 1024),

    // Transform keypoint data
    keypoints: {
      leftShoulder: {
        x: gk.left_shoulder?.x ?? 0,
        y: gk.left_shoulder?.y ?? 0,
        confidence: gk.left_shoulder?.confidence ?? 0,
      },
      rightShoulder: {
        x: gk.right_shoulder?.x ?? 0,
        y: gk.right_shoulder?.y ?? 0,
        confidence: gk.right_shoulder?.confidence ?? 0,
      },
      shoulderCenter: {
        x: gk.shoulder_center?.x ?? 0,
        y: gk.shoulder_center?.y ?? 0,
        confidence: gk.shoulder_center?.confidence ?? 0,
      },
      shoulderWidth: gk.shoulder_width_pixel ?? 0,
      shoulderAngle: gk.shoulder_angle_degrees ?? 0,
      leftHip: gk.left_hip
        ? {
            x: gk.left_hip.x,
            y: gk.left_hip.y,
            confidence: gk.left_hip.confidence,
          }
        : undefined,
      rightHip: gk.right_hip
        ? {
            x: gk.right_hip.x,
            y: gk.right_hip.y,
            confidence: gk.right_hip.confidence,
          }
        : undefined,
      detectionConfidence: apiResponse.detection_confidence,
      detectedAt: new Date().toISOString(),
    },
  };
}
