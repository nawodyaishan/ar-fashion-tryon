import { beforeEach, expect, test, vi } from 'vitest';
import { useVtonStore } from '@/lib/store/useVtonStore';
import { virtualTryOn } from '@/lib/services/vtonApi';

vi.mock('@/lib/services/vtonApi', () => ({ virtualTryOn: vi.fn() }));
const file = new File(['fixture'], 'image.png', { type: 'image/png' });
beforeEach(() => useVtonStore.getState().reset());

test('switching paths clears incompatible garments and selects correct defaults', () => {
  useVtonStore.setState({ garment: { file }, outfit: { url: '/old.png' } });
  useVtonStore.getState().setPath('FULL');
  expect(useVtonStore.getState()).toMatchObject({
    step: 'BODY',
    garment: {},
    outfit: {},
    options: { clothType: 'overall' },
  });
  useVtonStore.getState().setPath('NORMAL');
  expect(useVtonStore.getState().options.clothType).toBe('upper');
});

test('generation requires body and mode-specific garment/outfit', () => {
  expect(useVtonStore.getState().canProceedToGenerate()).toBe(false);
  useVtonStore.setState({ body: { file }, garment: { file } });
  expect(useVtonStore.getState().canProceedToGenerate()).toBe(true);
  useVtonStore.getState().setPath('FULL');
  expect(useVtonStore.getState().canProceedToGenerate()).toBe(false);
  useVtonStore.setState({ outfit: { url: '/outfit.png' } });
  expect(useVtonStore.getState().canProceedToGenerate()).toBe(true);
});

test('reset releases previews and clears result/error/navigation', () => {
  const revoke = vi.spyOn(URL, 'revokeObjectURL');
  useVtonStore.setState({
    body: { file, previewUrl: 'blob:body' },
    garment: { file, previewUrl: 'blob:garment' },
    status: 'done',
    resultUrl: '/old.png',
    error: 'old',
    step: 'RESULT',
  });
  useVtonStore.getState().reset();
  expect(revoke).toHaveBeenCalledWith('blob:body');
  expect(revoke).toHaveBeenCalledWith('blob:garment');
  expect(useVtonStore.getState()).toMatchObject({
    step: 'PATH_SELECT',
    status: 'idle',
    body: {},
    garment: {},
    resultUrl: undefined,
    error: undefined,
  });
  revoke.mockRestore();
});

test('successful generation moves to results; failure leaves an actionable error', async () => {
  useVtonStore.setState({ body: { file }, garment: { file } });
  vi.mocked(virtualTryOn).mockResolvedValue({ result_url: '/result.png' } as Awaited<
    ReturnType<typeof virtualTryOn>
  >);
  await useVtonStore.getState().tryOn();
  expect(useVtonStore.getState()).toMatchObject({
    status: 'done',
    step: 'RESULT',
    resultUrl: '/result.png',
  });
  vi.mocked(virtualTryOn).mockRejectedValue(new Error('Provider unavailable'));
  await useVtonStore.getState().tryOn();
  expect(useVtonStore.getState()).toMatchObject({
    status: 'error',
    error: 'Provider unavailable',
    resultUrl: undefined,
  });
});
