/**
 * Image Quality Heuristics
 * Client-side validation for image quality before upload/processing
 */

export type QualityLevel = 'GOOD' | 'OK' | 'POOR';

export interface QualityCheck {
  level: QualityLevel;
  resolution: { ok: boolean; width: number; height: number; message?: string };
  brightness: { ok: boolean; avgLuma: number; message?: string };
  aspectRatio: { ok: boolean; ratio: number; message?: string };
  suggestions: string[];
}

/**
 * Analyze image quality from a File object
 * @param file - Image file to analyze
 * @param expectedAspect - Expected aspect ratio (e.g., 3/4 for body photos, 1 for garments)
 * @param tolerance - Aspect ratio tolerance (default: 0.3)
 * @returns Quality check results
 */
export async function analyzeImageQuality(
  file: File,
  expectedAspect?: number,
  tolerance: number = 0.3,
): Promise<QualityCheck> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const { width, height } = img;
      const aspectRatio = width / height;

      // Resolution check
      const resolutionCheck = checkResolution(width, height);

      // Brightness check (draw to canvas and analyze pixels)
      const brightnessCheck = checkBrightness(img);

      // Aspect ratio check
      const aspectCheck = expectedAspect
        ? checkAspectRatio(aspectRatio, expectedAspect, tolerance)
        : { ok: true, ratio: aspectRatio };

      // Determine overall quality level
      const checks = [resolutionCheck, brightnessCheck, aspectCheck];
      const failedChecks = checks.filter((c) => !c.ok).length;

      let level: QualityLevel;
      if (failedChecks === 0) {
        level = 'GOOD';
      } else if (failedChecks === 1) {
        level = 'OK';
      } else {
        level = 'POOR';
      }

      // Collect suggestions
      const suggestions: string[] = [];
      if (!resolutionCheck.ok && resolutionCheck.message) {
        suggestions.push(resolutionCheck.message);
      }
      if (!brightnessCheck.ok && brightnessCheck.message) {
        suggestions.push(brightnessCheck.message);
      }
      if (!aspectCheck.ok && aspectCheck.message) {
        suggestions.push(aspectCheck.message);
      }

      resolve({
        level,
        resolution: resolutionCheck,
        brightness: brightnessCheck,
        aspectRatio: aspectCheck,
        suggestions,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Check if image resolution meets minimum requirements
 */
function checkResolution(width: number, height: number) {
  const minResolution = 800; // minimum width or height
  const idealResolution = 1024; // recommended minimum

  if (width < minResolution || height < minResolution) {
    return {
      ok: false,
      width,
      height,
      message: 'Low resolution; results may be blurry. Recommended: 1024px minimum.',
    };
  }

  if (width < idealResolution || height < idealResolution) {
    return {
      ok: true, // passes, but not ideal
      width,
      height,
      message: 'Resolution acceptable. For best results, use 1024px or higher.',
    };
  }

  return { ok: true, width, height };
}

/**
 * Check image brightness by analyzing average luminance
 */
function checkBrightness(img: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    return { ok: true, avgLuma: 0 }; // Can't check, assume OK
  }

  // Resize to small canvas for performance
  const sampleSize = 100;
  canvas.width = sampleSize;
  canvas.height = sampleSize;

  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

  try {
    const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
    const data = imageData.data;

    let totalLuma = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Calculate luminance (perceived brightness)
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      totalLuma += luma;
    }

    const avgLuma = totalLuma / (sampleSize * sampleSize);

    // Check if too dark or too bright
    if (avgLuma < 50) {
      return {
        ok: false,
        avgLuma,
        message: 'Image is too dark. Use better lighting.',
      };
    }

    if (avgLuma > 230) {
      return {
        ok: false,
        avgLuma,
        message: 'Image is overexposed. Reduce lighting or adjust camera.',
      };
    }

    return { ok: true, avgLuma };
  } catch {
    // Security error or canvas tainting
    return { ok: true, avgLuma: 0 };
  }
}

/**
 * Check if aspect ratio is within expected range
 */
function checkAspectRatio(
  actualRatio: number,
  expectedRatio: number,
  tolerance: number,
) {
  const diff = Math.abs(actualRatio - expectedRatio);
  const ok = diff <= tolerance;

  if (!ok) {
    const expectedStr =
      expectedRatio === 3 / 4
        ? 'portrait (3:4)'
        : expectedRatio === 1
          ? 'square (1:1)'
          : `${expectedRatio.toFixed(2)}:1`;

    return {
      ok: false,
      ratio: actualRatio,
      message: `Aspect ratio is off. Expected ${expectedStr}.`,
    };
  }

  return { ok: true, ratio: actualRatio };
}

/**
 * Quick validation for file size
 */
export function checkFileSize(file: File, maxMB: number = 10): { ok: boolean; message?: string } {
  const maxBytes = maxMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      ok: false,
      message: `File size exceeds ${maxMB}MB limit.`,
    };
  }
  return { ok: true };
}

/**
 * Check if file type is valid
 */
export function checkFileType(file: File): { ok: boolean; message?: string } {
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      ok: false,
      message: 'Invalid file type. Please upload PNG, JPEG, or WEBP.',
    };
  }
  return { ok: true };
}

/**
 * Format quality check results for display
 */
export function formatQualityMessage(check: QualityCheck): string {
  if (check.level === 'GOOD') {
    return '✓ Image quality is good';
  }

  if (check.level === 'OK') {
    return `⚠ Image quality is acceptable${check.suggestions.length > 0 ? `, but: ${check.suggestions.join(' ')}` : ''}`;
  }

  return `⚠ Image quality is poor: ${check.suggestions.join(' ')}`;
}
