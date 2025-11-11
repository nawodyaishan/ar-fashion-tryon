# MediaPipe Pose Detection Integration

## Table of Contents
1. [MediaPipe Overview](#mediapipe-overview)
2. [Integration Architecture](#integration-architecture)
3. [usePoseDetection Hook](#useposedetection-hook)
4. [Landmark Structure](#landmark-structure)
5. [Coordinate System](#coordinate-system)
6. [Performance Tuning](#performance-tuning)
7. [Error Handling](#error-handling)

---

## MediaPipe Overview

### What is MediaPipe Pose?

**MediaPipe Pose** is a machine learning solution from Google Research that performs real-time human pose estimation. It detects 33 body landmarks in 3D space from a single RGB image or video stream.

**Key Features:**
- **BlazePose topology**: 33 landmarks covering full body
- **Real-time performance**: 20-30 FPS on modern devices
- **Cross-platform**: Web (WASM), Android, iOS, Python
- **Lightweight**: Lite model is only 3MB
- **3D coordinates**: X, Y, and Z (depth) for each landmark
- **Visibility score**: Confidence metric for each point

### Model Variants

| Variant | Size | Precision | Accuracy | Speed | Use Case |
|---------|------|-----------|----------|-------|----------|
| **Lite** | 3MB | Float16 | Good | Fast | **Current** - Real-time web apps |
| Full | 6MB | Float32 | Better | Medium | Desktop apps, higher accuracy needs |
| Heavy | 12MB | Float32 | Best | Slow | Research, offline processing |

**Current Implementation**: Lite variant for optimal web performance

### BlazePose Landmark Topology

MediaPipe detects **33 landmarks** organized into body regions:

```
FACE (0-10):
0: Nose
1: Left Eye Inner    2: Left Eye       3: Left Eye Outer
4: Right Eye Inner   5: Right Eye      6: Right Eye Outer
7: Left Ear          8: Right Ear
9: Mouth Left        10: Mouth Right

UPPER BODY (11-16):
11: Left Shoulder    12: Right Shoulder  ← CRITICAL for garment alignment
13: Left Elbow       14: Right Elbow
15: Left Wrist       16: Right Wrist

TORSO (23-24):
23: Left Hip         24: Right Hip  ← CRITICAL for confidence check

LOWER BODY (25-32):
25: Left Knee        26: Right Knee
27: Left Ankle       28: Right Ankle
29: Left Heel        30: Right Heel
31: Left Foot Index  32: Right Foot Index
```

**Critical Landmarks for AR Try-On:**
- **Shoulders (11, 12)**: Primary alignment points for upper-body garments
- **Hips (23, 24)**: Used for confidence assessment and body centerline
- **All landmarks**: Used for overall pose confidence calculation

---

## Integration Architecture

### Package Installation

```bash
pnpm add @mediapipe/tasks-vision@0.10.22
```

**Dependencies:**
- `@mediapipe/tasks-vision`: Main SDK package
- WebAssembly runtime (loaded from CDN)
- Model weights (loaded from Google Cloud Storage)

### File Structure

```
lib/
├── hooks/
│   └── usePoseDetection.ts      # Main MediaPipe hook
├── utils/
│   └── pose-utils.ts            # Position calculation utilities
└── tryon-store.ts               # State management

components/tryon/
├── ARStage.tsx                  # Orchestrator (uses hook)
├── VideoPreview.tsx             # Provides video element
├── PoseLandmarks.tsx            # Debug visualization
├── ContinuousTracker.tsx        # Auto-tracking mode
└── AutoAlignButton.tsx          # One-shot alignment
```

### Initialization Flow

```
User enables MediaPipe
        ↓
usePoseDetection hook mounted
        ↓
┌─────────────────────────────────────────┐
│ 1. Load FilesetResolver                 │
│    FilesetResolver.forVisionTasks()     │
│    - Downloads WASM runtime from CDN    │
│    - Initializes WebAssembly context    │
│    Time: ~500ms                         │
└─────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────┐
│ 2. Create PoseLandmarker                │
│    PoseLandmarker.createFromOptions()   │
│    - Downloads model weights (~3MB)     │
│    - Compiles model for GPU/CPU         │
│    Time: ~1500ms                        │
└─────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────┐
│ 3. Start Detection Loop                 │
│    requestAnimationFrame(detectPose)    │
│    - Process video frames               │
│    - Extract landmarks                  │
│    - Calculate confidence               │
│    Rate: 20-30 FPS                      │
└─────────────────────────────────────────┘
        ↓
Landmarks available to components
```

**Total Initialization Time**: 2-4 seconds (first load, from CDN)

---

## usePoseDetection Hook

### File Location
`lib/hooks/usePoseDetection.ts`

### Hook Interface

```typescript
function usePoseDetection(
  videoElement: HTMLVideoElement | null,
  options?: {
    modelComplexity?: 'lite' | 'full' | 'heavy';
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
  }
): {
  landmarks: NormalizedLandmark[] | null;  // 33 body landmarks
  confidence: number;                       // 0.0 to 1.0 (overall pose)
  fps: number;                             // Detection frames per second
  isLoading: boolean;                      // Model loading state
  error: string | null;                    // Error message if failed
}
```

### Complete Implementation

```typescript
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export function usePoseDetection(
  videoElement: HTMLVideoElement | null,
  options = {}
) {
  const {
    modelComplexity = 'lite',
    minDetectionConfidence = 0.5,
    minTrackingConfidence = 0.5
  } = options;

  // State
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [fps, setFps] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);

  // FPS tracking
  const frameTimesRef = useRef<number[]>([]);
  const lastFpsUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!videoElement) return;

    let isMounted = true;

    // Initialize MediaPipe
    async function initializePoseLandmarker() {
      try {
        console.log('🔧 Initializing MediaPipe Pose Landmarker...');

        // Step 1: Load WASM runtime
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm'
        );

        if (!isMounted) return;
        console.log('✅ MediaPipe WASM loaded');

        // Step 2: Create PoseLandmarker with options
        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_${modelComplexity}/float16/latest/pose_landmarker_${modelComplexity}.task`,
            delegate: 'GPU' // Prefer GPU, fallback to CPU automatically
          },
          runningMode: 'VIDEO', // Optimized for video stream
          numPoses: 1,          // Single person detection
          minPoseDetectionConfidence: minDetectionConfidence,
          minPosePresenceConfidence: minDetectionConfidence,
          minTrackingConfidence: minTrackingConfidence
        });

        if (!isMounted) return;

        poseLandmarkerRef.current = poseLandmarker;
        setIsLoading(false);
        console.log('✅ PoseLandmarker initialized');

        // Step 3: Start detection loop
        startDetection();

      } catch (err) {
        console.error('❌ MediaPipe initialization failed:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load MediaPipe');
          setIsLoading(false);
        }
      }
    }

    // Detection loop (RAF-based)
    function startDetection() {
      function detectPose() {
        if (!isMounted || !poseLandmarkerRef.current || !videoElement) {
          return;
        }

        const video = videoElement;

        // Frame skipping: only process when video time changes
        if (video.currentTime === lastVideoTimeRef.current) {
          rafIdRef.current = requestAnimationFrame(detectPose);
          return;
        }
        lastVideoTimeRef.current = video.currentTime;

        const startMs = performance.now();

        try {
          // Detect pose in current video frame
          const results = poseLandmarkerRef.current.detectForVideo(
            video,
            startMs
          );

          // Process results
          if (results.landmarks && results.landmarks.length > 0) {
            const rawLandmarks = results.landmarks[0]; // First (only) person

            // Mirror landmarks for selfie view (flip X coordinate)
            const mirroredLandmarks = rawLandmarks.map(l => ({
              x: 1 - l.x,  // 0.3 becomes 0.7, 0.8 becomes 0.2
              y: l.y,
              z: l.z,
              visibility: l.visibility
            }));

            setLandmarks(mirroredLandmarks);

            // Calculate overall confidence
            const visibleLandmarks = mirroredLandmarks.filter(
              l => (l.visibility || 0) > 0.5
            );
            const overallConfidence = visibleLandmarks.length / rawLandmarks.length;
            setConfidence(overallConfidence);

            // Update FPS (1-second rolling average)
            const now = performance.now();
            frameTimesRef.current.push(now);

            // Remove frames older than 1 second
            frameTimesRef.current = frameTimesRef.current.filter(
              time => now - time < 1000
            );

            // Update FPS display every 500ms
            if (now - lastFpsUpdateRef.current > 500) {
              setFps(frameTimesRef.current.length);
              lastFpsUpdateRef.current = now;
            }

          } else {
            // No pose detected
            setLandmarks(null);
            setConfidence(0);
          }

        } catch (err) {
          console.error('❌ Pose detection error:', err);
          // Don't set error state, just skip this frame
        }

        // Schedule next frame
        rafIdRef.current = requestAnimationFrame(detectPose);
      }

      detectPose(); // Start the loop
    }

    // Initialize on mount
    initializePoseLandmarker();

    // Cleanup on unmount
    return () => {
      isMounted = false;

      // Cancel RAF loop
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        console.log('🛑 Stopped pose detection loop');
      }

      // Close PoseLandmarker (releases GPU resources)
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
        poseLandmarkerRef.current = null;
        console.log('🛑 Closed PoseLandmarker');
      }
    };
  }, [videoElement, modelComplexity, minDetectionConfidence, minTrackingConfidence]);

  return {
    landmarks,
    confidence,
    fps,
    isLoading,
    error
  };
}
```

### Key Implementation Details

**1. Frame Skipping**
```typescript
// Only process when video advances to a new frame
if (video.currentTime === lastVideoTimeRef.current) {
  requestAnimationFrame(detectPose); // Skip this frame
  return;
}
```
**Benefit**: Avoids redundant processing, saves ~20% CPU

**2. Coordinate Mirroring**
```typescript
// Video is mirrored (scale-x-[-1]), so flip X coordinates
const mirroredLandmarks = rawLandmarks.map(l => ({
  x: 1 - l.x,  // Flip horizontal axis
  y: l.y,      // Keep vertical as-is
  z: l.z,
  visibility: l.visibility
}));
```
**Benefit**: Landmarks match visual video for intuitive controls

**3. FPS Calculation**
```typescript
// 1-second rolling window
frameTimesRef.current = frameTimesRef.current.filter(
  time => now - time < 1000
);
setFps(frameTimesRef.current.length); // Count frames in last 1s
```
**Benefit**: Accurate real-time performance monitoring

**4. Confidence Calculation**
```typescript
// Percentage of landmarks with visibility > 0.5
const visibleCount = landmarks.filter(l => l.visibility > 0.5).length;
const confidence = visibleCount / 33; // 0.0 to 1.0
```
**Benefit**: Simple quality metric for pose detection

**5. Cleanup**
```typescript
// Always cleanup on unmount
poseLandmarker.close();        // Release GPU/CPU resources
cancelAnimationFrame(rafId);   // Stop detection loop
```
**Benefit**: Prevents memory leaks and GPU exhaustion

---

## Landmark Structure

### NormalizedLandmark Interface

```typescript
interface NormalizedLandmark {
  x: number;          // Horizontal position (0.0 = left, 1.0 = right, MIRRORED)
  y: number;          // Vertical position (0.0 = top, 1.0 = bottom)
  z: number;          // Depth (negative = toward camera, positive = away)
  visibility: number; // Confidence score (0.0 = not visible, 1.0 = very confident)
}
```

### Example Landmarks

**Frontal Pose (User facing camera straight-on):**
```typescript
// Left Shoulder (Landmark 11)
{
  x: 0.62,        // 62% from left edge (after mirroring)
  y: 0.28,        // 28% from top edge
  z: -0.15,       // Slightly toward camera
  visibility: 0.95 // 95% confident
}

