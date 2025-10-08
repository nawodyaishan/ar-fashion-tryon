import { http } from './http';
import type { ClothType, VtonOptions } from '@/lib/types';

export interface ProcessImagesPayload {
  bodyFile?: File; // person_image
  bodyDataUrl?: string; // fallback
  garmentFile?: File; // cloth_image
  garmentDataUrl?: string; // fallback
  garmentId?: string; // optional if using gallery IDs
  clothType?: ClothType; // upper, lower, full
  options?: VtonOptions;
}

/**
 * Process images using ML backend
 * Endpoint: POST /process_images/
 * Fields: person_image, cloth_image, cloth_type, num_inference_steps, guidance_scale, seed
 * Returns: Image file (blob)
 */
export async function processImages(
  payload: ProcessImagesPayload,
  signal?: AbortSignal,
): Promise<Blob> {
  const fd = new FormData();

  // Add person_image (body photo)
  if (payload.bodyFile) {
    fd.append('person_image', payload.bodyFile, payload.bodyFile.name);
  } else if (payload.bodyDataUrl) {
    const res = await fetch(payload.bodyDataUrl);
    const blob = await res.blob();
    fd.append('person_image', blob, 'person.jpg');
  } else {
    throw new Error('Body image (person_image) is required');
  }

  // Add cloth_image (garment photo)
  if (payload.garmentFile) {
    fd.append('cloth_image', payload.garmentFile, payload.garmentFile.name);
  } else if (payload.garmentDataUrl) {
    const res = await fetch(payload.garmentDataUrl);
    const blob = await res.blob();
    fd.append('cloth_image', blob, 'cloth.jpg');
  } else if (!payload.garmentId) {
    throw new Error('Garment image (cloth_image) is required');
  }

  // Add cloth_type (default to 'upper')
  const clothType = payload.clothType || payload.options?.clothType || 'upper';
  fd.append('cloth_type', clothType);

  // Add optional inference parameters
  const numInferenceSteps = payload.options?.numInferenceSteps ?? 50;
  const guidanceScale = payload.options?.guidanceScale ?? 2.5;
  const seed = payload.options?.seed ?? 42;

  fd.append('num_inference_steps', numInferenceSteps.toString());
  fd.append('guidance_scale', guidanceScale.toString());
  fd.append('seed', seed.toString());

  // Log request
  console.log('🚀 VTON API Request:', {
    endpoint: '/process_images/',
    person_image: payload.bodyFile?.name || 'data URL',
    cloth_image: payload.garmentFile?.name || 'data URL',
    cloth_type: clothType,
    num_inference_steps: numInferenceSteps,
    guidance_scale: guidanceScale,
    seed: seed,
  });

  const startTime = Date.now();

  try {
    // Backend returns image file, not JSON
    const { data } = await http.post<Blob>('/process_images/', fd, {
      signal,
      headers: {
        Accept: 'image/png, image/jpeg, image/*',
      },
      responseType: 'blob', // Important: expect binary response
    });

    const duration = Date.now() - startTime;
    console.log('✅ VTON API Success:', {
      duration: `${(duration / 1000).toFixed(2)}s`,
      size: `${(data.size / 1024).toFixed(2)} KB`,
      type: data.type,
    });

    return data;
  } catch (error: unknown) {
    const err = error as { response?: { status?: number; statusText?: string; data?: Blob }; message?: string };
    const duration = Date.now() - startTime;
    console.error('❌ VTON API Error:', {
      duration: `${(duration / 1000).toFixed(2)}s`,
      status: err.response?.status,
      statusText: err.response?.statusText,
      message: err.message,
    });

    // Handle error response
    if (err.response?.data) {
      // Try to parse error from blob if it's JSON
      try {
        const errorText = await err.response.data.text();
        const errorJson = JSON.parse(errorText);
        const errorMsg = errorJson.detail || errorJson.message || 'Processing failed';
        console.error('❌ VTON API Error Details:', errorJson);
        throw new Error(errorMsg);
      } catch {
        throw new Error('Processing failed');
      }
    }
    throw error;
  }
}

// Legacy functions (kept for compatibility, but redirect to processImages)
export async function startTryOn(payload: ProcessImagesPayload, signal?: AbortSignal) {
  return processImages(payload, signal);
}

export async function getJob(jobId: string, signal?: AbortSignal) {
  // ML backend doesn't use job polling, so this is a no-op
  console.warn('Job polling not supported by ML backend', { jobId, signal });
  throw new Error('Job polling not supported by ML backend');
}
