// lib/services/gradioApi.ts - Gradio HuggingFace Space API Client

import type { ClothType } from '@/lib/types';

// Gradio API Configuration
const GRADIO_API_URL =
  process.env.NEXT_PUBLIC_GRADIO_API_URL ||
  'https://nawodyaishan-ar-fashion-tryon.hf.space';

const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || '120000', 10); // 120 seconds

/**
 * Gradio API Request Format
 */
interface GradioRequest {
  data: [
    { background: string; layers: never[] }, // Person image (base64)
    string, // Cloth image (base64)
    ClothType, // Garment type
    number, // num_inference_steps
    number, // guidance_scale
    number, // seed
    string, // output_type: "result only"
  ];
}

/**
 * Gradio API Response Format
 */
interface GradioResponse {
  data: [string]; // Array with single base64 image string
  duration?: number;
  average_duration?: number;
}

/**
 * Gradio API Error Response
 */
interface GradioErrorResponse {
  error?: string;
  detail?: string;
  message?: string;
}

/**
 * Convert File to base64 data URL
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Process images using Gradio API on HuggingFace Space
 *
 * @param personFile - Person/body photo
 * @param clothFile - Garment photo (should be extracted/background removed)
 * @param clothType - Type of garment (upper/lower/overall)
 * @param numInferenceSteps - Number of inference steps (default: 50)
 * @param guidanceScale - Guidance scale (default: 2.5)
 * @param seed - Random seed for reproducibility (default: 42)
 * @param signal - AbortSignal for cancellation
 * @returns Base64 data URL of result image
 */
export async function processWithGradio(
  personFile: File,
  clothFile: File,
  clothType: ClothType = 'upper',
  numInferenceSteps = 50,
  guidanceScale = 2.5,
  seed = 42,
  signal?: AbortSignal,
): Promise<string> {
  console.log('🚀 Gradio API Request:', {
    personFile: personFile.name,
    personSize: `${(personFile.size / 1024).toFixed(2)} KB`,
    clothFile: clothFile.name,
    clothSize: `${(clothFile.size / 1024).toFixed(2)} KB`,
    clothType,
    numInferenceSteps,
    guidanceScale,
    seed,
  });

  const startTime = Date.now();

  try {
    // Step 1: Convert images to base64
    console.log('🔄 Converting images to base64...');
    const [personBase64, clothBase64] = await Promise.all([
      fileToBase64(personFile),
      fileToBase64(clothFile),
    ]);

    // Step 2: Prepare Gradio request
    const requestData: GradioRequest = {
      data: [
        {
          background: personBase64,
          layers: [],
        },
        clothBase64,
        clothType,
        numInferenceSteps,
        guidanceScale,
        seed,
        'result only', // output_type
      ],
    };

    console.log('📤 Sending to Gradio API...');

    // Step 3: Call Gradio API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    // Use provided signal or timeout signal
    const finalSignal = signal || controller.signal;

    const response = await fetch(`${GRADIO_API_URL}/api/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
      signal: finalSignal,
    });

    clearTimeout(timeoutId);

    // Step 4: Handle HTTP errors
    if (!response.ok) {
      const errorData: GradioErrorResponse = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.error || errorData.detail || errorData.message || 'Gradio API request failed';
      throw new Error(`HTTP ${response.status}: ${errorMessage}`);
    }

    // Step 5: Parse response
    const result: GradioResponse = await response.json();

    if (!result.data || !result.data[0]) {
      throw new Error('Invalid response from Gradio API: No image data');
    }

    const resultImage = result.data[0];
    const duration = Date.now() - startTime;

    console.log('✅ Gradio API Success:', {
      duration: `${(duration / 1000).toFixed(2)}s`,
      avgDuration: result.average_duration
        ? `${result.average_duration.toFixed(2)}s`
        : 'N/A',
      imageSize: `${(resultImage.length / 1024).toFixed(2)} KB`,
    });

    return resultImage; // Returns base64 data URL
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    console.error('❌ Gradio API Error:', {
      duration: `${(duration / 1000).toFixed(2)}s`,
      error,
    });

    // Handle abort
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout. Please try again.');
    }

    // Handle network errors
    if (error instanceof TypeError) {
      throw new Error('Network error. Please check your connection.');
    }

    // Re-throw with context
    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Unknown error occurred during processing');
  }
}

/**
 * Check if Gradio API is available
 */
export async function checkGradioHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${GRADIO_API_URL}/`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });

    const isHealthy = response.ok;
    console.log('🏥 Gradio API Health:', isHealthy ? '✅ Available' : '❌ Unavailable');

    return isHealthy;
  } catch (error) {
    console.error('❌ Gradio API Health Check Failed:', error);
    return false;
  }
}

/**
 * Convert base64 data URL to Blob
 */
export function base64ToBlob(base64: string): Blob {
  // Remove data URL prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;

  // Decode base64
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Determine MIME type from data URL
  const mimeMatch = base64.match(/data:([^;]+);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

  return new Blob([bytes], { type: mimeType });
}

/**
 * Download result image from base64
 */
export function downloadBase64Image(base64: string, filename = 'tryon-result.png') {
  const blob = base64ToBlob(base64);
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}