// Right Shoulder (Landmark 12)
{
  x: 0.38,        // 38% from left edge (after mirroring)
  y: 0.28,        // Same height as left
  z: -0.18,       // Slightly toward camera
  visibility: 0.93 // 93% confident
}

// Left Hip (Landmark 23)
{
  x: 0.55,        // 55% from left edge
  y: 0.62,        // 62% from top edge
  z: 0.02,        // Slightly away from camera
  visibility: 0.88 // 88% confident
}
```

**Tilted Pose (User leaning right):**
```typescript
// Left Shoulder (Landmark 11) - Higher
{
  x: 0.64,
  y: 0.24,        // Higher than normal (24% vs 28%)
  z: -0.12,
  visibility: 0.92
}

// Right Shoulder (Landmark 12) - Lower
{
  x: 0.36,
  y: 0.32,        // Lower than normal (32% vs 28%)
  z: -0.22,
  visibility: 0.89
}
```

### Visibility Interpretation

| Range | Quality | Usage |
|-------|---------|-------|
| **0.85 - 1.0** | Excellent | High confidence, use for all operations |
| **0.70 - 0.84** | Good | Reliable for most operations |
| **0.50 - 0.69** | Fair | Use with caution, may be partially occluded |
| **0.30 - 0.49** | Poor | Likely occluded, ignore for critical operations |
| **0.0 - 0.29** | Very Poor | Not visible, do not use |

**Current Thresholds:**
- **Auto-Align**: Requires both shoulders ≥ 0.5 visibility
- **Continuous Tracking**: Requires 3 out of 4 critical landmarks (L11, R12, L23, R24) ≥ 0.5
- **Confidence Indicator**: Green (≥0.7), Yellow (0.5-0.7), Red (<0.5)

---

## Coordinate System

### Overview

MediaPipe returns **normalized coordinates** (0.0 to 1.0) relative to the video frame. The AR system must convert these to **pixel coordinates** for rendering.

### Coordinate Spaces

**1. MediaPipe Coordinates (Output from detectForVideo)**
```typescript
// Normalized 0.0 to 1.0
x: 0.5  // Center horizontally
y: 0.3  // 30% from top
z: 0.0  // At depth plane of hips

