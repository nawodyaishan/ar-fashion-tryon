/**
 * Image Conversion Utilities
 * Handles conversion of unsupported formats (WebP) to backend-compatible formats (PNG/JPEG)
 */

/**
 * Detects if a file is a WebP image
 */
export function isWebP(file: File): boolean {
  return file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp');
}

/**
 * Converts a WebP (or any image) file to PNG format using Canvas API
 * @param file - The image file to convert
 * @param targetFormat - Target format: 'png' or 'jpeg' (default: 'png')
 * @param quality - JPEG quality (0-1, only used for JPEG)
 * @returns Converted File object
 */
export async function convertImageFormat(
  file: File,
  targetFormat: 'png' | 'jpeg' = 'png',
  quality: number = 0.95,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        // Create canvas with image dimensions
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // Draw image to canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        ctx.drawImage(img, 0, 0);

        // Convert canvas to Blob
        canvas.toBlob(
          (blob) => {
            // Clean up object URL
            URL.revokeObjectURL(objectUrl);

            if (!blob) {
              reject(new Error('Failed to convert image'));
              return;
            }

            // Create new File from Blob with original filename but new extension
            const originalName = file.name.replace(/\.[^.]+$/, '');
            const extension = targetFormat === 'png' ? 'png' : 'jpg';
            const newFileName = `${originalName}.${extension}`;

            const convertedFile = new File([blob], newFileName, {
              type: targetFormat === 'png' ? 'image/png' : 'image/jpeg',
              lastModified: Date.now(),
            });

            resolve(convertedFile);
          },
          targetFormat === 'png' ? 'image/png' : 'image/jpeg',
          quality,
        );
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}

/**
 * Automatically converts WebP images to PNG, passes through other formats
 * @param file - The image file to process
 * @returns Original file if not WebP, converted PNG if WebP
 */
export async function ensureBackendCompatibleFormat(file: File): Promise<{
  file: File;
  converted: boolean;
  originalFormat?: string;
}> {
  if (isWebP(file)) {
    console.log('🔄 Converting WebP to PNG:', file.name);
    const startTime = Date.now();

    try {
      const convertedFile = await convertImageFormat(file, 'png');
      const duration = Date.now() - startTime;

      console.log('✅ WebP conversion complete:', {
        original: file.name,
        converted: convertedFile.name,
        originalSize: `${(file.size / 1024).toFixed(2)}KB`,
        convertedSize: `${(convertedFile.size / 1024).toFixed(2)}KB`,
        duration: `${duration}ms`,
      });

      return {
        file: convertedFile,
        converted: true,
        originalFormat: 'webp',
      };
    } catch (error) {
      console.error('❌ WebP conversion failed:', error);
      throw new Error('Failed to convert WebP image. Please use PNG or JPEG format.');
    }
  }

  // Pass through other formats (PNG, JPEG, etc.)
  return {
    file,
    converted: false,
  };
}

/**
 * Validates that an image format is supported by the backend
 * @param file - The image file to validate
 * @returns true if supported (PNG, JPEG, JPG), false otherwise
 */
export function isBackendSupportedFormat(file: File): boolean {
  const supportedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  const supportedExtensions = ['.png', '.jpg', '.jpeg'];

  const hasValidType = supportedTypes.includes(file.type.toLowerCase());
  const hasValidExtension = supportedExtensions.some((ext) =>
    file.name.toLowerCase().endsWith(ext),
  );

  return hasValidType || hasValidExtension;
}
