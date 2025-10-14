# AR Live Mode - Quick Reference Guide

**For Developers** | Last Updated: 2025-01-14

## 🚀 Quick Start

```bash
# Navigate to frontend
cd web-frontend

# Install dependencies
pnpm install

# Run development server
pnpm dev

# Open browser
# http://localhost:3000/try-on
```

## 📁 File Locations

| Component | Path |
|-----------|------|
| **Main Orchestrator** | `components/tryon/ARStage.tsx` |
| **MediaPipe Hook** | `lib/hooks/usePoseDetection.ts` |
| **Pose Utilities** | `lib/pose-utils.ts` |
| **State Store** | `lib/tryon-store.ts` |
| **Garment Overlay** | `components/tryon/GarmentOverlay.tsx` |
| **Auto-Align Button** | `components/tryon/AutoAlignButton.tsx` |
| **Continuous Tracker** | `components/tryon/ContinuousTracker.tsx` |
| **Landmarks Overlay** | `components/tryon/PoseLandmarks.tsx` |
| **Control Panel** | `components/tryon/ARPanel.tsx` |

## 🔧 Key Configuration

### MediaPipe Model

```typescript
// lib/hooks/usePoseDetection.ts

const modelComplexity = 'lite'; // Options: 'lite', 'full', 'heavy'
const minDetectionConfidence = 0.5; // Range: 0.0 - 1.0
const minTrackingConfidence = 0.5; // Range: 0.0 - 1.0
```

### Continuous Tracking Throttle

```typescript
// components/tryon/ContinuousTracker.tsx

const THROTTLE_MS = 100; // 10 FPS (increase for slower, decrease for faster)
```

### Garment Positioning Algorithm

```typescript
// lib/pose-utils.ts

const shoulderWidthMultiplier = 1.2; // 120% of shoulder width
const verticalOffset = 0.15; // 15% upward from center
```

## 🎯 Core Algorithms

### Shoulder Detection

```typescript
// Input: 33 MediaPipe landmarks
// Output: Shoulder position with center, width, and angle

import { calculateShoulderPosition } from '@/lib/pose-utils';

const shoulderPos = calculateShoulderPosition(
  landmarks,      // PoseLandmark[]
  containerWidth, // number (pixels)
  containerHeight // number (pixels)
);

// Returns:
// {
//   leftShoulder: { x, y },
//   rightShoulder: { x, y },
//   center: { x, y },
//   width: number,
//   angle: number (degrees)
// }
```

### Garment Position Calculation

```typescript
// Input: Shoulder position
// Output: Garment transform (x, y, scale, rotation)

import { calculateGarmentPosition } from '@/lib/pose-utils';

const garmentPos = calculateGarmentPosition(
  shoulderPos,       // ShoulderPosition
  baseGarmentWidth   // number (default: 200px)
);

// Returns:
// {
//   x: number,
//   y: number,
//   scale: number (0.3 - 3.0),
//   rotation: number (-45 to 45 degrees)
// }
```

### Confidence Check

```typescript
// Input: 33 landmarks
// Output: Boolean (true if at least 3/4 critical landmarks visible)

import { isConfidentPose } from '@/lib/pose-utils';

const confident = isConfidentPose(landmarks);

// Critical landmarks: LEFT_SHOULDER (11), RIGHT_SHOULDER (12), LEFT_HIP (23), RIGHT_HIP (24)
```

## 📊 State Management

### Access Store

```typescript
import { useTryonStore } from '@/lib/tryon-store';

function MyComponent() {
  const {
    // State
    selectedGarmentId,
    transform,
    mediaPipeEnabled,
    continuousTracking,
    poseConfidence,

    // Actions
    selectGarment,
    setTransform,
    toggleMediaPipe,
    autoAlignGarment,
    setPoseConfidence
  } = useTryonStore();

  // Use state and actions...
}
```

### Transform Object