// Origin: Top-left corner
// X increases: Left to right (NOT MIRRORED YET)
// Y increases: Top to bottom
// Z increases: Away from camera (hips = 0.0)
```

**2. Mirrored Coordinates (After hook processing)**
```typescript
// Mirrored for selfie view
x: 1 - rawX  // 0.3 becomes 0.7, 0.8 becomes 0.2
y: rawY      // Unchanged
z: rawZ      // Unchanged

// Now matches visual video (scale-x-[-1])
```

**3. Pixel Coordinates (Used for rendering)**
```typescript
// Container: 640px wide x 480px tall
pixelX = mirroredX * containerWidth   // 0.5 → 320px
pixelY = mirroredY * containerHeight  // 0.3 → 144px

// Origin: Top-left corner (same as video element)
```

### Conversion Functions

**File**: `lib/utils/pose-utils.ts`

```typescript
/**
 * Convert normalized landmark to pixel coordinates
 */
export function landmarkToPixels(
  landmark: NormalizedLandmark,
  containerWidth: number,
  containerHeight: number
): { x: number; y: number } {
  return {
    x: Math.round(landmark.x * containerWidth),
    y: Math.round(landmark.y * containerHeight)
  };
}

/**
 * Convert pixel coordinates back to normalized
 * (Useful for testing and debugging)
 */
