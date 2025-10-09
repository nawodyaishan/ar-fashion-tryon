// lib/services/garmentApi.ts - Garment Extraction API Service
// Supports both direct upload and Cloudinary-first pipeline

import type { GarmentHealthCheck, GarmentProcessResponse } from '@/lib/types';
import { http } from './http';

// API Base URL for Garment Extraction Service
const DEFAULT_BASE = 'https://ar-fashion-tryon-production.up.railway.app';
export const GARMENT_API_BASE = (process.env.NEXT_PUBLIC_GARMENT_API_BASE || DEFAULT_BASE).replace(
  /\/+$/,
  '',
);

// Cloudinary Configuration
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// Cloudinary upload response type
export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  bytes: number;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
}

// Backend response (your Flask /classify_garment)
type BackendResponse =
  | {
      label: string;
      confidence: number;
      garment_url: string; // NOTE: backend returns absolute URL
      cutout_url: string; // NOTE: backend returns absolute URL
      cutout_path: string; // relative path like "static/outputs/..."
    }
  | { error: string };

// Robust URL resolver: accepts absolute or relative paths
function resolveUrl(maybeRelative: string): string {
  if (/^https?:\/\//i.test(maybeRelative)) return maybeRelative; // already absolute
  if (maybeRelative.startsWith('/')) return `${GARMENT_API_BASE}${maybeRelative}`;
  return `${GARMENT_API_BASE}/${maybeRelative}`;
}

/**
 * Process a garment image through your Flask extraction API
 * (POST /classify_garment with form field "garment")
 */
export async function extractGarment(
  file: File,
  signal?: AbortSignal,
): Promise<GarmentProcessResponse> {
  console.log('🚀 Garment Extraction Request:', {
    fileName: file.name,
    fileSize: `${(file.size / 1024).toFixed(2)} KB`,
    fileType: file.type,
  });

  // Client-side validation (match backend: PNG/JPEG only)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File too large. Maximum size is 10MB');
  }
  if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
    throw new Error('Invalid file type. Must be PNG or JPEG');
  }

  const formData = new FormData();
  // IMPORTANT: backend expects the field name "garment"
  formData.append('garment', file);

  const start = performance.now();

  try {
    const { data } = await http.post<BackendResponse>(
      `${GARMENT_API_BASE}/classify_garment`,
      formData,
      {
        signal,
        headers: { Accept: 'application/json' }, // don't set Content-Type with FormData
      },
    );

    const took = performance.now() - start;

    // Handle backend error shape
    if ('error' in data) {
      return {
        success: false,
        message: data.error,
        processing_time_ms: took,
      };
    }

    const result: GarmentProcessResponse = {
      success: true,
      processing_time_ms: took,
      classification: {
        label: data.label,
        confidence: data.confidence ?? 0,
      },
      extraction: {
        cutout_url: data.cutout_url,
        garment_url: data.garment_url,
        cutout_path: data.cutout_path,
      },
    };

    console.log('✅ Garment Extraction Success:', {
      ...result.classification,
      extractedUrl: result.extraction?.cutout_url,
      totalTime: `${Math.round(took)}ms`,
    });

    return result;
  } catch (err: unknown) {
    console.error('❌ Garment Extraction Error:', err);

    // Axios-style HTTP error body passthrough
    if (err && typeof err === 'object' && 'response' in err) {
      const httpErr = err as { response?: { data?: { error?: string; detail?: string } } };
      const detail = httpErr.response?.data?.error || httpErr.response?.data?.detail;
      if (detail) throw new Error(detail);
    }

    if (err instanceof Error) throw err;
    throw new Error('Unknown error occurred during garment extraction');
  }
}

/**
 * Check health status of the Garment Extraction API
 */
export async function checkGarmentApiHealth(): Promise<GarmentHealthCheck> {
  try {
    // FIX: your backend route is /health (not /api/health)
    const { data } = await http.get<GarmentHealthCheck>(`${GARMENT_API_BASE}/health`);
    console.log('🏥 Garment API Health:', data);
    return data;
  } catch (error) {
    console.error('❌ Garment API Health Check Failed:', error);
    throw new Error('Garment Extraction API is not available');
  }
}

/**
 * Download extracted garment image as Blob
 * Uses native fetch to avoid CORS preflight issues with axios
 *
 * @param cutoutUrl - URL from extraction response (can be absolute or relative)
 */