```typescript
interface Transform {
  x: number;          // Position X (pixels)
  y: number;          // Position Y (pixels)
  scale: number;      // 0.3 to 3.0 (30% to 300%)
  rotation: number;   // -45 to 45 (degrees)
  opacity: number;    // 0 to 100 (percentage)
  lockAspect: boolean; // Maintain aspect ratio
}
```

### Update Transform

```typescript
// Partial update
setTransform({ x: 100, y: 200 });

// Full auto-align
autoAlignGarment(x, y, scale, rotation);

// Reset to baseline
resetToBaseline();
```

## 🎨 Styling Utilities

### Glassmorphic Card

```tsx
<Card className="bg-black/20 backdrop-blur-sm border-white/10">
  {/* Content */}
</Card>
```

### Floating Button

```tsx
<Button
  variant="secondary"
  size="sm"
  className="backdrop-blur-sm bg-black/30 hover:bg-black/50"
>
  {/* Icon and text */}
</Button>
```

### Status Indicator

```tsx
<div className="text-xs text-white/70 bg-black/30 backdrop-blur-sm px-2 py-1 rounded">
  {statusText}
</div>
```

## 🔍 Debug Tools

### Enable Landmarks Overlay

```typescript
// In ARPanel or programmatically
toggleLandmarks(); // Shows/hides 33-point skeleton
```

### Console Logging

```typescript
// MediaPipe initialization
console.log('🚀 Initializing MediaPipe...');
console.log('✅ MediaPipe initialized');

// Pose detection
console.log('Confidence:', confidence);
console.log('FPS:', fps);

// Auto-align
console.log('Shoulder position:', shoulderPos);
console.log('Garment position:', garmentPos);
```

### Performance Monitoring

```typescript
// Check FPS
const { fps } = usePoseDetection(videoElement, config);
console.log(`Current FPS: ${fps}`);

// Check landmark visibility
landmarks.forEach((lm, idx) => {
  if (lm.visibility < 0.5) {
    console.warn(`Landmark ${idx} low visibility: ${lm.visibility}`);
  }
});
```

## 🧪 Testing Checklist

### Basic Functionality
- [ ] Camera access works
- [ ] Video feed displays (mirrored)
- [ ] Garment selection works
- [ ] Garment overlay appears
- [ ] Drag to move works
- [ ] Resize handles work
- [ ] Keyboard shortcuts work

### MediaPipe Detection
- [ ] Toggle enables/disables detection
- [ ] Landmarks appear when facing camera
- [ ] Shoulders (11, 12) highlighted green
- [ ] Confidence indicator accurate
- [ ] FPS counter displays
- [ ] Detection pauses when looking away

### Auto-Align
- [ ] Button disabled without confident pose
- [ ] Button enabled with confident pose
- [ ] Click aligns to shoulders
- [ ] Scale matches shoulder width
- [ ] Rotation matches shoulder angle
- [ ] Manual adjustment works after

### Continuous Tracking
- [ ] Toggle enables tracking
- [ ] Follows left/right movement
- [ ] Scales with distance
- [ ] Rotates with tilt
- [ ] Freezes when pose lost
- [ ] Resumes smoothly
- [ ] No jitter or jumps

## 🐛 Common Issues & Fixes

### Issue: MediaPipe not loading

```typescript
// Check CDN access
console.log('Loading from:', 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');

// Check network tab in DevTools for 404/CORS errors

// Try clearing cache
localStorage.clear();
location.reload();
```

### Issue: Landmarks not mirroring correctly

```typescript
// Verify coordinate flip in usePoseDetection.ts
const mirroredLandmarks = landmarks.map(l => ({
  x: 1 - l.x, // Should be flipped
  y: l.y,      // Should NOT be flipped
  z: l.z,
  visibility: l.visibility
}));
```

### Issue: Auto-align positions incorrectly

```typescript
// Debug shoulder detection
console.log('Left Shoulder:', landmarks[11]);
console.log('Right Shoulder:', landmarks[12]);
console.log('Shoulder Width:', shoulderPos.width);
console.log('Shoulder Center:', shoulderPos.center);

// Adjust multiplier in pose-utils.ts
const targetWidth = shoulderPos.width * 1.2; // Try 1.1 or 1.3
```

