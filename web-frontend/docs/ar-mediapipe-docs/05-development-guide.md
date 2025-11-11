# Development Guide

## Table of Contents
1. [Development Setup](#development-setup)
2. [Debugging Tools](#debugging-tools)
3. [Testing Strategies](#testing-strategies)
4. [Common Issues & Solutions](#common-issues--solutions)
5. [Performance Profiling](#performance-profiling)
6. [Best Practices](#best-practices)

---

## Development Setup

### Prerequisites

**Required:**
- Node.js 18+ (for Next.js 15)
- pnpm 8+ (package manager)
- Modern browser with WebRTC support (Chrome 90+, Firefox 88+, Safari 14+)
- Webcam device (physical or virtual)

**Optional:**
- GPU-enabled device (for faster MediaPipe detection)
- HTTPS setup for production testing (camera requires secure context)

### Installation

```bash
# Clone repository
cd web-frontend

# Install dependencies
pnpm install

# Start development server (Turbopack enabled)
pnpm dev
```

**Development Server**: http://localhost:3000

### Environment Configuration

Create `.env.local` (optional for AR mode):

```bash
# No environment variables required for AR mode
# All processing is client-side
```

**Note**: AR Live Preview runs entirely in the browser (no backend required)

### Browser DevTools Setup

**Chrome DevTools Extensions:**
1. React Developer Tools - Inspect component hierarchy and state
2. Redux DevTools - View Zustand state (with middleware)

**Useful Browser Flags** (for testing):
```
chrome://flags/#unsafely-treat-insecure-origin-as-secure
  → Allow camera access on HTTP localhost

chrome://settings/content/camera
  → Manage camera permissions
```

---

## Debugging Tools

### Built-in Debug Features

#### 1. Pose Landmarks Overlay

**Enable**: Toggle "Show Landmarks" in AR Panel

**What it shows:**
- 33 body landmarks as colored dots
- Skeleton connections as cyan lines
- Shoulders highlighted in green (8px dots)
- Real-time visibility indicators

**Console Output**:
```typescript
// In usePoseDetection hook
console.log('👁️ Landmarks detected:', landmarks.length);
console.log('📊 Confidence:', confidence.toFixed(2));
console.log('⚡ FPS:', fps);
```

**Usage**:
- Verify MediaPipe is detecting pose correctly
- Check landmark visibility values
- Diagnose positioning issues

#### 2. Transform Inspector

**Enable**: Keyboard shortcut `Ctrl+Shift+D` (debug mode)

**What it shows:**
- Current transform values (x, y, scale, rotation, opacity)
- Container dimensions
- Garment dimensions
- History index (undo/redo position)

**Console Output**:
```typescript
// In setTransform
console.log('🔄 Transform updated:', {
  x: transform.x,
  y: transform.y,
  scale: transform.scale,
  rotation: transform.rotation,
  opacity: transform.opacity
});
```

#### 3. FPS Monitor

**Always visible**: Status footer shows detection FPS

**Interpretation**:
- **25-30 FPS**: Excellent (GPU accelerated)
- **15-24 FPS**: Good (CPU or mobile)
- **10-14 FPS**: Fair (consider optimization)
- **< 10 FPS**: Poor (check performance section)

**Console Output**:
```typescript
// Every 500ms
console.log('📈 Detection FPS:', fps);
```

#### 4. Camera Status Indicator

**Always visible**: Top-left corner badge

**States**:
- **Loading**: Gray, "Accessing camera..."
- **Active**: Green, "Camera Active"
- **Error**: Red, error message with retry button

**Console Output**:
```typescript
// Camera access
console.log('📷 Requesting camera access...');
console.log('✅ Camera access granted');
console.log('❌ Camera access denied:', error);
console.log('🛑 Stopped camera stream');
```

### Chrome DevTools Techniques

#### 1. Performance Profiling

**Record a profile**:
1. Open DevTools → Performance tab
2. Click Record
3. Perform actions (drag garment, enable tracking)
4. Stop recording
5. Analyze flame graph

**Key Metrics**:
- **Scripting**: JavaScript execution (should be < 20ms per frame)
- **Rendering**: Layout/paint (should be < 10ms per frame)
- **Idle**: Browser idle time (good!)

**Bottleneck Indicators**:
- Long yellow bars: JavaScript slowdown (check usePoseDetection loop)
- Long purple bars: Layout thrashing (check react-rnd updates)
- Long green bars: Paint operations (check canvas rendering)

#### 2. Memory Profiling

**Take a heap snapshot**:
1. Open DevTools → Memory tab
2. Select "Heap snapshot"
3. Click "Take snapshot"
4. Analyze object retention

**Common Memory Leaks**:
- Unreleased MediaStream (check `stopCameraStream` calls)
- Unrevoked Object URLs (check `URL.revokeObjectURL` in cleanup)
- Uncancelled RAF loops (check `cancelAnimationFrame` in useEffect cleanup)
- Event listeners not removed (check window event cleanup)

**Expected Memory Usage**:
- Initial load: ~80 MB
- After MediaPipe load: ~130 MB
- With video stream: ~180 MB
- Memory leak indicator: Continuously growing beyond 300 MB

#### 3. Network Inspection

**What to check**:
- MediaPipe WASM files (~2 MB total) - should load from CDN
- MediaPipe model file (~3 MB) - should load from Google Cloud Storage
- Cached on subsequent loads (0 KB transferred)

**DevTools → Network tab**:
```
tasks-vision.js         ~500 KB  (jsDelivr CDN)
vision_wasm_internal.*  ~1.5 MB  (jsDelivr CDN)
pose_landmarker_lite.*  ~3 MB    (Google Cloud Storage)
```

**Troubleshooting**:
- If files fail to load: Check CORS, CDN availability, network connectivity
- If files load repeatedly: Check browser cache settings

### React DevTools

#### Component Inspector

**Useful for**:
- Inspecting ARStage props (containerSize, videoReady)
- Checking GarmentOverlay state (isSelected, garmentDimensions)
- Verifying VideoPreview status (loading, ready, error)

**How to use**:
1. Open React DevTools → Components tab
2. Select component in tree
3. View props, state, hooks in right panel

**Example** (ARStage):
```
ARStage
  props: {}
  state:
    containerSize: { width: 640, height: 480 }
    videoReady: true
  hooks:
    State(containerSize): { width: 640, height: 480 }
    State(videoReady): true
    Effect: [dependencies]
```

#### Profiler

**Measure render performance**:
1. Open React DevTools → Profiler tab
2. Click Record
3. Interact with components
4. Stop recording
5. Analyze flamegraph

**Key Insights**:
- Which components re-render most frequently
- Render duration per component
- Unnecessary re-renders (optimize with useMemo/useCallback)

---

## Testing Strategies

### Manual Testing Checklist

#### Camera Access
- [ ] Camera permission requested on first load
- [ ] Error message shown if permission denied
- [ ] Retry button works after fixing permissions
- [ ] Camera LED turns on when active
- [ ] Camera LED turns off when leaving page
- [ ] Video shows mirrored selfie view

#### MediaPipe Detection
- [ ] Pose landmarks appear when enabled
- [ ] Landmarks track body movement smoothly
- [ ] FPS counter shows 15+ FPS
- [ ] Confidence indicator updates (red/yellow/green)
- [ ] Shoulders (green dots) detected correctly
- [ ] Works with frontal, tilted, and seated poses

#### Manual Controls
- [ ] Drag garment with mouse/touch
- [ ] Resize garment using corner handles
- [ ] Arrow keys move garment
- [ ] +/- keys scale garment
- [ ] Fine-tune mode enables 1px steps
- [ ] Shift key enables 10px steps
- [ ] Undo/redo work correctly (Ctrl+Z / Ctrl+Y)
- [ ] Garment stays within bounds (can't drag outside)

#### Auto-Align
- [ ] Button disabled when no pose detected
- [ ] Button disabled when confidence too low
- [ ] Single click aligns garment to shoulders
- [ ] Garment scales to ~90% of shoulder width
- [ ] Garment centers horizontally
- [ ] Garment positioned slightly above shoulders
- [ ] Rotation matches shoulder tilt
- [ ] Button turns green after alignment (2 seconds)
- [ ] Toast notification appears

#### Continuous Tracking
- [ ] Toggle switch enables tracking
- [ ] Garment follows body movement smoothly
- [ ] Tracking pauses when confidence drops
- [ ] Tracking resumes when confidence improves
- [ ] Lock Scale prevents size changes
- [ ] Manual drag temporarily disabled during tracking
- [ ] Toggle switch disables tracking

#### Edge Cases
- [ ] Works with different body types (child, adult, tall, short)
- [ ] Works with various lighting conditions
- [ ] Works when shoulders partially occluded
- [ ] Handles extreme tilts gracefully (clamped to ±45°)
- [ ] Handles user moving out of frame
- [ ] Handles window resize
- [ ] Handles mobile rotation (portrait ↔ landscape)

### Automated Testing (Future)

**Recommended Tools**:
- **Unit Tests**: Jest + React Testing Library
- **Component Tests**: Storybook for isolated component development
- **E2E Tests**: Playwright for full user flows
- **Visual Regression**: Chromatic or Percy for UI consistency

**Test Files to Create**:
```
__tests__/
├── unit/
│   ├── pose-utils.test.ts          # Algorithm tests
│   ├── camera.test.ts              # Camera utility tests
│   └── tryon-store.test.ts         # State management tests
├── component/
│   ├── ARStage.test.tsx            # ARStage component tests
│   ├── GarmentOverlay.test.tsx     # GarmentOverlay tests
│   └── VideoPreview.test.tsx       # VideoPreview tests
└── e2e/
    └── ar-tryon.spec.ts            # Full user flow tests
```

**Example Unit Test** (pose-utils):
```typescript
import { calculateShoulderPosition } from '@/lib/utils/pose-utils';

describe('calculateShoulderPosition', () => {
  it('should calculate center point correctly', () => {
    const landmarks = [
      { x: 0.6, y: 0.3, visibility: 0.9 }, // Left shoulder (11)
      { x: 0.4, y: 0.3, visibility: 0.9 }  // Right shoulder (12)
    ];

    const result = calculateShoulderPosition(landmarks, 640, 480);

    expect(result).toEqual({
      leftShoulder: { x: 384, y: 144 },
      rightShoulder: { x: 256, y: 144 },
      center: { x: 320, y: 144 },
      width: 128,
      angle: 0
    });
  });

  it('should return null when visibility is low', () => {
    const landmarks = [
      { x: 0.6, y: 0.3, visibility: 0.3 }, // Too low
      { x: 0.4, y: 0.3, visibility: 0.9 }
    ];

    const result = calculateShoulderPosition(landmarks, 640, 480);

    expect(result).toBeNull();
  });
});
```

---

## Common Issues & Solutions

### Issue 1: Camera Access Denied

**Symptoms**:
- Red error badge: "Camera permission denied"
- Video preview shows error message
- Browser shows blocked camera icon in address bar

**Causes**:
- User clicked "Block" on permission prompt
- Browser settings deny camera access
- Running on HTTP (not HTTPS) in production

**Solutions**:
1. **Chrome**: chrome://settings/content/camera → Remove blocked site
2. **Firefox**: about:preferences#privacy → Permissions → Camera
3. **Safari**: Safari → Preferences → Websites → Camera
4. **Production**: Use HTTPS (camera requires secure context)

**Code Fix** (provide clear error message):
```typescript
if (error.name === 'NotAllowedError') {
  return (
    <div>
      <p>Camera permission denied.</p>
      <a href="chrome://settings/content/camera" target="_blank">
        Open Camera Settings
      </a>
    </div>
  );
}
```

### Issue 2: MediaPipe Fails to Load

**Symptoms**:
- Console error: "Failed to fetch"
- Pose detection never starts
- FPS counter stuck at 0

**Causes**:
- Network connectivity issues
- CDN unreachable (jsDelivr, Google Cloud Storage)
- CORS policy blocking requests
- Ad blocker interfering

**Solutions**:
1. Check network connection
2. Verify CDN URLs are accessible
3. Disable ad blockers temporarily
4. Check browser console for CORS errors

**Code Fix** (retry logic with exponential backoff):
```typescript
let retryCount = 0;
const MAX_RETRIES = 3;

async function loadMediaPipeWithRetry() {
  try {
    await FilesetResolver.forVisionTasks(CDN_URL);
  } catch (err) {
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`Retry ${retryCount}/${MAX_RETRIES} in ${delay}ms...`);
      setTimeout(() => loadMediaPipeWithRetry(), delay);
    } else {
      console.error('MediaPipe load failed after 3 attempts');
      // Fallback: disable MediaPipe, manual mode only
    }
  }
}
```

### Issue 3: Low FPS (< 15 FPS)

**Symptoms**:
- FPS counter shows < 15 FPS
- Laggy pose detection
- Garment movement stutters
- Browser feels slow

**Causes**:
- CPU-only processing (GPU unavailable)
- High video resolution (1080p+)
- Other heavy processes running
- Underpowered device

**Solutions**:
1. **Reduce video resolution**:
   ```typescript
   // In camera.ts
   video: {
     width: { ideal: 640 },   // Reduced from 1280
     height: { ideal: 480 },  // Reduced from 720
     frameRate: { ideal: 30 }
   }
   ```

2. **Force CPU delegate** (sometimes more stable):
   ```typescript
   baseOptions: {
     delegate: 'CPU'  // Instead of 'GPU'
   }
   ```

3. **Increase throttling** (continuous tracking):
   ```typescript
   // In ContinuousTracker
   if (Date.now() - lastUpdate < 200) return;  // 5 FPS instead of 10 FPS
   ```

4. **Disable landmarks overlay**:
   - Toggle off "Show Landmarks" (canvas rendering has overhead)

### Issue 4: Garment Alignment Off-Center

**Symptoms**:
- Auto-align places garment too far left/right
- Garment doesn't match shoulder position visually
- Continuous tracking follows incorrectly

**Causes**:
- Coordinate mirroring mismatch
- Container size calculated incorrectly
- Video aspect ratio doesn't match container
- Garment base width incorrect

**Solutions**:
1. **Verify mirroring** (in usePoseDetection):
   ```typescript
   // Landmarks must be mirrored to match video
   const mirroredLandmarks = landmarks.map(l => ({
     x: 1 - l.x,  // CRITICAL: Flip X coordinate
     y: l.y
   }));
   ```

2. **Check container dimensions**:
   ```typescript
   // In ARStage
   console.log('Container size:', containerSize);
   console.log('Video size:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
   // Should match or be proportional
   ```

3. **Adjust alignment offset**:
   ```typescript
   // In pose-utils.ts
   const VERTICAL_OFFSET_RATIO = 0.15;  // Adjust if needed (0.1 to 0.2)
   ```

### Issue 5: Garment Appears Distorted

**Symptoms**:
- Garment looks stretched or squashed
- Aspect ratio doesn't look right
- Garment shape changes when resizing

**Causes**:
- Aspect ratio lock disabled
- Incorrect aspect ratio calculation
- react-rnd not preserving proportions

**Solutions**:
1. **Enable aspect ratio lock**:
   ```typescript
   // In GarmentOverlay
   <Rnd
     lockAspectRatio={true}  // Force this to true
   />
   ```

2. **Verify aspect ratio calculation**:
   ```typescript
   const aspectRatio = selectedGarment.height / selectedGarment.width;
   console.log('Aspect ratio:', aspectRatio);
   // Should be > 1 for vertical garments (shirts)
   ```

3. **Load garment dimensions correctly**:
   ```typescript
   // When loading garment image
   const img = new Image();
   img.onload = () => {
     console.log('Garment dimensions:', img.width, 'x', img.height);
     // Update garment object with correct dimensions
   };
   img.src = garmentSrc;
   ```

---

## Performance Profiling

### Key Metrics to Monitor

**Target Performance**:
- **Detection FPS**: 20-30 (desktop), 15-20 (mobile)
- **React Render**: < 16ms per frame (60 FPS UI)
- **Memory Usage**: < 200 MB (with video stream)
- **CPU Usage**: < 30% (single core)
- **GPU Usage**: < 40%

### Profiling Workflow

#### 1. Baseline Measurement

**Steps**:
1. Open DevTools → Performance tab
2. Record for 10 seconds with MediaPipe enabled
3. Stop recording
4. Note baseline metrics

**What to look for**:
- Consistent 60 FPS in "Main" section (UI thread)
- MediaPipe detection loop taking 30-50ms per cycle
- No long tasks (> 50ms) blocking UI

#### 2. Stress Test

**Steps**:
1. Enable continuous tracking
2. Enable landmarks overlay
3. Move body rapidly
4. Record performance profile

**What to look for**:
- FPS should stay above 15
- No frame drops (gray bars in timeline)
- No memory leaks (heap size stable)

#### 3. Identify Bottlenecks

**Common Bottlenecks**:

**a) Pose Detection Loop (expected)**:
```
detectPose()
  └─ detectForVideo()  ← 30-50ms (MediaPipe processing)
```
**Solution**: This is expected, optimize other areas first

**b) Excessive Re-renders**:
```
ARStage → render (5ms)
  └─ GarmentOverlay → render (10ms)
      └─ PoseLandmarks → render (15ms)
          └─ Canvas.draw() ← 15ms (bottleneck!)
```
**Solution**: Memoize canvas drawing, only redraw when landmarks change

**c) Transform Updates (60 FPS)**:
```
setTransform() → 100 calls/second (continuous tracking)
  └─ Zustand update → 1ms
      └─ React re-render → 5ms
          └─ react-rnd update → 10ms (bottleneck!)
```
**Solution**: Throttle updates to 10 FPS (already implemented)

#### 4. Optimization Checklist

**Quick Wins**:
- [ ] Memoize expensive calculations with `useMemo`
- [ ] Throttle continuous tracking updates (100ms intervals)
- [ ] Disable landmarks overlay when not debugging
- [ ] Use production build (`pnpm build && pnpm start`)
- [ ] Enable hardware acceleration in browser settings

**Advanced Optimizations**:
- [ ] Web Worker for MediaPipe (offload from main thread)
- [ ] OffscreenCanvas for landmarks rendering (separate thread)
- [ ] SharedArrayBuffer for landmark data (zero-copy)
- [ ] WASM SIMD for position calculations (faster math)

---

## Best Practices

### Code Organization

**1. Separate Concerns**:
```
hooks/          # Reusable logic (usePoseDetection)
utils/          # Pure functions (pose-utils, camera)
components/     # UI components (ARStage, GarmentOverlay)
stores/         # State management (tryon-store)
```

**2. Keep Components Small**:
- ARStage: < 150 lines (orchestration only)
- GarmentOverlay: < 200 lines (UI + interactions)
- usePoseDetection: < 150 lines (hook logic)

**3. Extract Reusable Logic**:
```typescript
// Before (logic in component)
const shoulderPos = {
  center: {
    x: (landmarks[11].x + landmarks[12].x) / 2 * width,
    y: (landmarks[11].y + landmarks[12].y) / 2 * height
  },
  // ... more calculations
};

// After (extracted to utility)
const shoulderPos = calculateShoulderPosition(landmarks, width, height);
```

### State Management

**1. Use Zustand Selectors**:
```typescript
// Bad: Re-renders on any store change
const store = useTryonStore();

// Good: Re-renders only when transform changes
const transform = useTryonStore(state => state.transform);
```

**2. Batch State Updates**:
```typescript
// Bad: Multiple updates
setTransform({ x: 100 });
setTransform({ y: 200 });
setTransform({ scale: 1.5 });

// Good: Single update
setTransform({ x: 100, y: 200, scale: 1.5 });
```

**3. Avoid Storing Derived State**:
```typescript
// Bad: Storing calculated value
const [garmentWidth, setGarmentWidth] = useState(200);

// Good: Calculate on-demand
const garmentWidth = 200 * transform.scale;
```

### Performance

**1. Throttle Expensive Operations**:
```typescript
// Bad: Updates 30 times per second
useEffect(() => {
  autoAlignGarment(/* ... */);
}, [landmarks]);

// Good: Updates 10 times per second
useEffect(() => {
  const now = Date.now();
  if (now - lastUpdate < 100) return;  // Throttle
  autoAlignGarment(/* ... */);
}, [landmarks]);
```

**2. Memoize Heavy Calculations**:
```typescript
// Bad: Recalculates every render
const shoulderPos = calculateShoulderPosition(landmarks, width, height);

// Good: Only recalculates when inputs change
const shoulderPos = useMemo(
  () => calculateShoulderPosition(landmarks, width, height),
  [landmarks, width, height]
);
```

**3. Lazy Load Heavy Dependencies**:
```typescript
// Bad: MediaPipe loaded on initial page load
import { PoseLandmarker } from '@mediapipe/tasks-vision';

// Good: MediaPipe loaded only when enabled
const loadMediaPipe = async () => {
  const { PoseLandmarker } = await import('@mediapipe/tasks-vision');
  // ...
};
```

### Error Handling

**1. Graceful Degradation**:
```typescript
if (!landmarks || !isConfidentPose(landmarks)) {
  // Fallback: Use last known position
  return;
}
```

**2. User-Friendly Error Messages**:
```typescript
// Bad: Technical error
throw new Error('DOMException: NotAllowedError');

// Good: Actionable guidance
setError('Camera permission denied. Please allow camera access in browser settings.');
```

**3. Automatic Recovery**:
```typescript
// If pose confidence drops, pause tracking
if (confidence < 0.5) {
  console.warn('⚠️ Low confidence, pausing tracking');
  // Tracking automatically resumes when confidence improves
  return;
}
```

### Debugging

**1. Console Logging Strategy**:
```typescript
// Use emoji prefixes for easy scanning
console.log('✅ Success:', result);
console.log('❌ Error:', error);
console.log('⚠️ Warning:', warning);
console.log('🔄 Update:', data);
console.log('📊 Metrics:', stats);
```

**2. Conditional Debugging**:
```typescript
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('🐛 Debug info:', {
    landmarks: landmarks.length,
    confidence,
    fps
  });
}
```

**3. Performance Marks**:
```typescript
performance.mark('detection-start');
// ... expensive operation
performance.mark('detection-end');
performance.measure('detection', 'detection-start', 'detection-end');

const measure = performance.getEntriesByName('detection')[0];
console.log('⏱️ Detection took:', measure.duration.toFixed(2), 'ms');
```

---

## Troubleshooting Quick Reference

| Symptom | Likely Cause | Quick Fix |
|---------|-------------|-----------|
| Camera not starting | Permission denied | Check browser permissions |
| No pose detected | MediaPipe failed to load | Check network, retry |
| Low FPS (< 15) | CPU-only processing | Reduce video resolution |
| Garment misaligned | Coordinate mirroring issue | Verify `x: 1 - l.x` in hook |
| Garment distorted | Aspect ratio not locked | Set `lockAspectRatio: true` |
| Memory leak | Stream not stopped | Check cleanup in useEffect |
| Jittery tracking | No throttling | Add 100ms throttle |
| Auto-align disabled | Low pose confidence | Improve lighting, positioning |

---

## Next Steps

Congratulations! You now have a comprehensive understanding of the AR Live Preview system.

**For further exploration**:
- Experiment with different MediaPipe models (Full, Heavy)
- Implement Web Worker for offloading pose detection
- Add support for lower-body garments (pants, skirts)
- Integrate with 3D rendering (Three.js) for realistic draping
- Build mobile app with React Native integration

**Resources**:
- MediaPipe Documentation: https://developers.google.com/mediapipe
- react-rnd GitHub: https://github.com/bokuweb/react-rnd
- Zustand Documentation: https://github.com/pmndrs/zustand
- Next.js Performance: https://nextjs.org/docs/app/building-your-application/optimizing
