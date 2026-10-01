import { beforeEach, expect, test, vi } from 'vitest';
import { extractGarment } from '@/lib/services/garmentApi';
import { virtualTryOn } from '@/lib/services/vtonApi';
import { http, garmentHttp } from '@/lib/services/http';

vi.mock('@/lib/services/http', () => ({ http: { post: vi.fn() }, garmentHttp: { post: vi.fn() } }));
const file = new File(['synthetic'], 'fixture.png', { type: 'image/png' });
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw new Error('Unexpected network call');
    }),
  );
});

test('extraction uses the garment multipart contract and maps response', async () => {
  vi.mocked(http.post).mockResolvedValue({
    data: {
      label: 'tshirt',
      confidence: 0.9,
      garment_url: '/original.png',
      cutout_url: '/cutout.png',
      cutout_path: 'cutout.png',
    },
  });
  const response = await extractGarment(file);
  const [url, body] = vi.mocked(http.post).mock.calls[0];
  expect(url).toMatch(/\/classify_garment$/);
  expect((body as FormData).get('garment')).toBeInstanceOf(File);
  expect((body as FormData).has('image')).toBe(false);
  expect(response.classification).toEqual({ label: 'tshirt', confidence: 0.9 });
  expect(response.extraction?.cutout_url).toBe('/cutout.png');
});

test('extraction rejects invalid input before HTTP', async () => {
  await expect(extractGarment(new File(['x'], 'bad.txt', { type: 'text/plain' }))).rejects.toThrow(
    'Invalid file type',
  );
  expect(http.post).not.toHaveBeenCalled();
});

test('extraction propagates backend error details', async () => {
  vi.mocked(http.post).mockRejectedValue({
    response: { data: { detail: 'Provider unavailable' } },
  });
  await expect(extractGarment(file)).rejects.toThrow('Provider unavailable');
});

test('try-on sends files/form fields and query options to the existing API', async () => {
  vi.mocked(garmentHttp.post).mockResolvedValue({
    data: { success: true, result_url: '/result.png' },
  });
  const result = await virtualTryOn(
    {
      bodyFile: file,
      garmentFile: file,
      clothType: 'lower',
      options: { numInferenceSteps: 12, guidanceScale: 1.5, seed: 7 },
    },
    false,
  );
  const [url, body, config] = vi.mocked(garmentHttp.post).mock.calls[0];
  expect(url).toBe('/virtual_tryon');
  expect((body as FormData).get('cloth_type')).toBe('lower');
  expect((body as FormData).get('person_image')).toBeInstanceOf(File);
  expect((body as FormData).get('garment_image')).toBeInstanceOf(File);
  expect(config?.params).toEqual({
    num_inference_steps: 12,
    guidance_scale: 1.5,
    seed: 7,
    show_type: 'result only',
    process_garment: false,
  });
  expect(result.result_url).toBe('/result.png');
});

test('try-on requires both images and preserves provider failure details', async () => {
  await expect(virtualTryOn({})).rejects.toThrow('Person image is required');
  await expect(virtualTryOn({ bodyFile: file })).rejects.toThrow('Garment image is required');
  expect(garmentHttp.post).not.toHaveBeenCalled();
  vi.mocked(garmentHttp.post).mockRejectedValue({
    response: { data: { detail: 'GPU quota reached' } },
  });
  await expect(virtualTryOn({ bodyFile: file, garmentFile: file })).rejects.toThrow(
    'GPU quota reached',
  );
});