### Issue: Performance lag

```typescript
// Increase throttle interval
const THROTTLE_MS = 150; // From 100ms to 150ms (slower but smoother)

// Disable landmarks overlay
setLandmarksVisible(false);

// Lower video resolution
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: 640 },  // From 1280
    height: { ideal: 480 }, // From 720
    frameRate: { ideal: 24 } // From 30
  }
});
```

## 📐 Coordinate Systems

### MediaPipe Coordinates (Normalized)

```
(0, 0) ─────────────────────────── (1, 0)
  │                                    │
  │         Normalized Space           │
  │         0.0 to 1.0                 │
  │                                    │
(0, 1) ─────────────────────────── (1, 1)
```

### Pixel Coordinates (Container)

```
(0, 0) ───────────────────────── (width, 0)
  │                                      │
  │       Pixel Space                    │
  │       (e.g., 640x480)                │
  │                                      │
(0, height) ──────────────── (width, height)
```

### Conversion

```typescript
// Normalized → Pixel
const pixelX = normalizedX * containerWidth;
const pixelY = normalizedY * containerHeight;

// Pixel → Normalized
const normalizedX = pixelX / containerWidth;
const normalizedY = pixelY / containerHeight;
```

## 🎯 Landmark Indices

```
Shoulders (CRITICAL):
  11: Left Shoulder  ← Auto-align uses this
  12: Right Shoulder ← Auto-align uses this

Face:
  0: Nose
  2: Left Eye
  5: Right Eye

Arms:
  13: Left Elbow
  14: Right Elbow
  15: Left Wrist
  16: Right Wrist

Torso:
  23: Left Hip
  24: Right Hip

Legs:
  25: Left Knee
  26: Right Knee
  27: Left Ankle
  28: Right Ankle
```

## 🚀 Optimization Tips

### 1. Reduce Model Complexity

```typescript
// Use lite model (default, recommended)
modelComplexity: 'lite' // ~3MB, fast

// Only use full/heavy for high-accuracy needs
modelComplexity: 'full' // ~6MB, slower
modelComplexity: 'heavy' // ~12MB, slowest
```

### 2. Throttle Updates

```typescript
// Continuous tracking throttle
const THROTTLE_MS = 100; // 10 FPS (default)
const THROTTLE_MS = 200; // 5 FPS (better for low-end devices)
```

### 3. Conditional Rendering

```typescript
// Only render landmarks when visible
{landmarksVisible && <PoseLandmarks />}

// Only run tracker when enabled
{continuousTracking && <ContinuousTracker />}
```

### 4. Lazy Load MediaPipe

```typescript
// Don't load model until user enables
const { landmarks } = usePoseDetection(
  mediaPipeEnabled ? videoRef.current : null, // Conditional
  config
);
```

### 5. GPU Acceleration

```typescript
// Ensure GPU delegate is enabled
baseOptions: {
  modelAssetPath: MODEL_PATH,
  delegate: 'GPU' // Critical for performance
}
```

## 📦 Dependencies

```json
{
  "@mediapipe/tasks-vision": "0.10.14",
  "react-rnd": "^10.5.2",
  "zustand": "^5.0.2",
  "next": "15.4.2",
  "react": "^19"
}
```

## 🔗 Useful Links

- [MediaPipe Pose Docs](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker)
- [react-rnd Docs](https://github.com/bokuweb/react-rnd)
- [Zustand Docs](https://docs.pmnd.rs/zustand)
- [Next.js 15 Docs](https://nextjs.org/docs)

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/nawodyaishan/ar-fashion-tryon/issues)
- **Email:** nawodyain@gmail.com
- **Documentation:** See `AR_LIVE_IMPLEMENTATION.md` for full details

---

**Last Updated:** 2025-01-14
**Version:** 1.0
**Status:** ✅ Production Ready