export async function downloadExtractedImage(
  cutoutUrl: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const fullUrl = resolveUrl(cutoutUrl);

  console.log('📥 Downloading extracted image:', fullUrl);

  try {
    // Use native fetch instead of axios to avoid CORS preflight
    // GET requests without custom headers don't trigger preflight
    const response = await fetch(fullUrl, {
      method: 'GET',
      signal,
      // Don't set any custom headers to avoid CORS preflight
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();

    console.log('✅ Downloaded extracted image:', {
      size: `${(blob.size / 1024).toFixed(2)} KB`,
      type: blob.type,
    });

    return blob;
  } catch (error) {
    console.error('❌ Download failed:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to download extracted image');
  }
}

/**
 * Convert extracted image URL to a File object
 * Useful for uploading extracted garment to VTON backend
 */
export async function extractedUrlToFile(
  cutoutUrl: string,
  fileName = 'extracted_garment.png',
): Promise<File> {
  const blob = await downloadExtractedImage(cutoutUrl);
  return new File([blob], fileName, { type: blob.type || 'image/png' });
}

/**
 * Full pipeline: Extract garment and convert to File for VTON (Direct Upload)
 */
export async function extractAndPrepareGarment(
  originalFile: File,
  signal?: AbortSignal,
): Promise<{
  result: GarmentProcessResponse;
  extractedFile: File | null;
}> {
  // Step 1: Extract garment
  const result = await extractGarment(originalFile, signal);

  // Step 2: If successful, download extracted image as File
  let extractedFile: File | null = null;

  if (result.success && result.extraction?.cutout_url) {
    const labelSafe = (result.classification?.label || 'garment').replace(/[^\w.-]+/g, '_');
    const fileName = `extracted_${labelSafe}.png`;
    extractedFile = await extractedUrlToFile(result.extraction.cutout_url, fileName);
  }

  return { result, extractedFile };
}

// ============================================================================
// CLOUDINARY-FIRST PIPELINE (Production Recommended)
// ============================================================================

/**
 * Upload image directly to Cloudinary (unsigned preset)
 * Bypasses backend for file upload, reducing server load and CORS issues
 *
 * @param file - Image file to upload
 * @param folder - Cloudinary folder path (default: 'garments/originals')
 * @returns Cloudinary upload response with secure_url
 */
export async function uploadToCloudinary(
  file: File,
  folder = 'garments/originals',
  signal?: AbortSignal,
): Promise<CloudinaryUploadResponse> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET'
    );
  }

  console.log('☁️ Uploading to Cloudinary:', {
    fileName: file.name,
    fileSize: `${(file.size / 1024).toFixed(2)} KB`,
    folder,
  });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const start = performance.now();

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
      signal,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Cloudinary upload failed:', errorText);
    throw new Error(`Cloudinary upload failed: ${response.status} ${errorText}`);
  }

  const data = await response.json() as CloudinaryUploadResponse;
  const took = performance.now() - start;

  console.log('✅ Cloudinary upload success:', {
    url: data.secure_url,
    publicId: data.public_id,
    size: `${(data.bytes / 1024).toFixed(2)} KB`,
    dimensions: `${data.width}x${data.height}`,
    format: data.format,
    uploadTime: `${took.toFixed(0)}ms`,
  });

  return data;
}

/**
 * Process garment by URL (backend fetches from Cloudinary)
 * Requires backend endpoint: POST /classify_garment_by_url
 *
 * @param sourceUrl - Cloudinary secure_url or any publicly accessible image URL
 * @returns Garment processing result
 */
