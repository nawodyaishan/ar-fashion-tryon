// lib/store/useVtonStore.ts
import { create } from 'zustand';
import type { VtonOptions, ClothType } from '@/lib/types';
import { virtualTryOn } from '@/lib/services/vtonApi';
import { detectGarmentType, constructOutfit } from '@/lib/services/garmentApi';

// Three different try-on paths
export type TryOnPath = 'NORMAL' | 'FULL' | 'REFERENCE';
export type VtonStep = 'PATH_SELECT' | 'BODY' | 'GARMENT' | 'UPPER' | 'LOWER' | 'PREVIEW' | 'GENERATE' | 'RESULT';

interface ImageSelection {
  file?: File;
  previewUrl?: string;
}

interface GarmentClassification {
  label: string;
  confidence: number;
  detectedType?: 'upper' | 'lower' | 'full';
}

interface OutfitData {
  url?: string;
  publicId?: string;
  upperLabel?: string;
  lowerLabel?: string;
  upperConfidence?: number;
  lowerConfidence?: number;
}

interface VtonState {
  // Path selection
  tryOnPath: TryOnPath;
  step: VtonStep;

  // Image selections
  body: ImageSelection;
  garment: ImageSelection & { id?: string; classification?: GarmentClassification };
  upperGarment: ImageSelection & { classification?: GarmentClassification };
  lowerGarment: ImageSelection & { classification?: GarmentClassification };

  // Outfit construction data (for FULL mode)
  outfit: OutfitData;

  // Options
  options: VtonOptions;

  // Status
  status: 'idle' | 'valid' | 'uploading' | 'classifying' | 'constructing' | 'processing' | 'done' | 'error';
  resultUrl?: string;
  error?: string;

  // Actions
  setPath: (path: TryOnPath) => void;
  setStep: (s: VtonStep) => void;
  setBody: (file: File | undefined) => void;

  // Normal path - single garment
  setGarmentFile: (file: File | undefined, skipClassification?: boolean) => Promise<{ ok: boolean; message?: string }>;

  // Full mode - upper and lower garments
  setUpperGarment: (file: File | undefined) => Promise<{ ok: boolean; message?: string }>;
  setLowerGarment: (file: File | undefined) => Promise<{ ok: boolean; message?: string }>;
  constructOutfitPreview: () => Promise<void>;

  setOptions: (opts: Partial<VtonOptions>) => void;
  reset: () => void;

  // Helpers
  getAvailableClothTypes: () => ClothType[];
  canProceedToGenerate: () => boolean;

  // Try-on execution
  tryOn: () => Promise<void>;
}

