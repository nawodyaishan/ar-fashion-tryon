import { create } from 'zustand';
import type { VtonOptions } from '@/lib/types';
import { processImages, type ProcessImagesPayload } from '@/lib/services/vtonApi';

export type VtonStep = 'BODY' | 'GARMENT' | 'GENERATE' | 'RESULT';

interface ImageSelection {
  file?: File;
  previewUrl?: string; // object URL or data URL for UI
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
  setGarmentFile: (file: File | undefined) => void;
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
  options: {
    clothType: 'upper', // default to upper body
  },
  status: 'idle',

  setStep: (s) => set({ step: s }),

  setBody: (file) => {
    const previewUrl = file ? URL.createObjectURL(file) : undefined;
    set({ body: { file, previewUrl } });
  },

  setGarmentFile: (file) => {
    const previewUrl = file ? URL.createObjectURL(file) : undefined;
    set({ garment: { ...get().garment, file, previewUrl, id: undefined } });
  },

  setGarmentId: (id, previewUrl) =>
    set({ garment: { ...get().garment, id, previewUrl, file: undefined } }),

  setOptions: (opts) => set({ options: { ...get().options, ...opts } }),

  reset: () => {
    console.log('🔄 Resetting try-on state...');
    const old = get();
    if (old.body.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(old.body.previewUrl);
    if (old.garment.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(old.garment.previewUrl);
    if (old.resultUrl?.startsWith('blob:')) URL.revokeObjectURL(old.resultUrl);
    set({
      step: 'BODY',
      body: {},
      garment: {},
      options: { clothType: 'upper' },
      status: 'idle',
      resultUrl: undefined,
      error: undefined,
    });
    console.log('✅ Reset complete');
  },

  tryOn: async () => {
    const { body, garment, options } = get();

    console.log('🎬 Starting try-on process...');

    if (!body.file) {
      console.warn('❌ Validation failed: No body photo');
      set({ error: 'Body photo is required', status: 'error' });
      return;
    }

    if (!garment.file && !garment.id) {
      console.warn('❌ Validation failed: No garment selected');
      set({ error: 'Select a garment (upload or gallery)', status: 'error' });
      return;
    }

    console.log('✅ Validation passed:', {
      bodyFile: body.file.name,
      bodySize: `${(body.file.size / 1024).toFixed(2)} KB`,
      garmentFile: garment.file?.name || garment.id,
      garmentSize: garment.file ? `${(garment.file.size / 1024).toFixed(2)} KB` : 'N/A',
    });

    set({ status: 'processing', error: undefined, resultUrl: undefined });

    const controller = new AbortController();

    try {
      const payload: ProcessImagesPayload = {
        bodyFile: body.file,
        garmentFile: garment.file,
        garmentId: garment.id,
        clothType: options.clothType || 'upper',
        options: {
          ...options,
          numInferenceSteps: options.numInferenceSteps ?? 50,
          guidanceScale: options.guidanceScale ?? 2.5,
          seed: options.seed ?? 42,
        },
      };

      console.log('📤 Sending to ML backend...');

      // Call ML backend - returns Blob (image file)
      const imageBlob = await processImages(payload, controller.signal);

      console.log('📥 Received result, creating preview URL...');

      // Convert Blob to Object URL for display
      const resultUrl = URL.createObjectURL(imageBlob);

      console.log('✅ Try-on complete!');

      set({ status: 'done', resultUrl, step: 'RESULT' });
    } catch (err: unknown) {
      console.error('❌ Try-on failed:', err);
      const error = err as { message?: string };
      const errorMessage = error?.message || 'Processing failed. Please try again.';
      set({ status: 'error', error: errorMessage });
    }
  },

  regenerate: async () => {
    console.log('🔄 Regenerating with same inputs...');
    await get().tryOn();
  },
}));
