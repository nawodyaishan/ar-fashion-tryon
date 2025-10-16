import { http, garmentHttp } from './http';
import type { ClothType, VtonOptions, VirtualTryonResponse } from '@/lib/types';

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
  onUploadProgress?: (progressEvent: { loaded: number; total?: number; progress?: number }) => void,
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
      onUploadProgress: onUploadProgress
        ? (progressEvent) => {
            const total = progressEvent.total || 0;
            const loaded = progressEvent.loaded;
            const progress = total > 0 ? Math.round((loaded * 100) / total) : 0;
            onUploadProgress({ loaded, total, progress });
          }
        : undefined,
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

/**
 * Virtual Try-On via FastAPI Gradio Integration
 *
 * This endpoint combines garment processing and virtual try-on in a single call:
 * 1. Uploads images to Cloudinary
 * 2. Optionally processes garment (classify + background removal)
 * 3. Calls Gradio API for virtual try-on
 * 4. Returns Cloudinary URLs for all images
 *
 * @param payload - Person and garment images with options
 * @param processGarment - Whether to classify/cutout garment first (default: true)
 * @param signal - AbortSignal for cancellation
 * @returns VirtualTryonResponse with Cloudinary URLs
 */
export async function virtualTryOn(
  payload: ProcessImagesPayload,
  processGarment: boolean = true,
  signal?: AbortSignal,
): Promise<VirtualTryonResponse> {
  const fd = new FormData();

  // Add person_image (required)
  if (payload.bodyFile) {
    fd.append('person_image', payload.bodyFile, payload.bodyFile.name);
  } else if (payload.bodyDataUrl) {
    const res = await fetch(payload.bodyDataUrl);
    const blob = await res.blob();
    fd.append('person_image', blob, 'person.jpg');
  } else {
    throw new Error('Person image is required');
  }

  // Add garment_image (required)
  if (payload.garmentFile) {
    fd.append('garment_image', payload.garmentFile, payload.garmentFile.name);
  } else if (payload.garmentDataUrl) {
    const res = await fetch(payload.garmentDataUrl);
    const blob = await res.blob();
    fd.append('garment_image', blob, 'garment.jpg');
  } else {
    throw new Error('Garment image is required');
  }

  // Add cloth_type (default to 'upper')
  const clothType = payload.clothType || payload.options?.clothType || 'upper';
  fd.append('cloth_type', clothType);

  // Add inference parameters
  const numInferenceSteps = payload.options?.numInferenceSteps ?? 50;
  const guidanceScale = payload.options?.guidanceScale ?? 2.5;
  const seed = payload.options?.seed ?? 42;

  fd.append('num_inference_steps', numInferenceSteps.toString());
  fd.append('guidance_scale', guidanceScale.toString());
  fd.append('seed', seed.toString());
  fd.append('show_type', 'result only'); // Options: "result only", "input & result", "input & mask & result"
  fd.append('process_garment', processGarment.toString());

  // Log request
  console.log('🚀 Virtual Try-On Request:', {
    endpoint: '/virtual_tryon',
    person_image: payload.bodyFile?.name || 'data URL',
    garment_image: payload.garmentFile?.name || 'data URL',
    cloth_type: clothType,
    num_inference_steps: numInferenceSteps,
    guidance_scale: guidanceScale,
    seed: seed,
    process_garment: processGarment,
  });

  const startTime = Date.now();

  try {
    // Backend returns JSON with Cloudinary URLs
    const { data } = await garmentHttp.post<VirtualTryonResponse>('/virtual_tryon', fd, {
      signal,
      headers: {
        Accept: 'application/json',
      },
    });

    const duration = Date.now() - startTime;
    console.log('✅ Virtual Try-On Success:', {
      duration: `${(duration / 1000).toFixed(2)}s`,
      result_url: data.result_url,
      cloth_type: data.cloth_type,
      garment_classification: data.garment_classification,
    });

    return data;
  } catch (error: unknown) {
    const err = error as { response?: { status?: number; statusText?: string; data?: { detail?: string } }; message?: string };
    const duration = Date.now() - startTime;
    console.error('❌ Virtual Try-On Error:', {
      duration: `${(duration / 1000).toFixed(2)}s`,
      status: err.response?.status,
      statusText: err.response?.statusText,
      detail: err.response?.data?.detail,
      message: err.message,
    });

    // Extract error message
    const errorMsg = err.response?.data?.detail || err.message || 'Virtual try-on failed';
    throw new Error(errorMsg);
  }
}