export async function extractGarmentByUrl(
  sourceUrl: string,
  signal?: AbortSignal,
): Promise<GarmentProcessResponse> {
  console.log('🔗 Processing garment by URL:', sourceUrl);

  const start = performance.now();

  try {
    const { data } = await http.post(
      `${GARMENT_API_BASE}/classify_garment_by_url`,
      { source_url: sourceUrl },
      {
        signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    const took = performance.now() - start;

    // Backend response shape (same as direct upload)
    const response = data as {
      label: string;
      confidence: number;
      garment_url: string;
      cutout_url: string;
      cutout_path: string;
    };

    const result: GarmentProcessResponse = {
      success: true,
      processing_time_ms: took,
      classification: {
        label: response.label,
        confidence: response.confidence,
      },
      extraction: {
        cutout_url: response.cutout_url,
        garment_url: response.garment_url,
        cutout_path: response.cutout_path,
      },
    };

    console.log('✅ URL-based extraction success:', {
      label: result.classification?.label,
      confidence: result.classification?.confidence,
      cutoutUrl: result.extraction?.cutout_url,
      totalTime: `${took.toFixed(0)}ms`,
    });

    return result;
  } catch (err: unknown) {
    console.error('❌ URL-based extraction error:', err);

    if (err && typeof err === 'object' && 'response' in err) {
      const httpErr = err as { response?: { data?: { error?: string; detail?: string } } };
      const detail = httpErr.response?.data?.error || httpErr.response?.data?.detail;
      if (detail) throw new Error(detail);
    }

    if (err instanceof Error) throw err;
    throw new Error('Unknown error occurred during URL-based extraction');
  }
}

/**
 * Complete Cloudinary pipeline: Upload to Cloudinary → Process by URL
 *
 * Benefits:
 * - No large file uploads to backend (reduces server load)
 * - No CORS issues (Cloudinary has proper CORS)
 * - CDN benefits for serving images
 * - Backend only processes by URL (fetches from Cloudinary)
 *
 * @param file - Original garment image file
 * @returns Processing result with extracted garment
 */
export async function extractViaCloudinaryPipeline(
  file: File,
  signal?: AbortSignal,
): Promise<{
  result: GarmentProcessResponse;
  extractedFile: File | null;
  cloudinaryUrl?: string;
}> {
  console.log('🚀 Starting Cloudinary pipeline for:', file.name);

  // Step 1: Upload to Cloudinary
  const uploadResult = await uploadToCloudinary(file, 'garments/originals', signal);

  // Step 2: Process by URL
  const result = await extractGarmentByUrl(uploadResult.secure_url, signal);

  // Step 3: Download extracted image as File
  let extractedFile: File | null = null;

  if (result.success && result.extraction?.cutout_url) {
    const labelSafe = (result.classification?.label || 'garment').replace(/[^\w.-]+/g, '_');
    const fileName = `extracted_${labelSafe}.png`;
    extractedFile = await extractedUrlToFile(result.extraction.cutout_url, fileName);
  }

  return {
    result,
    extractedFile,
    cloudinaryUrl: uploadResult.secure_url,
  };
}

/**
 * Check if Cloudinary is configured
 */
export function isCloudinaryConfigured(): boolean {
  return !!(CLOUD_NAME && UPLOAD_PRESET);
}

// ============================================================================
// GARMENT TYPE DETECTION (Lightweight - No Extraction)
// ============================================================================

/**
 * Detect garment type only (no background removal or cloud upload)
 * Lightweight endpoint for quick classification
 *
 * @param file - Garment image file
 * @param signal - Optional AbortSignal for cancellation
 * @returns Classification result (label and confidence)
 */
export async function detectGarmentType(
  file: File,
  signal?: AbortSignal,
): Promise<{
  label: string;
  confidence: number;
  filename: string;
  file_size_bytes: number;
  content_type: string;
}> {
  console.log('🔍 Garment Type Detection Request:', {
    fileName: file.name,
    fileSize: `${(file.size / 1024).toFixed(2)} KB`,
    fileType: file.type,
  });

  // Client-side validation
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File too large. Maximum size is 10MB');
  }
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
    throw new Error('Invalid file type. Must be PNG, JPEG, or WEBP');
  }

  const formData = new FormData();
  formData.append('garment', file);

  const start = performance.now();

  try {
    const { data } = await http.post<{
      label: string;
      confidence: number;
      filename: string;
      file_size_bytes: number;
      content_type: string;
    }>(
      `${GARMENT_API_BASE}/detect_garment_type`,
      formData,
      {
        signal,
        headers: { Accept: 'application/json' },
      },
    );

    const took = performance.now() - start;

    console.log('✅ Garment Type Detection Success:', {
      label: data.label,
      confidence: `${(data.confidence * 100).toFixed(1)}%`,
      totalTime: `${Math.round(took)}ms`,
    });

    return data;
  } catch (err: unknown) {
    console.error('❌ Garment Type Detection Error:', err);

    if (err && typeof err === 'object' && 'response' in err) {
      const httpErr = err as { response?: { data?: { error?: string; detail?: string } } };
      const detail = httpErr.response?.data?.error || httpErr.response?.data?.detail;
      if (detail) throw new Error(detail);
    }

    if (err instanceof Error) throw err;
    throw new Error('Unknown error occurred during garment type detection');
  }
}

// ============================================================================
// OUTFIT CONSTRUCTION (Merge Upper + Lower Garments)
// ============================================================================

