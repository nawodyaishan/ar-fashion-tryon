import type { Transform } from './types';

/**
 * Compose a screenshot from video and overlay garment
 */
export async function composeScreenshot(
  videoElement: HTMLVideoElement,
  garmentImage: HTMLImageElement | null,
  transform: Transform,
): Promise<Blob> {
  // Create a temporary canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Set canvas size to match video
  canvas.width = videoElement.videoWidth || 1280;
  canvas.height = videoElement.videoHeight || 720;

  // Draw the video frame
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  // Draw the garment overlay if present
  if (garmentImage) {
    drawGarmentToCanvas(ctx, garmentImage, transform, canvas.width, canvas.height);
  }

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      },
      'image/png',
      1.0,
    );
  });
}

/**
 * Draw garment with transform to canvas
 */
function drawGarmentToCanvas(
  ctx: CanvasRenderingContext2D,
  garmentImage: HTMLImageElement,
  transform: Transform,
  canvasWidth: number,
  canvasHeight: number,
): void {
  ctx.save();

  // Calculate center position
  const centerX = canvasWidth / 2 + transform.x;
  const centerY = canvasHeight / 2 + transform.y;

  // Move to center
  ctx.translate(centerX, centerY);

  // Apply rotation
  ctx.rotate((transform.rotation * Math.PI) / 180);

  // Apply opacity
  ctx.globalAlpha = transform.opacity / 100;

  // Calculate scaled dimensions
  const scaledWidth = garmentImage.naturalWidth * transform.scale;
  const scaledHeight = garmentImage.naturalHeight * transform.scale;

  // Draw garment centered at origin
  ctx.drawImage(garmentImage, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);

  ctx.restore();
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Load an image from a file
 */
export function loadImageFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Get image dimensions
 */
export function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = src;
  });
}

/**
 * Calculate file size in KB
 */
export function getFileSizeKB(file: File): number {
  return Math.round(file.size / 1024);
}

/**
 * Compute average luminance from video frame (for low-light detection)
 */
export function computeAverageLuminance(videoElement: HTMLVideoElement): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) return 0;

  // Use a small canvas for performance
  const sampleWidth = 160;
  const sampleHeight = 120;

  canvas.width = sampleWidth;
  canvas.height = sampleHeight;

  // Draw scaled video frame
  ctx.drawImage(videoElement, 0, 0, sampleWidth, sampleHeight);

  // Get image data
  const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
  const data = imageData.data;

  let sum = 0;

  // Calculate average luminance using rec709 luma coefficients
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sum += luma;
  }

  return sum / (sampleWidth * sampleHeight);
}

/**
 * Create a split comparison image (before/after)
 */
export async function createSplitImage(
  beforeSrc: string,
  afterSrc: string,
  splitPosition: number = 0.5,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    const beforeImg = new Image();
    const afterImg = new Image();

    let loadedCount = 0;

    const onLoad = () => {
      loadedCount++;
      if (loadedCount === 2) {
        // Set canvas size
        canvas.width = beforeImg.naturalWidth;
        canvas.height = beforeImg.naturalHeight;

        const splitX = canvas.width * splitPosition;

        // Draw left side (before)
        ctx.save();
        ctx.rect(0, 0, splitX, canvas.height);
        ctx.clip();
        ctx.drawImage(beforeImg, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        // Draw right side (after)
        ctx.save();
        ctx.rect(splitX, 0, canvas.width - splitX, canvas.height);
        ctx.clip();
        ctx.drawImage(afterImg, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        // Draw split line
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(splitX, 0);
        ctx.lineTo(splitX, canvas.height);
        ctx.stroke();

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          'image/png',
          1.0,
        );
      }
    };

    beforeImg.onload = onLoad;
    afterImg.onload = onLoad;

    beforeImg.onerror = () => reject(new Error('Failed to load before image'));
    afterImg.onerror = () => reject(new Error('Failed to load after image'));

    beforeImg.src = beforeSrc;
    afterImg.src = afterSrc;
  });
}
