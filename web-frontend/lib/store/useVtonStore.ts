import { create } from 'zustand';
import type { VtonOptions, GarmentProcessResponse } from '@/lib/types';
import { processWithGradio } from '@/lib/services/gradioApi';
import { extractAndPrepareGarment } from '@/lib/services/garmentApi';

export type VtonStep = 'BODY' | 'GARMENT' | 'GENERATE' | 'RESULT';

interface ImageSelection {
  file?: File;
  previewUrl?: string; // object URL or data URL for UI
  // Extraction metadata for garments
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

  setGarmentFile: async (file) => {
    if (!file) {
      set({ garment: { ...get().garment, file: undefined, previewUrl: undefined, id: undefined } });
      return;
    }

    // Set initial preview
    const previewUrl = URL.createObjectURL(file);
    set({
      garment: { ...get().garment, file, previewUrl, id: undefined },
      status: 'uploading',
    });

    try {
      console.log('🔍 Extracting garment...');

      // Extract garment
      const { result, extractedFile } = await extractAndPrepareGarment(file);

      if (!result.success || !extractedFile) {
        console.warn('⚠️ Garment extraction failed:', result.message);
        set({
          garment: { ...get().garment, extracted: false, extractionResult: result },
          status: 'error',
          error: result.message || 'Garment must be a T-shirt or Trousers',
        });
        return;
      }

      console.log('✅ Garment extracted successfully');

      // Update with extracted file
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
    } catch (err) {
      console.error('❌ Garment extraction error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract garment';
      set({
        garment: { ...get().garment, extracted: false },
        status: 'error',
        error: errorMessage,
      });
    }
  },

  setGarmentId: (id, previewUrl) =>
    set({ garment: { ...get().garment, id, previewUrl, file: undefined } }),

  setOptions: (opts) => set({ options: { ...get().options, ...opts } }),

  reset: () => {
    console.log('🔄 Resetting try-on state...');
    const old = get();
    // Revoke blob URLs (but not data URLs from Gradio)
    if (old.body.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(old.body.previewUrl);
    if (old.garment.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(old.garment.previewUrl);
    // Note: resultUrl from Gradio is a data URL, not a blob URL, so no need to revoke
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

    console.log('🎬 Starting try-on process (Gradio)...');

    if (!body.file) {
      console.warn('❌ Validation failed: No body photo');
      set({ error: 'Body photo is required', status: 'error' });
      return;
    }

    if (!garment.file) {
      console.warn('❌ Validation failed: No garment file');
      set({ error: 'Please upload a garment image', status: 'error' });
      return;
    }

    // Check if garment was extracted
    if (!garment.extracted) {
      console.warn('⚠️ Garment not extracted, extraction may have failed');
      set({
        error: 'Garment extraction failed. Please upload a valid T-shirt or Trousers image.',
        status: 'error',
      });
      return;
    }

    console.log('✅ Validation passed:', {
      bodyFile: body.file.name,
      bodySize: `${(body.file.size / 1024).toFixed(2)} KB`,
      garmentFile: garment.file.name,
      garmentSize: `${(garment.file.size / 1024).toFixed(2)} KB`,
      garmentExtracted: garment.extracted,
      classification: garment.extractionResult?.classification?.label,
      clothType: options.clothType || 'upper',
    });

    set({ status: 'processing', error: undefined, resultUrl: undefined });

    const controller = new AbortController();

    try {
      // Use extracted file (garment must be extracted)
      const finalGarmentFile = garment.extractedFile || garment.file;

      console.log('📤 Sending to Gradio API (HuggingFace Space)...');

      // Call Gradio API - returns base64 data URL
      const resultBase64 = await processWithGradio(
        body.file,
        finalGarmentFile!,
        options.clothType || 'upper',
        options.numInferenceSteps ?? 50,
        options.guidanceScale ?? 2.5,
        options.seed ?? 42,
        controller.signal,
      );

      console.log('📥 Received result from Gradio...');

      // resultBase64 is already a data URL, can be used directly
      const resultUrl = resultBase64;

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
