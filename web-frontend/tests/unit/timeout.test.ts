import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { TimeoutError, withTimeout } from '@/lib/utils/timeout';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('resolves with the value when the promise settles in time', async () => {
  const result = withTimeout(Promise.resolve('done'), 1_000, 'too slow');
  await expect(result).resolves.toBe('done');
});

test('rejects with a TimeoutError and runs onTimeout when the promise hangs', async () => {
  const onTimeout = vi.fn();
  const result = withTimeout(new Promise(() => {}), 1_000, 'too slow', onTimeout);
  const assertion = expect(result).rejects.toThrow(new TimeoutError('too slow'));

  await vi.advanceTimersByTimeAsync(1_000);

  await assertion;
  expect(onTimeout).toHaveBeenCalledOnce();
});

test('passes through the original rejection and clears its timer', async () => {
  const onTimeout = vi.fn();
  const result = withTimeout(Promise.reject(new Error('boom')), 1_000, 'too slow', onTimeout);

  await expect(result).rejects.toThrow('boom');
  await vi.advanceTimersByTimeAsync(1_000);
  expect(onTimeout).not.toHaveBeenCalled();
});