export function pixelsToNormalized(
  x: number,
  y: number,
  containerWidth: number,
  containerHeight: number
): { x: number; y: number } {
  return {
    x: x / containerWidth,
    y: y / containerHeight
  };
}
```

### Mirroring Rationale

**Why mirror landmarks?**
1. Video element uses `scale-x-[-1]` for natural selfie view
2. User expects right hand to move right, left hand to move left
3. Without mirroring, landmarks would be flipped relative to video

**Mirroring Strategy:**
- **Option A**: Mirror video, keep landmarks as-is → Awkward UX (right hand moves left)
- **Option B**: Keep video normal, mirror landmarks → Awkward UX (not a selfie view)
- **Option C** (Current): Mirror both video AND landmarks → Natural selfie UX ✅

**Implementation:**
```typescript
// Video mirroring (CSS)
<video style={{ transform: 'scaleX(-1)' }} />

// Landmark mirroring (JavaScript in hook)
landmarks.map(l => ({ ...l, x: 1 - l.x }))
```

### Z-Axis (Depth) Usage

**Current Status**: Z-axis is detected but **not used** for garment positioning

**Potential Future Uses:**
1. **Depth-based occlusion**: Hide garment behind raised arms
2. **3D rotation**: Rotate garment based on body rotation (side views)
3. **Scale adjustment**: Smaller garment when user steps back
4. **Perspective correction**: Skew garment for realistic 3D appearance

**Why not used currently:**
- System optimized for frontal poses (2D alignment sufficient)
- Z-axis less accurate than X/Y (±5cm error typical)
- Additional complexity without significant UX benefit
- 2D overlay approach is performant and intuitive

---

## Performance Tuning

### Configuration Options

```typescript
PoseLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath: string,  // Model file URL
    delegate: 'GPU' | 'CPU'  // Acceleration preference
  },
  runningMode: 'IMAGE' | 'VIDEO',  // Detection mode
  numPoses: number,                // Max poses to detect (1 recommended)
  minPoseDetectionConfidence: number,   // 0.0-1.0 (0.5 recommended)
  minPosePresenceConfidence: number,    // 0.0-1.0 (0.5 recommended)
  minTrackingConfidence: number         // 0.0-1.0 (0.5 recommended)
});
```

### Recommended Settings

**For Web AR Try-On (Current):**
```typescript
{
  delegate: 'GPU',                     // Prefer GPU, fallback to CPU
  runningMode: 'VIDEO',                // Optimized for video stream
  numPoses: 1,                         // Single user
  minPoseDetectionConfidence: 0.5,     // Balanced
  minPosePresenceConfidence: 0.5,      // Balanced
  minTrackingConfidence: 0.5           // Balanced
}
```

**For High Accuracy (Slower):**
```typescript
{
  modelAssetPath: 'pose_landmarker_full.task',  // Full model (6MB)
  minPoseDetectionConfidence: 0.7,              // Higher threshold
  minTrackingConfidence: 0.7                    // More stable tracking
}
```

**For Low-End Devices (Faster):**
```typescript
{
  modelAssetPath: 'pose_landmarker_lite.task',  // Already using
  delegate: 'CPU',                              // Force CPU (more compatible)
  minPoseDetectionConfidence: 0.4,              // Lower threshold (more detections)
  minTrackingConfidence: 0.4                    // Less strict
}
```

### Performance Monitoring

**FPS Tracking (in hook):**
```typescript
// 1-second rolling window
const frameTimesRef = useRef<number[]>([]);

