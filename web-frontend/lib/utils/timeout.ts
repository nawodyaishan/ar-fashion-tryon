// Upper bounds for each busy phase so a hung request cannot leave a spinner running forever
export const CLASSIFY_TIMEOUT_MS = 45_000;
export const OUTFIT_TIMEOUT_MS = 90_000;
export const TRYON_TIMEOUT_MS = 180_000;

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Reject with a TimeoutError if `promise` has not settled within `ms`.
 * `onTimeout` runs first so callers can abort the underlying request.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
  onTimeout?: () => void,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      onTimeout?.();
      reject(new TimeoutError(message));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
