/**
 * Health Check Service
 * Checks backend API health status without using Next.js API routes
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_GARMENT_API_BASE || 'http://127.0.0.1:8000';
const HEALTH_ENDPOINT = '/health';

export interface HealthStatus {
  status: 'ok' | 'error' | 'loading';
  message?: string;
  timestamp: number;
}

/**
 * Check if the ML backend is healthy
 * @returns Promise<HealthStatus>
 */
export async function checkBackendHealth(): Promise<HealthStatus> {
  try {
    const response = await fetch(`${BACKEND_URL}${HEALTH_ENDPOINT}`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (response.ok) {
      const data = await response.json();

      if (data.status === 'ok') {
        return {
          status: 'ok',
          message: 'Backend is healthy',
          timestamp: Date.now(),
        };
      }
    }

    return {
      status: 'error',
      message: `Backend returned status ${response.status}`,
      timestamp: Date.now(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to connect to backend';
    return {
      status: 'error',
      message,
      timestamp: Date.now(),
    };
  }
}

/**
 * Poll backend health status
 * @param intervalMs - Polling interval in milliseconds (default: 30000 = 30 seconds)
 * @param callback - Callback function called on each check
 * @returns Function to stop polling
 */
export function pollBackendHealth(
  intervalMs: number = 30000,
  callback: (status: HealthStatus) => void,
): () => void {
  let timeoutId: NodeJS.Timeout;

  const poll = async () => {
    const status = await checkBackendHealth();
    callback(status);
    timeoutId = setTimeout(poll, intervalMs);
  };

  // Initial check
  poll();

  // Return cleanup function
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}
