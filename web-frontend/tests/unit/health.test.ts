import { afterEach, expect, test, vi } from 'vitest';
import { checkBackendHealth } from '@/lib/services/healthCheckService';

afterEach(() => vi.unstubAllGlobals());

test('reports ok when the backend health endpoint returns status ok', async () => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ status: 'ok' }));
  vi.stubGlobal('fetch', fetchMock);

  await expect(checkBackendHealth()).resolves.toMatchObject({ status: 'ok' });
  expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/health$/);
});

test('reports an error when the backend responds unhealthy', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

  await expect(checkBackendHealth()).resolves.toMatchObject({
    status: 'error',
    message: 'Backend returned status 503',
  });
});

test('reports an error when the backend is unreachable', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

  await expect(checkBackendHealth()).resolves.toMatchObject({
    status: 'error',
    message: 'Failed to fetch',
  });
});
