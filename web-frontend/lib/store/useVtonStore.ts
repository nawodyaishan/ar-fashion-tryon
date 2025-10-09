// lib/store/useVtonStore.ts
import { create } from 'zustand';
import type { VtonOptions } from '@/lib/types';
import { virtualTryOn } from '@/lib/services/vtonApi';

export type VtonStep = 'BODY' | 'GARMENT' | 'GENERATE' | 'RESULT';

interface ImageSelection {
  file?: File;
  previewUrl?: string;
}

interface VtonState {
  step: VtonStep;
  body: ImageSelection;
  garment: ImageSelection & { id?: string };
  options: VtonOptions;

  status: 'idle' | 'valid' | 'uploading' | 'processing' | 'done' | 'error';
  resultUrl?: string;
  error?: string;

  // Actions
  setStep: (s: VtonStep) => void;
  setBody: (file: File | undefined) => void;
  setGarmentFile: (file: File | undefined) => Promise<{ ok: boolean; message?: string }>;
  setGarmentId: (id: string | undefined, previewUrl?: string) => void;
  setOptions: (opts: Partial<VtonOptions>) => void;
  reset: () => void;

  tryOn: () => Promise<void>;
  regenerate: () => Promise<void>;
}

export const useVtonStore = create<VtonState>((set, get) => ({
  step: 'BODY',
  body: {},
  garment: {},
  options: { clothType: 'upper' },
  status: 'idle',

  setStep: (s) => set({ step: s }),

  setBody: (file) => {
    const previewUrl = file ? URL.createObjectURL(file) : undefined;
    set({ body: { file, previewUrl } });
  },

  // ✅ return {ok,message} so the UI can resolve its toast
  // Note: No extraction for Photo Try-On - backend handles everything
  setGarmentFile: async (file) => {
    if (!file) {
      set({ garment: { ...get().garment, file: undefined, previewUrl: undefined, id: undefined } });
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
    set({
      garment: { ...get().garment, file, previewUrl, id: undefined },
      status: 'valid',
      error: undefined,
    });

    console.log('✅ Garment image loaded:', {
      name: file.name,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      type: file.type,
    });

    return { ok: true };
  },

  setGarmentId: (id, previewUrl) =>
    set({ garment: { ...get().garment, id, previewUrl, file: undefined } }),

  setOptions: (opts) => set({ options: { ...get().options, ...opts } }),

  reset: () => {
    const old = get();
    if (old.body.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(old.body.previewUrl);
    if (old.garment.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(old.garment.previewUrl);
    set({
      step: 'BODY',
      body: {},
      garment: {},
      options: { clothType: 'upper' },
      status: 'idle',
      resultUrl: undefined,
      error: undefined,
    });
  },

  tryOn: async () => {
    const { body, garment, options } = get();

    if (!body.file) return set({ error: 'Body photo is required', status: 'error' });
    if (!garment.file) return set({ error: 'Please upload a garment image', status: 'error' });

    set({ status: 'processing', error: undefined, resultUrl: undefined });
    const controller = new AbortController();

    try {
      console.log('🎨 Starting virtual try-on via FastAPI (raw garment)...');

      // Call FastAPI /virtual_tryon endpoint with raw garment
      // Backend will handle garment processing internally
      const response = await virtualTryOn(
        {
          bodyFile: body.file,
          garmentFile: garment.file!, // Use raw garment file
          clothType: options.clothType || 'upper',
          options: {
            numInferenceSteps: options.numInferenceSteps ?? 50,
            guidanceScale: options.guidanceScale ?? 2.5,
            seed: options.seed ?? 42,
          },
        },
        false, // process_garment = false (backend handles it)
        controller.signal,
      );

      console.log('✅ Virtual try-on complete:', {
        result_url: response.result_url,
        classification: response.garment_classification,
      });

      // Set result URL from Cloudinary
      set({ status: 'done', resultUrl: response.result_url, step: 'RESULT' });
    } catch (err: unknown) {
      const error = err as Error;
      let msg = error?.message || 'Processing failed. Please try again.';
      if (/exceeded.*gpu.*quota/i.test(msg)) {
        msg =
          'Daily GPU quota reached on the Space. Please retry after the reset or switch the Space to a paid GPU.';
      }
      set({ status: 'error', error: msg });
    }
  },

  regenerate: async () => {
    await get().tryOn();
  },
}));