/**
 * Construct outfit by merging upper and lower garments
 * API endpoint: POST /construct_outfit
 *
 * @param upperGarment - Upper garment file (shirt, top, jacket)
 * @param lowerGarment - Lower garment file (pants, skirt, shorts)
 * @param signal - Optional AbortSignal for cancellation
 * @returns Constructed outfit with classification and URLs
 */
export async function constructOutfit(
  upperGarment: File,
  lowerGarment: File,
  signal?: AbortSignal,
): Promise<{
  success: boolean;
  upper_garment: {
    label: string;
    confidence: number;
    url: string;
    public_id: string;
  };
  lower_garment: {
    label: string;
    confidence: number;
    url: string;
    public_id: string;
  };
  outfit: {
    url: string;
    public_id: string;
    format: string;
  };
}> {
  console.log('🎨 Outfit Construction Request:', {
    upperFile: upperGarment.name,
    upperSize: `${(upperGarment.size / 1024).toFixed(2)} KB`,
    lowerFile: lowerGarment.name,
    lowerSize: `${(lowerGarment.size / 1024).toFixed(2)} KB`,
  });

  // Client-side validation
  if (upperGarment.size > 16 * 1024 * 1024) {
    throw new Error('Upper garment too large. Maximum size is 16MB');
  }
  if (lowerGarment.size > 16 * 1024 * 1024) {
    throw new Error('Lower garment too large. Maximum size is 16MB');
  }

  const formData = new FormData();
  formData.append('upper_garment', upperGarment);
  formData.append('lower_garment', lowerGarment);

  const start = performance.now();

  try {
    const { data } = await http.post<{
      success: boolean;
      upper_garment: {
        label: string;
        confidence: number;
        url: string;
        public_id: string;
      };
      lower_garment: {
        label: string;
        confidence: number;
        url: string;
        public_id: string;
      };
      outfit: {
        url: string;
        public_id: string;
        format: string;
      };
    }>(
      `${GARMENT_API_BASE}/construct_outfit`,
      formData,
      {
        signal,
        headers: { Accept: 'application/json' },
      },
    );

    const took = performance.now() - start;

    console.log('✅ Outfit Construction Success:', {
      upperLabel: data.upper_garment.label,
      upperConfidence: `${(data.upper_garment.confidence * 100).toFixed(1)}%`,
      lowerLabel: data.lower_garment.label,
      lowerConfidence: `${(data.lower_garment.confidence * 100).toFixed(1)}%`,
      outfitUrl: data.outfit.url,
      totalTime: `${Math.round(took)}ms`,
    });

    return data;
  } catch (err: unknown) {
    console.error('❌ Outfit Construction Error:', err);

    if (err && typeof err === 'object' && 'response' in err) {
      const httpErr = err as { response?: { data?: { error?: string; detail?: string } } };
      const detail = httpErr.response?.data?.error || httpErr.response?.data?.detail;
      if (detail) throw new Error(detail);
    }

    if (err instanceof Error) throw err;
    throw new Error('Unknown error occurred during outfit construction');
  }
}

// ============================================================================
// SMART PIPELINE SELECTOR (Auto-chooses best approach)
// ============================================================================

/**
 * Smart garment extraction that automatically chooses the best pipeline:
 * - If Cloudinary is configured → Uses Cloudinary pipeline (production recommended)
 * - If not → Falls back to direct upload pipeline
 *
 * This is the recommended function to use in your components.
 *
 * @param file - Garment image file to process
 * @param signal - Optional AbortSignal for cancellation
 * @param forceMethod - Optional: 'cloudinary' | 'direct' to force specific pipeline
 * @returns Processing result with extracted garment file
 */
export async function extractGarmentSmart(
  file: File,
  signal?: AbortSignal,
  forceMethod?: 'cloudinary' | 'direct',
): Promise<{
  result: GarmentProcessResponse;
  extractedFile: File | null;
  cloudinaryUrl?: string;
  method: 'cloudinary' | 'direct';
}> {
  // Determine which method to use
  const useCloudinary =
    forceMethod === 'cloudinary' ||
    (forceMethod !== 'direct' && isCloudinaryConfigured());

  if (useCloudinary) {
    console.log('🌩️ Using Cloudinary pipeline (production mode)');
    const cloudinaryResult = await extractViaCloudinaryPipeline(file, signal);
    return {
      ...cloudinaryResult,
      method: 'cloudinary',
    };
  } else {
    console.log('📤 Using direct upload pipeline (fallback mode)');
    const directResult = await extractAndPrepareGarment(file, signal);
    return {
      ...directResult,
      method: 'direct',
    };
  }
}
