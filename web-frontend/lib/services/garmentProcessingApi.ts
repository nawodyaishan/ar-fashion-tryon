/**
 * Garment Processing API Service
 * Integrates with /process/garment/top endpoint for AR-ready garment preparation
 * Uses image-extraction-backend (port 5000)
 */

import { garmentHttp } from './http';

export interface GarmentAnchorsResponse {
  collar_left: [number, number];
  collar_right: [number, number];
  neck_apex: [number, number];
}

export interface GarmentBodyOffsets {
  neck_drop_ratio: number;
  torso_length_ratio: number;
}

// Backend returns GSM object directly from /process/garment/top
export interface ProcessGarmentResponse {
  gsm_id: string;
  image: {
    w: number;
    h: number;
    url: string;
  };
  anchors: GarmentAnchorsResponse;
  anchor_confidence?: number;
  anchor_source: 'auto' | 'custom' | 'default';
  keypoints?: Record<string, [number, number]>;
  mesh?: {
    verts: [number, number][];
    tris: [number, number, number][];
  };
  body_offsets: GarmentBodyOffsets;
  upload_error?: string;
}

export interface ProcessGarmentOptions {
  category?: 'shirt' | 'tshirt';
  upload?: boolean;
  useDefaults?: boolean;
  anchors?: {
    collar_left?: [number, number];
    collar_right?: [number, number];
    neck_apex?: [number, number];
  };
}

/**
 * Process a garment image for AR try-on
 * - Removes background
 * - Detects/uses anchor points
 * - Cuts back neck region
 * - Auto-crops to bounds
 * - Optionally uploads to Cloudinary
 *
 * @param file - Garment image file
 * @param options - Processing options
 * @returns Processed garment data with metadata
 */
export async function processGarment(
  file: File,
  options: ProcessGarmentOptions = {}
): Promise<ProcessGarmentResponse> {
  const {
    category = 'shirt',
    upload = true,
    useDefaults = true,
    anchors
  } = options;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  formData.append('upload', String(upload));
  formData.append('use_defaults', String(useDefaults));

  if (anchors) {
    formData.append('anchors_json', JSON.stringify(anchors));
  }

  console.log('🎨 Processing garment:', {
    fileName: file.name,
    fileSize: `${(file.size / 1024).toFixed(2)} KB`,
    category,
    upload,
    useDefaults,
    hasCustomAnchors: !!anchors
  });

  const startTime = Date.now();

  try {
    const { data } = await garmentHttp.post<ProcessGarmentResponse>(
      '/process/garment/top',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds for processing
      }
    );

    const duration = Date.now() - startTime;

    console.log('✅ Garment processing succeeded:', {
      duration: `${(duration / 1000).toFixed(2)}s`,
      gsmId: data.gsm_id,
      dimensions: `${data.image.w}x${data.image.h}`,
      anchorSource: data.anchor_source,
      confidence: data.anchor_confidence?.toFixed(2)
    });

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error('❌ Garment processing failed:', {
      duration: `${(duration / 1000).toFixed(2)}s`,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw error;
  }
}

/**
 * Process a garment from URL instead of file upload
 *
 * @param imageUrl - URL of garment image
 * @param options - Processing options
 * @returns Processed garment data with metadata
 */
export async function processGarmentFromUrl(
  imageUrl: string,
  options: ProcessGarmentOptions = {}
): Promise<ProcessGarmentResponse> {
  const {
    category = 'shirt',
    upload = false, // Default to false for URL input
    useDefaults = true,
    anchors
  } = options;

  const formData = new FormData();
  formData.append('image_url', imageUrl);
  formData.append('category', category);
  formData.append('upload', String(upload));
  formData.append('use_defaults', String(useDefaults));

  if (anchors) {
    formData.append('anchors_json', JSON.stringify(anchors));
  }

  console.log('🎨 Processing garment from URL:', {
    imageUrl,
    category,
    upload,
    useDefaults
  });

  const startTime = Date.now();

  try {
    const { data } = await garmentHttp.post<ProcessGarmentResponse>(
      '/process/garment/top',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      }
    );

    const duration = Date.now() - startTime;

    console.log('✅ URL garment processing succeeded:', {
      duration: `${(duration / 1000).toFixed(2)}s`,
      gsmId: data.gsm_id,
      dimensions: `${data.image.w}x${data.image.h}`,
      anchorSource: data.anchor_source,
      confidence: data.anchor_confidence?.toFixed(2)
    });

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error('❌ URL garment processing failed:', {
      duration: `${(duration / 1000).toFixed(2)}s`,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw error;
  }
}

/**
 * Validate garment file before processing
 *
 * @param file - File to validate
 * @returns Validation result
 */
export function validateGarmentFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload JPEG, PNG, or WebP image.'
    };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 10MB.`
    };
  }

  // Check minimum size (10KB)
  const minSize = 10 * 1024; // 10KB
  if (file.size < minSize) {
    return {
      valid: false,
      error: 'File too small. Please upload a larger image.'
    };
  }

  return { valid: true };
}

/**
 * Convert backend metadata format to frontend GarmentMetadata format
 *
 * @deprecated This function is no longer used. Backend GSM format is used directly.
 * Kept for backward compatibility but may be removed in future versions.
 */
export function convertToFrontendMetadata(
  garmentId: string,
  displayName: string,
  backendMeta: ProcessGarmentResponse
) {
  return {
    id: garmentId,
    version: 1,
    displayName,
    width: backendMeta.image.w,
    height: backendMeta.image.h,
    anchors: {
      collar_left: backendMeta.anchors.collar_left,
      collar_right: backendMeta.anchors.collar_right,
      hem_center: [0.5, 0.88] as [number, number], // Default hem position
      neck_apex: backendMeta.anchors.neck_apex
    },
    body_offsets: backendMeta.body_offsets
  };
}