export const useVtonStore = create<VtonState>((set, get) => ({
  // Initial state
  tryOnPath: 'NORMAL',
  step: 'PATH_SELECT',
  body: {},
  garment: {},
  upperGarment: {},
  lowerGarment: {},
  outfit: {},
  options: { clothType: 'upper' },
  status: 'idle',

  setPath: (path) => {
    set({
      tryOnPath: path,
      step: 'BODY',
      // Reset garments when switching paths
      garment: {},
      upperGarment: {},
      lowerGarment: {},
      outfit: {},
      // FULL and REFERENCE default to 'overall', NORMAL defaults to 'upper'
      options: { ...get().options, clothType: (path === 'FULL' || path === 'REFERENCE') ? 'overall' : 'upper' }
    });
  },

  setStep: (s) => set({ step: s }),

  setBody: (file) => {
    const previewUrl = file ? URL.createObjectURL(file) : undefined;
    set({ body: { file, previewUrl } });
  },

  // Normal path & Reference path - single garment upload
  setGarmentFile: async (file, skipClassification = false) => {
    if (!file) {
      set({
        garment: {
          ...get().garment,
          file: undefined,
          previewUrl: undefined,
          id: undefined,
          classification: undefined
        }
      });
      return { ok: false, message: 'No garment file' };
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      const msg = 'Invalid file type. Please upload PNG, JPEG, or WEBP image.';
      set({ status: 'error', error: msg });
      return { ok: false, message: msg };
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      const msg = 'File too large. Maximum size is 10MB.';
      set({ status: 'error', error: msg });
      return { ok: false, message: msg };
    }

    const previewUrl = URL.createObjectURL(file);

    // Set initial state with preview
    set({
      garment: { ...get().garment, file, previewUrl, id: undefined },
      status: skipClassification ? 'valid' : 'classifying',
      error: undefined,
    });

    // Skip classification for REFERENCE path
    if (skipClassification) {
      return { ok: true };
    }

    // Classify garment type for NORMAL path
    try {
      const classification = await detectGarmentType(file);

      // Map label to detected type for UI
      const label = classification.label.toUpperCase();
      let detectedType: 'upper' | 'lower' | 'full' | undefined;

      // Map common garment labels to types
      if (label.includes('SHIRT') || label.includes('TOP') || label.includes('BLOUSE') || label.includes('JACKET')) {
        detectedType = 'upper';
      } else if (label.includes('TROUSER') || label.includes('PANT') || label.includes('JEAN') || label.includes('SHORT')) {
        detectedType = 'lower';
      } else if (label.includes('DRESS') || label.includes('GOWN') || label.includes('SUIT')) {
        detectedType = 'full';
      }

      set({
        garment: {
          ...get().garment,
          file,
          previewUrl,
          id: undefined,
          classification: {
            label: classification.label,
            confidence: classification.confidence,
            detectedType,
          },
        },
        status: 'valid',
      });

      console.log('✅ Garment classified:', {
        name: file.name,
        label: classification.label,
        confidence: `${(classification.confidence * 100).toFixed(1)}%`,
        detectedType,
      });

      return { ok: true };
    } catch (err: unknown) {
      const error = err as Error;
      const msg = error?.message || 'Garment classification failed';

      console.warn('⚠️ Classification failed, continuing with upload:', msg);

      // Continue without classification
      set({
        garment: {
          ...get().garment,
          file,
          previewUrl,
          id: undefined,
          classification: undefined,
        },
        status: 'valid',
      });

      return { ok: true }; // Still return ok, classification is optional
    }
  },

  // Full mode - upper garment upload
  setUpperGarment: async (file) => {
    if (!file) {
      set({ upperGarment: {} });
      return { ok: false, message: 'No upper garment file' };
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      const msg = 'Invalid file type. Please upload PNG, JPEG, or WEBP image.';
      return { ok: false, message: msg };
    }

    if (file.size > 10 * 1024 * 1024) {
      const msg = 'File too large. Maximum size is 10MB.';
      return { ok: false, message: msg };
    }

    const previewUrl = URL.createObjectURL(file);
    set({
      upperGarment: { file, previewUrl },
      status: 'classifying',
    });

    // Classify upper garment
    try {
      const classification = await detectGarmentType(file);
      const label = classification.label.toUpperCase();
      let detectedType: 'upper' | 'lower' | 'full' | undefined;

      if (label.includes('SHIRT') || label.includes('TOP') || label.includes('BLOUSE') || label.includes('JACKET')) {
        detectedType = 'upper';
      }

      set({
        upperGarment: {
          file,
          previewUrl,
          classification: {
            label: classification.label,
            confidence: classification.confidence,
            detectedType,
          },
        },
        status: 'valid',
      });

      return { ok: true };
    } catch (_err) {
      // Classification failed, continue without it
      set({
        upperGarment: { file, previewUrl },
        status: 'valid',
      });
      return { ok: true };
    }
  },

  // Full mode - lower garment upload
  setLowerGarment: async (file) => {
    if (!file) {
      set({ lowerGarment: {} });
      return { ok: false, message: 'No lower garment file' };
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      const msg = 'Invalid file type. Please upload PNG, JPEG, or WEBP image.';
      return { ok: false, message: msg };
    }

    if (file.size > 10 * 1024 * 1024) {
      const msg = 'File too large. Maximum size is 10MB.';
      return { ok: false, message: msg };
    }

    const previewUrl = URL.createObjectURL(file);
    set({
      lowerGarment: { file, previewUrl },
      status: 'classifying',
    });

    // Classify lower garment
    try {
      const classification = await detectGarmentType(file);
      const label = classification.label.toUpperCase();
      let detectedType: 'upper' | 'lower' | 'full' | undefined;

      if (label.includes('TROUSER') || label.includes('PANT') || label.includes('JEAN') || label.includes('SHORT')) {
        detectedType = 'lower';
      }

      set({
        lowerGarment: {
          file,
          previewUrl,
          classification: {
            label: classification.label,
            confidence: classification.confidence,
            detectedType,
          },
        },
        status: 'valid',
      });

      return { ok: true };
    } catch (_err) {
      // Classification failed, continue without it
      set({
        lowerGarment: { file, previewUrl },
        status: 'valid',
      });
      return { ok: true };
    }
  },

  // Full mode - construct outfit preview
  constructOutfitPreview: async () => {
    const { upperGarment, lowerGarment } = get();

    if (!upperGarment.file || !lowerGarment.file) {
      set({ error: 'Both upper and lower garments are required', status: 'error' });
      return;
    }

    set({ status: 'constructing', error: undefined });

    try {
      const result = await constructOutfit(upperGarment.file, lowerGarment.file);

      set({
        outfit: {
          url: result.outfit.url,
          publicId: result.outfit.public_id,
          upperLabel: result.upper_garment.label,
          lowerLabel: result.lower_garment.label,
          upperConfidence: result.upper_garment.confidence,
          lowerConfidence: result.lower_garment.confidence,
        },
        status: 'valid',
        step: 'PREVIEW',
      });

      console.log('✅ Outfit constructed:', result.outfit.url);
    } catch (err: unknown) {
      const error = err as Error;
      set({
        status: 'error',
        error: error?.message || 'Failed to construct outfit'
      });
    }
  },

  setOptions: (opts) => set({ options: { ...get().options, ...opts } }),

  // Get available cloth types based on path and classification
  getAvailableClothTypes: () => {
    const { tryOnPath, garment } = get();

    // FULL mode always uses 'overall'
    if (tryOnPath === 'FULL') {
      return ['overall'];
    }

    // REFERENCE mode always shows all options (user chooses)
    if (tryOnPath === 'REFERENCE') {
      return ['upper', 'lower', 'overall'];
    }

    // NORMAL mode - filter based on classification
    const detectedType = garment.classification?.detectedType;

    if (!detectedType) {
      // If no classification, show all options
      return ['upper', 'lower', 'overall'];
    }

    // Show detected type + overall
    const types: ClothType[] = ['overall'];
    if (detectedType === 'upper') {
      types.unshift('upper');
    } else if (detectedType === 'lower') {
      types.unshift('lower');
    } else if (detectedType === 'full') {
      return ['overall']; // Full garments only work with overall
    }

    return types;
  },

  // Check if user can proceed to generate
  canProceedToGenerate: () => {
    const { tryOnPath, body, garment, outfit } = get();

    if (!body.file) return false;

    if (tryOnPath === 'FULL') {
      return !!outfit.url; // Need constructed outfit
    }

    return !!garment.file; // Need single garment
  },

  reset: () => {
    const old = get();
    if (old.body.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(old.body.previewUrl);
    if (old.garment.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(old.garment.previewUrl);
    if (old.upperGarment.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(old.upperGarment.previewUrl);
    if (old.lowerGarment.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(old.lowerGarment.previewUrl);

    set({
      tryOnPath: 'NORMAL',
      step: 'PATH_SELECT',
      body: {},
      garment: {},
      upperGarment: {},
      lowerGarment: {},
      outfit: {},
      options: { clothType: 'upper' },
      status: 'idle',
      resultUrl: undefined,
      error: undefined,
    });
  },

  tryOn: async () => {
    const { tryOnPath, body, garment, outfit, options } = get();

    if (!body.file) {
      set({ error: 'Body photo is required', status: 'error' });
      return;
    }

    set({ status: 'processing', error: undefined, resultUrl: undefined });
    const controller = new AbortController();

    try {
      let garmentFileForTryOn: File;
      let clothTypeForTryOn: ClothType = options.clothType || 'upper';

      if (tryOnPath === 'FULL') {
        // For FULL mode, use the constructed outfit image
        if (!outfit.url) {
          set({ error: 'Outfit not constructed', status: 'error' });
          return;
        }

        // Download outfit image as File
        const response = await fetch(outfit.url);
        const blob = await response.blob();
        garmentFileForTryOn = new File([blob], 'outfit.png', { type: 'image/png' });
        clothTypeForTryOn = 'overall';

        console.log('🎨 Full mode: Using constructed outfit');
      } else {
        // NORMAL or REFERENCE mode - use single garment
        if (!garment.file) {
          set({ error: 'Please upload a garment image', status: 'error' });
          return;
        }
        garmentFileForTryOn = garment.file;

        console.log(`🎨 ${tryOnPath} mode: Using single garment`);
      }

      // Call virtual try-on API
      const response = await virtualTryOn(
        {
          bodyFile: body.file,
          garmentFile: garmentFileForTryOn,
          clothType: clothTypeForTryOn,
          options: {
            numInferenceSteps: options.numInferenceSteps ?? 50,
            guidanceScale: options.guidanceScale ?? 2.5,
            seed: options.seed ?? 42,
          },
        },
        tryOnPath !== 'REFERENCE', // Process garment only for NORMAL and FULL modes
        controller.signal,
      );

      console.log('✅ Virtual try-on complete:', {
        result_url: response.result_url,
        mode: tryOnPath,
      });

      set({ status: 'done', resultUrl: response.result_url, step: 'RESULT' });
    } catch (err: unknown) {
      const error = err as Error;
      let msg = error?.message || 'Processing failed. Please try again.';
      if (/exceeded.*gpu.*quota/i.test(msg)) {
        msg = 'Daily GPU quota reached. Please try again later.';
      }
      set({ status: 'error', error: msg });
    }
  },
}));
