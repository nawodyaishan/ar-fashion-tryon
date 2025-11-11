# Component Architecture & Data Flow

## Table of Contents
1. [Component Hierarchy](#component-hierarchy)
2. [ARStage - Main Orchestrator](#arstage---main-orchestrator)
3. [VideoPreview - Camera Stream](#videopreview---camera-stream)
4. [GarmentOverlay - Interactive Layer](#garmentoverlay---interactive-layer)
5. [Supporting Components](#supporting-components)
6. [State Management](#state-management)
7. [Data Flow Diagrams](#data-flow-diagrams)

---

## Component Hierarchy

### Visual Tree

```
app/try-on/page.tsx
└── ARStage (Orchestrator)
    ├── VideoPreview (Camera)
    │   └── usePoseDetection Hook
    │       └── MediaPipe SDK
    ├── GarmentOverlay (Interactive)
    │   └── react-rnd (Drag/Resize)
    ├── PoseLandmarks (Debug, conditional)
    │   └── Canvas overlay
    ├── ContinuousTracker (Auto-follow, conditional)
    └── AutoAlignButton (One-shot, conditional)

components/tryon/ARPanel.tsx (Sidebar)
├── GarmentGallery (Picker)
├── TransformControls (Sliders)
└── Guides section (Settings)
```

### File Locations

```
components/tryon/
├── ARStage.tsx                  # Main orchestrator
├── VideoPreview.tsx             # Camera access & video element
├── GarmentOverlay.tsx           # Draggable garment with react-rnd
├── PoseLandmarks.tsx            # Debug visualization (canvas)
├── ContinuousTracker.tsx        # Auto-tracking logic
├── AutoAlignButton.tsx          # One-shot alignment trigger
├── ARPanel.tsx                  # Right sidebar controls
└── TransformControls.tsx        # Scale/rotation/opacity sliders

lib/
├── hooks/
│   └── usePoseDetection.ts     # MediaPipe integration hook
├── utils/
│   ├── pose-utils.ts           # Position calculation functions
│   └── camera.ts               # Camera access utilities
└── tryon-store.ts              # Zustand state management
```

---

## ARStage - Main Orchestrator

### File Location
`components/tryon/ARStage.tsx`

### Responsibilities

1. **Container Dimension Tracking**: Monitor video container size for responsive positioning
2. **Component Composition**: Render VideoPreview, GarmentOverlay, and conditional components
3. **MediaPipe Lifecycle**: Enable/disable pose detection based on user settings
4. **Coordinate System**: Provide container dimensions to child components

### Component Structure

```typescript
export default function ARStage() {
  // Store subscriptions
  const mediaPipeEnabled = useTryonStore(state => state.mediaPipeEnabled);
  const landmarksVisible = useTryonStore(state => state.landmarksVisible);
  const continuousTracking = useTryonStore(state => state.continuousTracking);
  const selectedGarmentId = useTryonStore(state => state.selectedGarmentId);

  // Local state
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [videoReady, setVideoReady] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // MediaPipe hook (conditional)
  const { landmarks, confidence, fps, isLoading, error } = usePoseDetection(
    mediaPipeEnabled ? videoRef.current : null,
    {
      modelComplexity: 'lite',
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    }
  );

  // Container dimension tracking
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width, height });
    });

    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Camera video feed */}
      <VideoPreview
        ref={videoRef}
        onStreamReady={() => setVideoReady(true)}
      />

      {/* Garment overlay (draggable/resizable) */}
      {selectedGarmentId && videoReady && (
        <GarmentOverlay
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
        />
      )}

      {/* Debug visualization */}
      {landmarksVisible && landmarks && (
        <PoseLandmarks
          landmarks={landmarks}
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
        />
      )}

      {/* Continuous tracking (side-effect component) */}
      {continuousTracking && landmarks && selectedGarmentId && (
        <ContinuousTracker
          landmarks={landmarks}
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
        />
      )}

      {/* Status indicators */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        {/* Camera status */}
        <StatusBadge status={videoReady ? 'active' : 'loading'} />

        {/* MediaPipe status */}
        {mediaPipeEnabled && (
          <StatusBadge
            status={isLoading ? 'loading' : error ? 'error' : 'active'}
            label={`Pose: ${fps} FPS`}
          />
        )}

        {/* Confidence indicator */}
        {mediaPipeEnabled && confidence > 0 && (
          <ConfidenceBadge level={getConfidenceLevel(confidence)} />
        )}
      </div>
    </div>
  );
}
```

### Key Implementation Details

#### 1. Container Dimension Tracking

**Why needed?**
- MediaPipe returns **normalized coordinates** (0-1)
- Must convert to **pixel coordinates** for rendering
- Container can resize (window resize, sidebar toggle, mobile rotation)

**ResizeObserver Pattern**:
```typescript
useEffect(() => {
  const resizeObserver = new ResizeObserver(entries => {
    const { width, height } = entries[0].contentRect;
    setContainerSize({ width, height });
    console.log('📐 Container resized:', width, 'x', height);
  });

  resizeObserver.observe(containerRef.current);

  return () => {
    resizeObserver.disconnect();
    console.log('🛑 Stopped observing container');
  };
}, []);
```

**Performance**: Negligible (native browser API, ~0.1ms per resize)

#### 2. Conditional MediaPipe Hook

**Pattern**:
```typescript
// Only pass video element when MediaPipe is enabled
usePoseDetection(
  mediaPipeEnabled ? videoRef.current : null,  // Conditional
  options
);
```

**Benefit**:
- MediaPipe SDK only loaded when enabled (saves ~5MB initial load)
- Detection loop only runs when enabled (saves CPU/GPU)
- Automatic cleanup when disabled (hook unmount logic)

#### 3. Video Ready State

**Problem**: Video element exists before stream is ready

**Solution**: Wait for `onStreamReady` callback
```typescript
const [videoReady, setVideoReady] = useState(false);

// In VideoPreview component
useEffect(() => {
  // After getUserMedia success
  videoElement.onloadedmetadata = () => {
    onStreamReady();  // Notify parent
  };
}, []);

// In ARStage
{videoReady && <GarmentOverlay />}  // Only render when video ready
```

**Prevents**: Garment overlay appearing before camera activates

#### 4. Component Composition

**Layering** (z-index implicit via DOM order):
```html
<!-- Layer 1: Video (bottom) -->
<VideoPreview />

<!-- Layer 2: Pose landmarks (middle, optional) -->
{landmarksVisible && <PoseLandmarks />}

<!-- Layer 3: Garment overlay (top) -->
<GarmentOverlay />

<!-- Layer 4: UI controls (topmost) -->
<div className="absolute top-4 left-4">
  <StatusBadges />
</div>
```

**CSS Position**: All layers use `absolute` positioning within `relative` container

---

## VideoPreview - Camera Stream

### File Location
`components/tryon/VideoPreview.tsx`

### Responsibilities

1. **Camera Access**: Request webcam via `getUserMedia`
2. **Stream Management**: Handle video stream lifecycle (start, stop, error)
3. **Video Element**: Provide ref to video element for MediaPipe
4. **Error Handling**: Display user-friendly error messages for camera issues

### Component Structure

```typescript
interface VideoPreviewProps {
  onStreamReady?: () => void;
}

const VideoPreview = forwardRef<HTMLVideoElement, VideoPreviewProps>(
  ({ onStreamReady }, ref) => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
      let mounted = true;

      async function initCamera() {
        setStatus('loading');

        try {
          // Request camera access
          const stream = await requestCameraAccess();

          if (!mounted) {
            // Component unmounted during async operation
            stopCameraStream(stream);
            return;
          }

          streamRef.current = stream;

          // Attach stream to video element
          if (ref && 'current' in ref && ref.current) {
            ref.current.srcObject = stream;

            ref.current.onloadedmetadata = () => {
              setStatus('ready');
              onStreamReady?.();
              console.log('✅ Video stream ready');
            };
          }

        } catch (err) {
          if (!mounted) return;

          console.error('❌ Camera access failed:', err);
          setError(getCameraErrorMessage(err));
          setStatus('error');
        }
      }

      initCamera();

      // Cleanup
      return () => {
        mounted = false;

        if (streamRef.current) {
          stopCameraStream(streamRef.current);
          streamRef.current = null;
          console.log('🛑 Stopped camera stream');
        }
      };
    }, [ref, onStreamReady]);

    return (
      <div className="relative w-full h-full">
        {/* Loading state */}
        {status === 'loading' && (
          <div className="flex items-center justify-center h-full bg-black/50">
            <Spinner />
            <p>Accessing camera...</p>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center h-full bg-black/50 p-6">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-white text-center mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        )}

        {/* Video element */}
        <video
          ref={ref}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"  // Mirrored
        />

        {/* "Camera Active" indicator */}
        {status === 'ready' && (
          <div className="absolute bottom-4 left-4">
            <Badge variant="success">
              <Camera className="w-3 h-3 mr-1" />
              Camera Active
            </Badge>
          </div>
        )}
      </div>
    );
  }
);

VideoPreview.displayName = 'VideoPreview';
export default VideoPreview;
```

### Key Implementation Details

#### 1. Camera Access Function

**File**: `lib/camera.ts`

```typescript
export async function requestCameraAccess(): Promise<MediaStream> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera API not supported in this browser');
  }

  try {
    console.log('📷 Requesting camera access...');

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',  // Front camera (selfie)
        frameRate: { ideal: 30 }
      },
      audio: false
    });

    console.log('✅ Camera access granted');
    return stream;

  } catch (err) {
    console.error('❌ Camera access denied:', err);
    throw err;
  }
}
```

**Constraints Explained**:
- `width: { ideal: 1280 }`: Request HD resolution (fallback to lower if unavailable)
- `facingMode: 'user'`: Front camera (selfie mode)
- `frameRate: { ideal: 30 }`: 30 FPS (balance quality vs. performance)
- `audio: false`: No microphone needed

#### 2. Stream Cleanup

```typescript
export function stopCameraStream(stream: MediaStream): void {
  stream.getTracks().forEach(track => {
    track.stop();
    console.log('🛑 Stopped track:', track.kind, track.label);
  });
}
```

**Why important?**
- Releases camera hardware (LED turns off)
- Prevents memory leaks
- Allows other apps to use camera
- Called on component unmount

#### 3. Error Handling

```typescript
function getCameraErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) {
    return 'Unknown camera error';
  }

  const errorName = err.name;

  switch (errorName) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Camera permission denied. Please allow camera access in your browser settings.';

    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera found. Please connect a camera and try again.';

    case 'NotReadableError':
    case 'TrackStartError':
      return 'Camera is already in use by another application. Please close other apps using the camera.';

    case 'OverconstrainedError':
      return 'Could not satisfy camera constraints. Try a different camera.';

    default:
      return `Camera error: ${err.message}`;
  }
}
```

**User-Friendly Messages**:
- Technical errors → actionable guidance
- Suggests specific solutions
- Links to browser settings (future enhancement)

#### 4. Video Element Configuration

```html
<video
  ref={ref}
  autoPlay        <!-- Start playing immediately -->
  playsInline     <!-- Mobile: prevent fullscreen -->
  muted           <!-- No audio playback -->
  className="scale-x-[-1]"  <!-- Mirror horizontally (selfie view) -->
/>
```

**Mirroring**:
- `scale-x-[-1]`: Tailwind class for `scaleX(-1)` transform
- Creates natural selfie view (right hand moves right)
- MediaPipe landmarks must also be mirrored (handled in hook)

---

## GarmentOverlay - Interactive Layer

### File Location
`components/tryon/GarmentOverlay.tsx`

### Responsibilities

1. **Garment Rendering**: Display selected garment image
2. **Manual Controls**: Drag, resize, rotate via react-rnd
3. **Keyboard Shortcuts**: Arrow keys, +/-, fine-tune mode
4. **Transform Application**: Apply scale, rotation, opacity from store
5. **Bounds Constraint**: Keep garment within video frame

### Component Structure

```typescript
interface GarmentOverlayProps {
  containerWidth: number;
  containerHeight: number;
}

export default function GarmentOverlay({
  containerWidth,
  containerHeight
}: GarmentOverlayProps) {
  // Store subscriptions
  const selectedGarment = useTryonStore(state =>
    state.garments.find(g => g.id === state.selectedGarmentId)
  );
  const transform = useTryonStore(state => state.transform);
  const setTransform = useTryonStore(state => state.setTransform);
  const fineTuneMode = useTryonStore(state => state.fineTuneMode);

  // Local state
  const [isSelected, setIsSelected] = useState(false);
  const [garmentDimensions, setGarmentDimensions] = useState({ width: 200, height: 200 });

  // Calculate garment dimensions based on aspect ratio
  useEffect(() => {
    if (!selectedGarment) return;

    const aspectRatio = selectedGarment.height / selectedGarment.width;
    const baseWidth = 200;  // Base size
    const width = baseWidth * transform.scale;
    const height = width * aspectRatio;

    setGarmentDimensions({ width, height });
  }, [selectedGarment, transform.scale, transform.lockAspect]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isSelected) return;

    function handleKeyDown(e: KeyboardEvent) {
      const step = fineTuneMode ? 1 : (e.shiftKey ? 10 : 5);

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setTransform({ y: transform.y - step }, true);
          break;

        case 'ArrowDown':
          e.preventDefault();
          setTransform({ y: transform.y + step }, true);
          break;

        case 'ArrowLeft':
          e.preventDefault();
          setTransform({ x: transform.x - step }, true);
          break;

        case 'ArrowRight':
          e.preventDefault();
          setTransform({ x: transform.x + step }, true);
          break;

        case '+':
        case '=':
          e.preventDefault();
          setTransform({
            scale: Math.min(3.0, transform.scale + 0.05)
          }, true);
          break;

        case '-':
        case '_':
          e.preventDefault();
          setTransform({
            scale: Math.max(0.3, transform.scale - 0.05)
          }, true);
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, transform, fineTuneMode, setTransform]);

  // Handle drag end (with magnetic snapping)
  const handleDragStop = (_e: DraggableEvent, d: DraggableData) => {
    let finalX = d.x;
    let finalY = d.y;

    // Magnetic snapping to center
    const centerX = containerWidth / 2 - garmentDimensions.width / 2;
    const SNAP_THRESHOLD = 15;

    if (Math.abs(d.x - centerX) < SNAP_THRESHOLD) {
      finalX = centerX;
      console.log('🧲 Snapped to center');
    }

    setTransform({ x: Math.round(finalX), y: Math.round(finalY) }, true);
  };

  // Handle resize end (keep center fixed)
  const handleResizeStop = (
    _e: MouseEvent | TouchEvent,
    _dir: string,
    ref: HTMLElement,
    _delta: any,
    position: { x: number; y: number }
  ) => {
    const newWidth = ref.offsetWidth;
    const newScale = newWidth / 200;  // Base width

    setTransform(
      {
        scale: Math.round(newScale * 1000) / 1000,  // 3 decimals
        x: Math.round(position.x),
        y: Math.round(position.y)
      },
      true
    );
  };

  if (!selectedGarment) return null;

  return (
    <Rnd
      size={garmentDimensions}
      position={{ x: transform.x, y: transform.y }}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      lockAspectRatio={transform.lockAspect}
      bounds="parent"  // Constrained to ARStage container
      enableResizing={{
        top: false,
        right: true,
        bottom: true,
        left: false,
        topRight: true,
        bottomRight: true,
        bottomLeft: true,
        topLeft: true
      }}
      onMouseDown={() => setIsSelected(true)}
      onTouchStart={() => setIsSelected(true)}
      className={cn(
        'cursor-move border-2 transition-colors',
        isSelected ? 'border-blue-400' : 'border-transparent'
      )}
      resizeHandleStyles={{
        topRight: { cursor: 'ne-resize' },
        bottomRight: { cursor: 'se-resize' },
        bottomLeft: { cursor: 'sw-resize' },
        topLeft: { cursor: 'nw-resize' }
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          opacity: transform.opacity / 100,
          transform: `rotate(${transform.rotation}deg)`,
          transformOrigin: 'center',
          pointerEvents: 'none'  // Allow clicks to pass through to Rnd
        }}
      >
        <img
          src={selectedGarment.src}
          alt={selectedGarment.name}
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Resize handles (visible when selected) */}
      {isSelected && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Corner indicators */}
          <div className="absolute top-0 left-0 w-2 h-2 bg-blue-400 rounded-full" />
          <div className="absolute top-0 right-0 w-2 h-2 bg-blue-400 rounded-full" />
          <div className="absolute bottom-0 left-0 w-2 h-2 bg-blue-400 rounded-full" />
          <div className="absolute bottom-0 right-0 w-2 h-2 bg-blue-400 rounded-full" />
        </div>
      )}
    </Rnd>
  );
}
```

### Key Implementation Details

#### 1. react-rnd Integration

**What is react-rnd?**
- Library combining draggable (react-draggable) and resizable (react-resizable)
- Single component for both interactions
- Touch support for mobile devices

**Key Props**:
```typescript
<Rnd
  size={{ width, height }}          // Current dimensions
  position={{ x, y }}                // Current position
  onDragStop={handleDragStop}        // Drag end callback
  onResizeStop={handleResizeStop}    // Resize end callback
  lockAspectRatio={boolean}          // Maintain proportions
  bounds="parent"                    // Constrained movement
  enableResizing={{...}}             // Which handles to show
/>
```

#### 2. Aspect Ratio Calculation

```typescript
// Garment image: 512x614 (example)
const aspectRatio = 614 / 512 = 1.199

// Base width: 200px
const width = 200 * scale  // e.g., 200 * 0.7 = 140px
const height = width * aspectRatio  // 140 * 1.199 = 167.9px
```

**Why calculate dynamically?**
- Different garments have different aspect ratios
- Scale affects both width and height
- Maintains visual proportions

#### 3. Keyboard Shortcuts

**Step Sizes**:
- **Fine-tune mode ON**: 1px steps (precise adjustments)
- **Shift held**: 10px steps (coarse adjustments)
- **Default**: 5px steps (balanced)

**Scale Adjustments**:
- **+/=**: Increase by 0.05 (5%)
- **-/_**: Decrease by 0.05 (5%)
- **Range**: 0.3 to 3.0 (30% to 300%)

**Implementation**:
```typescript
const step = fineTuneMode ? 1 : (e.shiftKey ? 10 : 5);

// Arrow keys move garment
setTransform({ x: transform.x + step }, true);  // Right
setTransform({ y: transform.y - step }, true);  // Up

// +/- keys scale garment
setTransform({
  scale: Math.min(3.0, transform.scale + 0.05)
}, true);
```

#### 4. Magnetic Snapping

```typescript
// Snap to horizontal center
const centerX = containerWidth / 2 - garmentWidth / 2;
const SNAP_THRESHOLD = 15;  // pixels

if (Math.abs(dragX - centerX) < SNAP_THRESHOLD) {
  finalX = centerX;  // Snap!
}
```

**User Experience**:
- Helps align garment perfectly centered
- Visual feedback (guide line in debug mode)
- Only when within 15px threshold (not intrusive)

#### 5. Transform Application

**CSS Transform Chain**:
```css
.garment {
  /* Position */
  left: x px;
  top: y px;

  /* Size */
  width: baseWidth * scale px;
  height: baseHeight * scale px;

  /* Opacity */
  opacity: opacity / 100;  /* 0-100 → 0-1 */

  /* Rotation */
  transform: rotate(rotation deg);
  transform-origin: center;
}
```

**Transform Origin**:
- `center`: Rotate around garment center (natural behavior)
- Alternative: `top left` (rotate around top-left corner, less intuitive)

---

## Supporting Components

### PoseLandmarks (Debug Visualization)

**File**: `components/tryon/PoseLandmarks.tsx`

**Purpose**: Visualize detected pose landmarks for debugging

**Rendering**:
```typescript
// Canvas overlay
<canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

// Draw skeleton connections
POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
  ctx.beginPath();
  ctx.moveTo(start.x * width, start.y * height);
  ctx.lineTo(end.x * width, end.y * height);
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';  // Cyan
  ctx.lineWidth = 2;
  ctx.stroke();
});

// Draw landmark dots
landmarks.forEach((landmark, index) => {
  const x = landmark.x * width;
  const y = landmark.y * height;
  const color = SHOULDER_LANDMARKS.includes(index) ? '#00ff00' : '#ffff00';
  const size = SHOULDER_LANDMARKS.includes(index) ? 8 : 4;

  ctx.beginPath();
  ctx.arc(x, y, size, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
});
```

**Color Coding**:
- **Green (8px)**: Shoulders (11, 12) - critical for alignment
- **Yellow (4px)**: Other body parts
- **Cyan lines**: Skeleton connections

### ContinuousTracker (Auto-Follow)

**File**: `components/tryon/ContinuousTracker.tsx`

**Purpose**: Side-effect component that updates transform in real-time

**Implementation**:
```typescript
export default function ContinuousTracker({
  landmarks,
  containerWidth,
  containerHeight
}: Props) {
  const autoAlignGarment = useTryonStore(state => state.autoAlignGarment);
  const lockScale = useTryonStore(state => state.lockScale);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    // Throttle to 10 FPS
    const now = Date.now();
    if (now - lastUpdateRef.current < 100) return;

    // Confidence check
    if (!isConfidentPose(landmarks)) return;

    // Calculate position
    const shoulderPos = calculateShoulderPosition(landmarks, containerWidth, containerHeight);
    if (!shoulderPos) return;

    const garmentPos = calculateGarmentPosition(shoulderPos);

    // Update transform store
    autoAlignGarment(
      garmentPos.x,
      garmentPos.y,
      lockScale ? undefined : garmentPos.scale,  // Preserve scale if locked
      garmentPos.rotation
    );

    lastUpdateRef.current = now;
  }, [landmarks, containerWidth, containerHeight, autoAlignGarment, lockScale]);

  return null;  // No UI, just side effects
}
```

**Throttling**:
- Detection: 20-30 FPS
- Updates: 10 FPS (100ms intervals)
- Reason: Smooth following without jitter, saves CPU

**Lock Scale Feature**:
- When ON: Only update position and rotation, preserve scale
- When OFF: Update all properties (follow + resize)

### AutoAlignButton (One-Shot)

**File**: `components/tryon/AutoAlignButton.tsx`

**Purpose**: Trigger single alignment to current pose

**Implementation**:
```typescript
export default function AutoAlignButton() {
  const landmarks = useTryonStore(state => state.landmarks);
  const autoAlignGarment = useTryonStore(state => state.autoAlignGarment);
  const [isAligning, setIsAligning] = useState(false);
  const [justAligned, setJustAligned] = useState(false);

  const canAlign = landmarks && isConfidentPose(landmarks);

  const handleAlign = () => {
    if (!canAlign) {
      toast.error('Cannot detect pose. Improve lighting or positioning.');
      return;
    }

    setIsAligning(true);

    // Visual feedback delay
    setTimeout(() => {
      const shoulderPos = calculateShoulderPosition(/* ... */);
      if (!shoulderPos) {
        toast.error('Could not detect shoulders');
        setIsAligning(false);
        return;
      }

      const garmentPos = calculateGarmentPosition(shoulderPos);

      autoAlignGarment(
        garmentPos.x,
        garmentPos.y,
        garmentPos.scale,
        garmentPos.rotation
      );

      setJustAligned(true);
      toast.success('Garment aligned to shoulders');
      setIsAligning(false);

      // Reset green button after 2 seconds
      setTimeout(() => setJustAligned(false), 2000);
    }, 300);
  };

  return (
    <Button
      onClick={handleAlign}
      disabled={!canAlign || isAligning}
      className={cn(
        justAligned && 'bg-green-500 hover:bg-green-600'
      )}
    >
      {isAligning && <Spinner className="mr-2" />}
      Auto-Align
    </Button>
  );
}
```

**Visual Feedback**:
1. Click button
2. Button shows spinner (300ms)
3. Garment animates to position
4. Button turns green (2 seconds)
5. Toast notification
6. Button returns to normal

---

## State Management

### Zustand Store Structure

**File**: `lib/tryon-store.ts`

```typescript
interface TryonState {
  // Garments
  garments: Garment[];
  selectedGarmentId: string | null;

  // Transform (current position/appearance)
  transform: Transform;
  baselineTransform: Transform;  // Reset point

  // History (undo/redo)
  positionHistory: Transform[];
  historyIndex: number;

  // MediaPipe settings
  mediaPipeEnabled: boolean;
  landmarksVisible: boolean;
  continuousTracking: boolean;
  lockScale: boolean;

  // Pose data (from usePoseDetection hook)
  landmarks: NormalizedLandmark[] | null;
  poseConfidence: number;
  fps: number;

  // UI state
  fineTuneMode: boolean;

  // Actions
  selectGarment: (id: string) => void;
  setTransform: (partial: Partial<Transform>, addToHistory?: boolean) => void;
  autoAlignGarment: (x: number, y: number, scale?: number, rotation?: number) => void;
  resetToBaseline: () => void;
  toggleMediaPipe: () => void;
  toggleContinuousTracking: () => void;
  undo: () => void;
  redo: () => void;
}
```

### Key Actions

#### setTransform (Manual Updates)

```typescript
setTransform: (partial, addToHistory = false) =>
  set(state => {
    const newTransform = { ...state.transform, ...partial };

    // Add to history for undo/redo
    if (addToHistory) {
      const newHistory = state.positionHistory.slice(0, state.historyIndex + 1);
      newHistory.push(newTransform);

      return {
        transform: newTransform,
        positionHistory: newHistory,
        historyIndex: newHistory.length - 1
      };
    }

    return { transform: newTransform };
  })
```

**Usage**:
```typescript
// Manual drag (add to history)
setTransform({ x: 300, y: 150 }, true);

// Continuous tracking (don't add to history, too frequent)
setTransform({ x: 302, y: 148 }, false);
```

#### autoAlignGarment (Automatic Updates)

```typescript
autoAlignGarment: (x, y, scale, rotation) =>
  set(state => {
    const newTransform = {
      ...state.transform,
      x: Math.round(x),
      y: Math.round(y),
      scale: scale !== undefined ? Math.max(0.5, Math.min(1.5, scale)) : state.transform.scale,
      rotation: rotation !== undefined ? Math.max(-45, Math.min(45, rotation)) : state.transform.rotation
    };

    // Always add auto-align to history
    const newHistory = [...state.positionHistory, newTransform];

    return {
      transform: newTransform,
      positionHistory: newHistory,
      historyIndex: newHistory.length - 1
    };
  })
```

**Clamping**:
- Scale: 0.5 to 1.5 (prevent extreme sizes)
- Rotation: -45° to +45° (prevent vertical garments)

#### undo / redo

```typescript
undo: () =>
  set(state => {
    if (state.historyIndex <= 0) return state;

    const newIndex = state.historyIndex - 1;
    return {
      transform: state.positionHistory[newIndex],
      historyIndex: newIndex
    };
  }),

redo: () =>
  set(state => {
    if (state.historyIndex >= state.positionHistory.length - 1) return state;

    const newIndex = state.historyIndex + 1;
    return {
      transform: state.positionHistory[newIndex],
      historyIndex: newIndex
    };
  })
```

**Keyboard Shortcuts**:
```typescript
// In ARStage or global listener
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (e.key === 'y') {
        e.preventDefault();
        redo();
      }
    }
  }

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [undo, redo]);
```

---

## Data Flow Diagrams

### Complete System Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                   USER ACTIONS                          │
│  - Enable MediaPipe toggle                              │
│  - Drag garment                                         │
│  - Resize garment                                       │
│  - Click Auto-Align                                     │
│  - Toggle Continuous Tracking                           │
└────────────────────┬────────────────────────────────────┘
                     │
       ┌─────────────┴─────────────┐
       │                           │
       ▼                           ▼
┌─────────────┐           ┌─────────────────┐
│  VideoPreview│           │  GarmentOverlay │
│  - Camera   │           │  - react-rnd    │
│  - Stream   │           │  - Keyboard     │
└──────┬──────┘           └────────┬────────┘
       │                           │
       ▼                           │
┌────────────────┐                 │
│ usePoseDetection│                 │
│  - MediaPipe   │                 │
│  - Landmarks   │                 │
│  - FPS         │                 │
└──────┬─────────┘                 │
       │                           │
       └───────────┬───────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │   Zustand Store     │
         │  - transform        │
         │  - landmarks        │
         │  - settings         │
         └─────────┬───────────┘
                   │
       ┌───────────┴──────────────┐
       │                          │
       ▼                          ▼
┌──────────────┐         ┌─────────────────┐
│  Components  │         │ ContinuousTracker│
│  re-render   │         │  - Auto-follow  │
└──────────────┘         └─────────────────┘
```

### Manual Control Flow

```
User drags garment with mouse
        ↓
react-rnd onDrag callback
        ↓
Calculate new position { x, y }
        ↓
Apply magnetic snapping (if near guide)
        ↓
setTransform({ x, y }, true)  ← Add to history
        ↓
Zustand store updated
        ↓
GarmentOverlay re-renders with new position
```

### Auto-Align Flow

```
User clicks "Auto-Align" button
        ↓
Check isConfidentPose(landmarks)
        ↓ (if confident)
calculateShoulderPosition(landmarks, width, height)
        ↓
Returns: { center, width, angle }
        ↓
calculateGarmentPosition(shoulderPos)
        ↓
Returns: { x, y, scale, rotation }
        ↓
autoAlignGarment(x, y, scale, rotation)
        ↓
Zustand store updated (with history)
        ↓
GarmentOverlay re-renders with new transform
        ↓
Visual feedback (green button, toast)
```

### Continuous Tracking Flow

```
usePoseDetection hook detects pose (20-30 FPS)
        ↓
Landmarks updated in store
        ↓
ContinuousTracker useEffect triggers
        ↓
Check: 100ms elapsed since last update? (throttle to 10 FPS)
        ↓ (if yes)
Check: isConfidentPose(landmarks)?
        ↓ (if yes)
calculateShoulderPosition(landmarks, width, height)
        ↓
calculateGarmentPosition(shoulderPos)
        ↓
autoAlignGarment(x, y, scale, rotation)
        ↓
Zustand store updated (no history, too frequent)
        ↓
GarmentOverlay re-renders with new transform
        ↓
RAF loop continues...
```

---

## Next Steps

For development best practices and setup, see:
- [05-development-guide.md](./05-development-guide.md) - Setup, testing, and debugging
