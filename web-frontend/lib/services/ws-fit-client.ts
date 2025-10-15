/**
 * WebSocket FitClient - Real-time garment fitting
 * Connects to backend WebSocket API for low-latency fit updates
 *
 * Based on backend API: /ws/fit/top
 */

export interface PoseLandmarks {
  L_shoulder: [number, number, number]; // [x, y, visibility]
  R_shoulder: [number, number, number];
  L_hip: [number, number, number];
  R_hip: [number, number, number];
  L_elbow?: [number, number, number];
  R_elbow?: [number, number, number];
}

export interface FitData {
  mode: 'tracking' | 'paused';
  confidence: number;
  similarity: {
    tx: number;
    ty: number;
    scale: number;
    rot: number;
  } | null;
  warp: {
    type: 'tps';
    src_ctrl: [number, number][];
    dst_ctrl: [number, number][];
  } | null;
  occlusion: {
    neck_clip: {
      center: [number, number];
      radius_x: number;
      radius_y: number;
    };
  } | null;
  qos: {
    proc_ms: number;
    frame_count: number;
    drop_rate: number;
  };
}

interface AckMessage {
  type: 'ack';
  session_id: string;
  gsm_id: string;
}

interface FitMessage {
  type: 'fit';
  data: FitData;
}

interface ErrorMessage {
  type: 'error';
  message: string;
}

type ServerMessage = AckMessage | FitMessage | ErrorMessage;

export class WSFitClient {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private gsmId: string;
  private sessionId: string | null = null;

  private isConnected: boolean = false;
  private isReconnecting: boolean = false;

  private sendIntervalId: NodeJS.Timeout | null = null;
  private latestPose: PoseLandmarks | null = null;
  private sendHz: number = 12; // Default 12 Hz

  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000; // Start with 1 second

  // Callbacks
  private onConnectCallback?: () => void;
  private onDisconnectCallback?: (reason: string) => void;
  private onFitCallback?: (fit: FitData) => void;
  private onErrorCallback?: (error: string) => void;

  constructor(wsUrl: string, gsmId: string) {
    this.wsUrl = wsUrl;
    this.gsmId = gsmId;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.ws && this.isConnected) {
      console.warn('WSFitClient: Already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const url = `${this.wsUrl}?gsm_id=${encodeURIComponent(this.gsmId)}`;
        console.log('🔌 Connecting to:', url);

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          this.isConnected = true;
          this.isReconnecting = false;
          this.reconnectAttempts = 0;
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);

          // Resolve on first ack
          if (this.sessionId) {
            resolve();
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.onErrorCallback?.('WebSocket connection error');
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket closed:', event.code, event.reason);
          this.isConnected = false;
          this.sessionId = null;

          if (this.sendIntervalId) {
            clearInterval(this.sendIntervalId);
            this.sendIntervalId = null;
          }

          this.onDisconnectCallback?.(event.reason || 'Connection closed');

          // Auto-reconnect with exponential backoff
          if (!this.isReconnecting && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnect();
          }
        };

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!this.sessionId) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Reconnect with exponential backoff
   */
  private reconnect() {
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    this.reconnectAttempts++;

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnect();
        } else {
          this.onErrorCallback?.('Max reconnection attempts reached');
        }
      });
    }, delay);
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string) {
    try {
      const msg: ServerMessage = JSON.parse(data);

      switch (msg.type) {
        case 'ack':
          console.log('📨 Received ack:', msg);
          this.sessionId = msg.session_id;
          this.startSendLoop();
          this.onConnectCallback?.();
          break;

        case 'fit':
          // console.log('📐 Received fit:', msg.data);
          this.onFitCallback?.(msg.data);
          break;

        case 'error':
          console.error('❌ Server error:', msg.message);
          this.onErrorCallback?.(msg.message);
          break;

        default:
          console.warn('Unknown message type:', msg);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  /**
   * Start send loop (sends latest pose at sendHz)
   */
  private startSendLoop() {
    if (this.sendIntervalId) {
      clearInterval(this.sendIntervalId);
    }

    const intervalMs = 1000 / this.sendHz;

    this.sendIntervalId = setInterval(() => {
      if (this.latestPose && this.isConnected) {
        this.sendPose(this.latestPose);
      }
    }, intervalMs);

    console.log(`🔄 Send loop started at ${this.sendHz} Hz`);
  }

  /**
   * Update latest pose (coalescing: latest wins)
   */
  updatePose(pose: PoseLandmarks) {
    this.latestPose = pose;
  }

  /**
   * Send pose to server
   */
  private sendPose(pose: PoseLandmarks) {
    if (!this.ws || !this.isConnected || this.ws.readyState !== WebSocket.OPEN) return;

    const msg = {
      type: 'pose',
      pose: pose
    };

    try {
      this.ws.send(JSON.stringify(msg));
    } catch (error) {
      console.error('Failed to send pose:', error);
    }
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.sendIntervalId) {
      clearInterval(this.sendIntervalId);
      this.sendIntervalId = null;
    }

    if (this.ws && this.isConnected) {
      try {
        this.ws.send(JSON.stringify({ type: 'bye' }));
      } catch (error) {
        console.error('Failed to send bye:', error);
      }

      this.ws.close();
    }

    this.ws = null;
    this.isConnected = false;
    this.sessionId = null;
    this.latestPose = null;
  }

  /**
   * Set send frequency (Hz)
   */
  setSendHz(hz: number) {
    this.sendHz = Math.max(1, Math.min(30, hz)); // Clamp 1-30 Hz
    if (this.sendIntervalId) {
      // Restart send loop with new frequency
      this.startSendLoop();
    }
  }

  /**
   * Set callbacks
   */
  onConnect(callback: () => void) {
    this.onConnectCallback = callback;
  }

  onDisconnect(callback: (reason: string) => void) {
    this.onDisconnectCallback = callback;
  }

  onFit(callback: (fit: FitData) => void) {
    this.onFitCallback = callback;
  }

  onError(callback: (error: string) => void) {
    this.onErrorCallback = callback;
  }

  /**
   * Get connection status
   */
  getStatus(): { connected: boolean; sessionId: string | null } {
    return {
      connected: this.isConnected,
      sessionId: this.sessionId
    };
  }
}
