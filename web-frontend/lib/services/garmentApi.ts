// lib/services/garmentApi.ts - Garment Extraction API Service

import type {
  GarmentProcessResponse,
  GarmentExtractionError,
  GarmentHealthCheck,
} from '@/lib/types';
import { http } from './http';

// API Base URL for Garment Extraction Service
const GARMENT_API_BASE =
  process.env.NEXT_PUBLIC_GARMENT_API_BASE || 'http://localhost:5000';

/**
 * Process a garment image through the extraction API
 *
 * @param file - Image file to process (max 10MB, JPEG/PNG/WEBP)
 * @param signal - Optional AbortSignal for cancellation
 * @returns GarmentProcessResponse with classification and extracted image
 * @throws Error if request fails or file is invalid
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

  // Client-side validation
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File too large. Maximum size is 10MB');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Invalid file type. Must be an image (JPEG, PNG, WEBP)');
  }

  // Create FormData
  const formData = new FormData();
  formData.append('file', file);

  const startTime = Date.now();

  try {
    // POST to extraction API
    const { data } = await http.post<GarmentProcessResponse>(
      `${GARMENT_API_BASE}/api/process`,
      formData,
      {
        signal,
        headers: {
          Accept: 'application/json',
        },
        // Note: Don't set Content-Type - browser will set it with boundary for FormData
      },
    );

    const duration = Date.now() - startTime;

    if (data.success) {
      console.log('✅ Garment Extraction Success:', {
        label: data.classification?.label,
        confidence: `${((data.classification?.confidence || 0) * 100).toFixed(2)}%`,
        processingTime: `${data.processing_time_ms?.toFixed(2)}ms`,
        totalTime: `${duration}ms`,
        extractedUrl: data.extraction?.cutout_url,
      });
    } else {
      console.warn('⚠️ Garment Extraction Failed:', {
        message: data.message,
        label: data.classification?.label,
        confidence: data.classification?.confidence,
      });
    }

    return data;
  } catch (error: unknown) {
    console.error('❌ Garment Extraction Error:', error);

    // Handle HTTP errors
    if (error && typeof error === 'object' && 'response' in error) {
      const httpError = error as { response?: { data?: GarmentExtractionError } };
      const detail = httpError.response?.data?.detail;
      if (detail) {
        throw new Error(detail);
      }
    }

    // Re-throw original error if not HTTP error
    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Unknown error occurred during garment extraction');
  }
}

/**
 * Check health status of the Garment Extraction API
 *
 * @returns GarmentHealthCheck with API and model status
 */
export async function checkGarmentApiHealth(): Promise<GarmentHealthCheck> {
  try {
    const { data } = await http.get<GarmentHealthCheck>(
      `${GARMENT_API_BASE}/api/health`,
    );

    console.log('🏥 Garment API Health:', data);
    return data;
  } catch (error) {
    console.error('❌ Garment API Health Check Failed:', error);
    throw new Error('Garment Extraction API is not available');
  }
}

/**
 * Download extracted garment image as Blob
 *
 * @param cutoutUrl - URL from extraction response (e.g., "/static/outputs/cutout_xxx.png")
 * @param signal - Optional AbortSignal for cancellation
 * @returns Blob of the extracted image
 */
export async function downloadExtractedImage(
  cutoutUrl: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const fullUrl = `${GARMENT_API_BASE}${cutoutUrl}`;

  console.log('📥 Downloading extracted image:', fullUrl);

  try {
    const { data } = await http.get<Blob>(fullUrl, {
      signal,
      responseType: 'blob',
    });

    console.log('✅ Downloaded extracted image:', {
      size: `${(data.size / 1024).toFixed(2)} KB`,
      type: data.type,
    });

    return data;
  } catch (error) {
    console.error('❌ Download failed:', error);
    throw new Error('Failed to download extracted image');
  }
}

/**
 * Convert extracted image URL to a File object
 * Useful for uploading extracted garment to VTON backend
 *
 * @param cutoutUrl - URL from extraction response
 * @param fileName - Optional custom filename
 * @returns File object
 */
export async function extractedUrlToFile(
  cutoutUrl: string,
  fileName = 'extracted_garment.png',
): Promise<File> {
  const blob = await downloadExtractedImage(cutoutUrl);
  return new File([blob], fileName, { type: blob.type });
}

/**
 * Full pipeline: Extract garment and convert to File for VTON
 *
 * @param originalFile - Original garment image
 * @param signal - Optional AbortSignal
 * @returns Object with extraction result and extracted File
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

  if (result.success && result.extraction) {
    const fileName = `extracted_${result.classification?.label || 'garment'}.png`;
    extractedFile = await extractedUrlToFile(result.extraction.cutout_url, fileName);
  }

  return { result, extractedFile };
}
