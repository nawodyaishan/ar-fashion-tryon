import { useEffect, useRef, useState, useCallback } from 'react';
import {
  HandLandmarker,
  FilesetResolver,
  type HandLandmarkerResult
} from '@mediapipe/tasks-vision';

export interface HandLandmark {
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
  z: number; // Depth
}

export interface HandDetectionResult {
  left: HandLandmark[] | null;  // 21 landmarks
  right: HandLandmark[] | null; // 21 landmarks
  leftPinching: boolean;
  rightPinching: boolean;
}

export function useHandsDetection(
  videoElement: HTMLVideoElement | null,
  enabled: boolean = false
) {
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<HandDetectionResult | null>(null);

  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastVideoTimeRef = useRef(-1);
  const lastDetectionTime = useRef(0);

  // Initialize HandLandmarker
  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    const initializeHandLandmarker = async () => {
      setIsLoading(true);

      try {
        console.log('🤚 Initializing MediaPipe Hands...');

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numHands: 2, // Detect both hands
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        if (mounted) {
          setHandLandmarker(landmarker);
          setIsLoading(false);
          console.log('✅ MediaPipe Hands initialized');
        }
      } catch (err) {
        console.error('❌ MediaPipe Hands error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize hands detection');
          setIsLoading(false);
        }
      }
    };

    initializeHandLandmarker();

    return () => {
      mounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled]);

  // Detection loop (throttled to 15-20 FPS)
  const detectHands = useCallback(async () => {
    if (!handLandmarker || !videoElement) return;

    const currentTime = videoElement.currentTime;

    // Only process new frames
    if (currentTime === lastVideoTimeRef.current) {
      animationFrameRef.current = requestAnimationFrame(detectHands);
      return;
    }

    lastVideoTimeRef.current = currentTime;

    // Throttle to ~15-20 FPS (50-66ms between detections)
    const now = performance.now();
    if (now - lastDetectionTime.current < 50) {
      animationFrameRef.current = requestAnimationFrame(detectHands);
      return;
    }

    lastDetectionTime.current = now;

    try {
      const result = handLandmarker.detectForVideo(videoElement, now);

      // Process hands
      const processedResult = processHandResult(result);
      setLastResult(processedResult);

    } catch (err) {
      console.error('Hand detection error:', err);
    }

    animationFrameRef.current = requestAnimationFrame(detectHands);
  }, [handLandmarker, videoElement]);

  // Start/stop detection
  useEffect(() => {
    if (handLandmarker && videoElement && enabled) {
      detectHands();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [handLandmarker, videoElement, enabled, detectHands]);

  return {
    isLoading,
    error,
    hands: lastResult
  };
}

// Process hand result and detect pinching
function processHandResult(result: HandLandmarkerResult): HandDetectionResult {
  let left: HandLandmark[] | null = null;
  let right: HandLandmark[] | null = null;
  let leftPinching = false;
  let rightPinching = false;

  if (result.landmarks && result.landmarks.length > 0) {
    result.landmarks.forEach((handLandmarks, index) => {
      const handedness = result.handedness[index][0].categoryName; // 'Left' or 'Right'

      // Mirror X coordinate for selfie view
      const mirrored = handLandmarks.map(lm => ({
        x: 1 - lm.x,
        y: lm.y,
        z: lm.z
      }));

      if (handedness === 'Left') {
        left = mirrored;
        leftPinching = detectPinch(mirrored);
      } else {
        right = mirrored;
        rightPinching = detectPinch(mirrored);
      }
    });
  }

  return { left, right, leftPinching, rightPinching };
}

// Detect pinch gesture (thumb tip close to index tip)
function detectPinch(landmarks: HandLandmark[]): boolean {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];

  const distance = Math.sqrt(
    Math.pow(thumbTip.x - indexTip.x, 2) +
    Math.pow(thumbTip.y - indexTip.y, 2)
  );

  // Threshold depends on hand size in frame
  // Use dynamic threshold based on wrist-to-middle-finger distance
  const wrist = landmarks[0];
  const middleTip = landmarks[12];
  const handSize = Math.sqrt(
    Math.pow(wrist.x - middleTip.x, 2) +
    Math.pow(wrist.y - middleTip.y, 2)
  );

  const threshold = handSize * 0.15; // 15% of hand size

  return distance < threshold;
}
