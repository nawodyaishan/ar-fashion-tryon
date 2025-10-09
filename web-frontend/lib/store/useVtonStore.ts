// lib/store/useVtonStore.ts
import { create } from 'zustand';
import type { GarmentProcessResponse, VtonOptions } from '@/lib/types';
import { extractGarmentSmart } from '@/lib/services/garmentApi';
import { processWithGradio } from '@/lib/services/gradioApi';

export type VtonStep = 'BODY' | 'GARMENT' | 'GENERATE' | 'RESULT';

interface ImageSelection {
  file?: File;
  previewUrl?: string;
  extracted?: boolean;
  extractionResult?: GarmentProcessResponse;
  extractedFile?: File;
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
  setGarmentFile: async (file) => {
    if (!file) {
      set({ garment: { ...get().garment, file: undefined, previewUrl: undefined, id: undefined } });
      return { ok: false, message: 'No garment file' };
    }

    const previewUrl = URL.createObjectURL(file);
    set({ garment: { ...get().garment, file, previewUrl, id: undefined }, status: 'uploading' });

    try {
      const { result, extractedFile, method } = await extractGarmentSmart(file);
      console.log(`Using ${method} pipeline for garment extraction`);

      if (!result.success || !extractedFile) {
        const msg = result.message || 'Garment must be a T-shirt or Trousers';
        set({
          garment: { ...get().garment, extracted: false, extractionResult: result },
          status: 'error',
          error: msg,
        });
        return { ok: false, message: msg };
      }

      const extractedPreviewUrl = URL.createObjectURL(extractedFile);
      set({
        garment: {
          ...get().garment,
          file: extractedFile,
          previewUrl: extractedPreviewUrl,
          extracted: true,
          extractionResult: result,
          extractedFile,
        },
        status: 'valid',
        error: undefined,
      });
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to extract garment';
      set({ garment: { ...get().garment, extracted: false }, status: 'error', error: msg });
      return { ok: false, message: msg };
    }
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
    if (!garment.extracted) {
      return set({
        error: 'Garment extraction failed. Please upload a valid T-shirt or Trousers image.',
        status: 'error',
      });
    }

    set({ status: 'processing', error: undefined, resultUrl: undefined });
    const controller = new AbortController();

    try {
      const finalGarmentFile = garment.extractedFile || garment.file;
      const token = (process.env.NEXT_PUBLIC_HF_TOKEN ?? '') as `hf_${string}`;

      const resultDataUrl = await processWithGradio(
        body.file,
        finalGarmentFile!,
        options.clothType || 'upper',
        options.numInferenceSteps ?? 50,
        options.guidanceScale ?? 2.5,
        options.seed ?? 42,
        { signal: controller.signal, token },
      );

      set({ status: 'done', resultUrl: resultDataUrl, step: 'RESULT' });
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
