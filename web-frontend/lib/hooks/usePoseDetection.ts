// lib/hooks/usePoseDetection.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export interface PoseLandmark {
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
  z: number; // Depth
  visibility?: number; // Confidence 0-1
}

export interface PoseDetectionResult {
  landmarks: PoseLandmark[];
  worldLandmarks: PoseLandmark[];
  confidence: number;
}

export interface PoseDetectionConfig {
  modelComplexity?: 'lite' | 'full' | 'heavy';
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
  runningMode?: 'IMAGE' | 'VIDEO';
}

export function usePoseDetection(
  videoElement: HTMLVideoElement | null,
  config: PoseDetectionConfig = {}
) {
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<PoseDetectionResult | null>(null);
  const [fps, setFps] = useState(0);

  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastVideoTimeRef = useRef(-1);
  const fpsCounterRef = useRef({ frames: 0, lastTime: performance.now() });

  // Initialize MediaPipe
  useEffect(() => {
    let mounted = true;

    const initializePoseLandmarker = async () => {
      try {
        console.log('🚀 Initializing MediaPipe PoseLandmarker...');

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );

        const modelComplexity = config.modelComplexity || 'lite';
        const modelPath = `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_${modelComplexity}/float16/1/pose_landmarker_${modelComplexity}.task`;

        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'GPU'
          },
          runningMode: config.runningMode || 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: config.minDetectionConfidence || 0.5,
          minTrackingConfidence: config.minTrackingConfidence || 0.5,
          minPosePresenceConfidence: 0.5
        });

        if (mounted) {
          setPoseLandmarker(landmarker);
          setIsLoading(false);
          console.log('✅ MediaPipe initialized successfully');
        }
      } catch (err) {
        console.error('❌ MediaPipe initialization error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize pose detection');
          setIsLoading(false);
        }
      }
    };

    initializePoseLandmarker();

    return () => {
      mounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [config.modelComplexity, config.minDetectionConfidence, config.minTrackingConfidence, config.runningMode]);

  // Detection loop
  const detectPose = useCallback(async () => {
    if (!poseLandmarker || !videoElement) return;

    const currentTime = videoElement.currentTime;

    // Only process new frames
    if (currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = currentTime;

      try {
        const startMs = performance.now();
        const result = poseLandmarker.detectForVideo(videoElement, startMs);

        // Calculate FPS
        fpsCounterRef.current.frames++;
        const now = performance.now();
        if (now - fpsCounterRef.current.lastTime >= 1000) {
          setFps(fpsCounterRef.current.frames);
          fpsCounterRef.current.frames = 0;
          fpsCounterRef.current.lastTime = now;
        }

        if (result.landmarks && result.landmarks.length > 0) {
          const landmarks = result.landmarks[0];
          const worldLandmarks = result.worldLandmarks ? result.worldLandmarks[0] : [];

          // Calculate overall confidence from visible landmarks
          const visibleLandmarks = landmarks.filter(l => (l.visibility || 0) > 0.5);
          const confidence = visibleLandmarks.length / landmarks.length;

          // Mirror landmarks to match mirrored video (selfie view)
          // Video is mirrored with scale-x-[-1], so flip X coordinates
          setLastResult({
            landmarks: landmarks.map(l => ({
              x: 1 - l.x, // Flip X coordinate for mirrored video
              y: l.y,
              z: l.z,
              visibility: l.visibility
            })),
            worldLandmarks: worldLandmarks.map(l => ({
              x: -l.x, // Flip world X coordinate
              y: l.y,
              z: l.z,
              visibility: l.visibility
            })),
            confidence
          });
        } else {
          setLastResult(null);
        }
      } catch (err) {
        console.error('Pose detection error:', err);
      }
    }

    animationFrameRef.current = requestAnimationFrame(detectPose);
  }, [poseLandmarker, videoElement]);

  // Start/stop detection
  useEffect(() => {
    if (poseLandmarker && videoElement) {
      detectPose();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [poseLandmarker, videoElement, detectPose]);

  return {
    isLoading,
    error,
    landmarks: lastResult?.landmarks || null,
    worldLandmarks: lastResult?.worldLandmarks || null,
    confidence: lastResult?.confidence || 0,
    fps
  };
}