function updateFps() {
  const now = performance.now();
  frameTimesRef.current.push(now);

  // Keep only frames from last 1 second
  frameTimesRef.current = frameTimesRef.current.filter(
    time => now - time < 1000
  );

  // FPS = number of frames in last second
  const currentFps = frameTimesRef.current.length;
  setFps(currentFps);
}
```

**Expected FPS Ranges:**
- **Desktop (GPU)**: 25-30 FPS
- **Desktop (CPU)**: 15-20 FPS
- **Mobile (GPU)**: 18-25 FPS
- **Mobile (CPU)**: 10-15 FPS

**When FPS drops below 15:**
1. Switch to Lite model (if not already)
2. Reduce video resolution (720p → 480p)
3. Increase throttling interval (100ms → 200ms for continuous tracking)
4. Disable landmarks overlay rendering
5. Consider CPU delegate (sometimes more stable than GPU on some devices)

---

## Error Handling

### Common Errors

**1. Model Loading Failed**
```typescript
// Error: Failed to fetch model file
// Cause: Network issue, CDN unreachable, CORS error
// Solution: Retry with exponential backoff, fallback to local model

if (error && error.includes('fetch')) {
  console.error('❌ Model loading failed, check network');
  // Show user-friendly message
  setError('Failed to download AI model. Check your internet connection.');
}
```

**2. GPU Initialization Failed**
```typescript
// Error: WebGL context creation failed
// Cause: GPU drivers, browser limitations, hardware constraints
// Solution: Automatic fallback to CPU delegate

// MediaPipe handles this automatically:
// delegate: 'GPU' → tries GPU, falls back to CPU if fails
```

**3. Video Element Not Ready**
```typescript
// Error: Video dimensions are 0x0
// Cause: Video not loaded, still initializing
// Solution: Wait for loadedmetadata event

videoElement.addEventListener('loadedmetadata', () => {
  console.log('✅ Video ready:', video.videoWidth, video.videoHeight);
  // Now safe to start detection
});
```

**4. WASM Module Load Failed**
```typescript
// Error: Failed to load WASM module
// Cause: Browser incompatibility, CSP restrictions, CORS
// Solution: Check browser support, update CSP headers

if (!WebAssembly) {
  setError('Your browser does not support WebAssembly');
  // Disable MediaPipe, use manual mode only
}
```

### Error Recovery Strategy

```typescript
let retryCount = 0;
const MAX_RETRIES = 3;

async function initializeWithRetry() {
  try {
    await initializePoseLandmarker();
  } catch (err) {
    console.error(`❌ Attempt ${retryCount + 1} failed:`, err);

    if (retryCount < MAX_RETRIES) {
      retryCount++;
      const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
      console.log(`🔄 Retrying in ${delay}ms...`);

      setTimeout(() => {
        initializeWithRetry();
      }, delay);
    } else {
      // Give up, disable MediaPipe
      console.error('❌ MediaPipe initialization failed after 3 attempts');
      setError('Pose detection unavailable. You can still use manual controls.');
    }
  }
}
```

### Degradation Levels

```
Level 0: Full Functionality
  ✅ MediaPipe loaded
  ✅ GPU acceleration
  ✅ All features available

Level 1: CPU Fallback
  ✅ MediaPipe loaded
  ⚠️ CPU processing (slower)
  ✅ All features available

Level 2: Manual Mode Only
  ❌ MediaPipe unavailable
  ✅ Manual drag/resize/keyboard
  ❌ Auto-align disabled
  ❌ Continuous tracking disabled

Level 3: No Camera Access
  ❌ Camera permission denied
  ❌ AR mode unavailable
  ✅ Photo Try-On mode still works
```

---

## Next Steps

For detailed algorithm documentation, see:
- [03-position-algorithms.md](./03-position-algorithms.md) - Shoulder detection and garment positioning
- [04-component-architecture.md](./04-component-architecture.md) - Component integration and data flow
