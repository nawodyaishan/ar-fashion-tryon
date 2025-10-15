/**
 * FitClient: Communicates with backend fit solver at 10-15 Hz
 * Sends pose landmarks, receives transform + warp from backend
 */

export interface PoseLandmarks {
  L_shoulder: [number, number, number]; // [x, y, visibility]
  R_shoulder: [number, number, number];
  L_hip: [number, number, number];
  R_hip: [number, number, number];
  L_elbow?: [number, number, number];
  R_elbow?: [number, number, number];
}

export interface SimilarityTransform {
  tx: number;       // Translation X (pixels)
  ty: number;       // Translation Y (pixels)
  scale: number;    // Uniform scale
  rot: number;      // Rotation (radians)
}

export interface WarpData {
  type: 'tps';
  src_ctrl: [number, number][];  // Source control points (normalized 0-1)
  dst_ctrl: [number, number][];  // Destination control points (normalized 0-1)
}

export interface OcclusionData {
  neck_clip: {
    center: [number, number];
    rx: number;
    ry: number;
  };
  arm_over_shirt?: {
    left: boolean;
    right: boolean;
  };
}

export interface FitResponse {
  mode: 'tracking' | 'paused';
  confidence: number;
  similarity: SimilarityTransform | null;
  warp: WarpData | null;
  occlusion: OcclusionData | null;
}

export class FitClient {
  private apiBaseUrl: string;
  private sessionId: string;
  private prevState: any = null;
  private lastRequestTime: number = 0;
  private throttleMs: number = 100; // 10 Hz (100ms between requests)
  private abortController: AbortController | null = null;

  constructor(apiBaseUrl: string, sessionId?: string) {
    this.apiBaseUrl = apiBaseUrl;
    this.sessionId = sessionId || `session_${Date.now()}`;
  }

  /**
   * Send pose landmarks to backend and get fit result
   * Automatically throttled to 10-15 Hz
   */
  async getFit(gsmId: string, pose: PoseLandmarks): Promise<FitResponse | null> {
    // Throttle requests
    const now = Date.now();
    if (now - this.lastRequestTime < this.throttleMs) {
      return null; // Skip this frame
    }
    this.lastRequestTime = now;

    // Cancel previous request if still pending
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    try {
      const response = await fetch(`${this.apiBaseUrl}/fit/garment/top`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gsm_id: gsmId,
          pose: pose,
          prev_state: this.prevState,
          session_id: this.sessionId
        }),
        signal: this.abortController.signal
      });

      if (!response.ok) {
        console.error('FitClient: API error', response.status);
        return null;
      }

      const result: FitResponse = await response.json();

      // Store state for next request (EMA smoothing on backend)
      if (result.mode === 'tracking' && result.similarity) {
        this.prevState = {
          similarity: result.similarity,
          warp: result.warp
        };
      }

      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted, ignore
        return null;
      }
      console.error('FitClient: Network error', error);
      return null;
    }
  }

  /**
   * Reset session state (e.g., when changing garments)
   */
  reset() {
    this.prevState = null;
    this.sessionId = `session_${Date.now()}`;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Set throttle rate (Hz)
   */
  setThrottle(hz: number) {
    this.throttleMs = 1000 / hz;
  }
}
