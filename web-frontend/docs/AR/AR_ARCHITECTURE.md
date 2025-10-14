# AR Live Mode - System Architecture

**Visual Reference Guide** | Last Updated: 2025-01-14

## 🏗️ High-Level System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          AR Fashion Try-On System                        │
│                                                                           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐             │
│  │   Browser    │    │   Next.js    │    │   MediaPipe  │             │
│  │   Camera     │───▶│   Frontend   │───▶│   ML Model   │             │
│  │   API        │    │   (React)    │    │   (WASM)     │             │
│  └──────────────┘    └──────────────┘    └──────────────┘             │
│         │                     │                    │                     │
│         ▼                     ▼                    ▼                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐             │
│  │  MediaStream │    │   Zustand    │    │  33 Pose     │             │
│  │  (Video)     │    │   Store      │    │  Landmarks   │             │
│  └──────────────┘    └──────────────┘    └──────────────┘             │
│         │                     │                    │                     │
│         └─────────────────────┴────────────────────┘                     │
│                               │                                           │
│                               ▼                                           │
│                      ┌─────────────────┐                                 │
│                      │  Garment Overlay│                                 │
│                      │  with Transform │                                 │
│                      └─────────────────┘                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🧩 Component Architecture

### Layer 1: Camera & Video

```
┌────────────────────────────────────────────────────────────┐
│                    VideoPreview Component                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  getUserMedia() API                                   │  │
│  │  • Request camera access                             │  │
│  │  • Handle permissions                                │  │
│  │  • Error handling                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  <video> element                                      │  │
│  │  • Mirrored (scale-x-[-1])                           │  │
│  │  • autoPlay, playsInline                             │  │
│  │  • srcObject = MediaStream                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Stream Ready Callback                                │  │
│  │  • Pass to parent (ARStage)                          │  │
│  │  • Trigger MediaPipe initialization                  │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Layer 2: MediaPipe Pose Detection

```
┌────────────────────────────────────────────────────────────┐
│              usePoseDetection Hook (Core Logic)             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Initialization Phase                                 │  │
│  │  1. Load WASM from CDN                               │  │
│  │  2. Load model (~3MB lite)                           │  │
│  │  3. Create PoseLandmarker                            │  │
│  │  4. Configure GPU delegate                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Detection Loop (requestAnimationFrame)              │  │
│  │                                                       │  │
│  │  While (video playing) {                             │  │
│  │    if (newFrame) {                                   │  │
│  │      result = detectForVideo(video, timestamp)       │  │
│  │      landmarks = result.landmarks[0] (33 points)     │  │
│  │      mirror(landmarks) // Flip X for selfie view     │  │
│  │      calculateConfidence(landmarks)                  │  │
│  │      updateFPS()                                     │  │
│  │      setLastResult(landmarks, confidence)            │  │
│  │    }                                                 │  │
│  │  }                                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Output                                               │  │
│  │  • landmarks: PoseLandmark[] (33 points)             │  │
│  │  • confidence: number (0-1)                          │  │
│  │  • fps: number                                       │  │
│  │  • isLoading: boolean                                │  │
│  │  • error: string | null                              │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Layer 3: Pose Analysis & Positioning

```
┌────────────────────────────────────────────────────────────┐
│                    pose-utils.ts (Algorithms)               │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  calculateShoulderPosition()                          │  │
│  │                                                       │  │
│  │  Input:  landmarks, containerWidth, containerHeight   │  │
│  │  Extract: landmarks[11] (L shoulder)                 │  │
│  │          landmarks[12] (R shoulder)                  │  │
│  │  Check:  visibility > 0.5                            │  │
│  │  Convert: normalized (0-1) → pixels                  │  │
│  │  Calculate:                                          │  │
│  │    • center = midpoint(L, R)                         │  │
│  │    • width = distance(L, R)                          │  │
│  │    • angle = atan2(Ry - Ly, Rx - Lx)                │  │
│  │                                                       │  │
│  │  Output:  ShoulderPosition {                         │  │
│  │             leftShoulder: {x, y}                     │  │
│  │             rightShoulder: {x, y}                    │  │
│  │             center: {x, y}                           │  │
│  │             width: number                            │  │
│  │             angle: number                            │  │
│  │           }                                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  calculateGarmentPosition()                           │  │
│  │                                                       │  │
│  │  Input:  shoulderPos, baseGarmentWidth (200px)       │  │
│  │  Calculate:                                          │  │
│  │    • targetWidth = shoulderWidth × 1.2              │  │
│  │    • scale = targetWidth / baseWidth                │  │
│  │    • x = center.x - (scaledWidth / 2)               │  │
│  │    • y = center.y - (scaledWidth × 0.15)            │  │
│  │    • rotation = shoulderAngle (clamped ±45°)        │  │
│  │                                                       │  │
│  │  Output:  GarmentSuggestion {                        │  │
│  │             x: number                                 │  │
│  │             y: number                                 │  │
│  │             scale: number (0.3-3.0)                  │  │
│  │             rotation: number (-45 to 45)             │  │
│  │           }                                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  isConfidentPose()                                    │  │
│  │                                                       │  │
│  │  Input:  landmarks                                    │  │
│  │  Check:  visibility of critical landmarks            │  │
│  │          - Left Shoulder (11)                        │  │
│  │          - Right Shoulder (12)                       │  │
│  │          - Left Hip (23)                             │  │
│  │          - Right Hip (24)                            │  │
│  │                                                       │  │
│  │  Output:  boolean (true if ≥3 visible)               │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Layer 4: State Management

```
┌────────────────────────────────────────────────────────────┐
│               Zustand Store (tryon-store.ts)                │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  State                                                │  │
│  │  ├─ activeMode: 'ar' | 'photo'                       │  │
│  │  ├─ garments: Garment[]                              │  │
│  │  ├─ selectedGarmentId: string | null                 │  │
│  │  ├─ transform: Transform {                           │  │
│  │  │    x: 320,                                        │  │
│  │  │    y: 180,                                        │  │
│  │  │    scale: 1.0,                                    │  │
│  │  │    rotation: 0,                                   │  │
│  │  │    opacity: 90,                                   │  │
│  │  │    lockAspect: true                               │  │
│  │  │  }                                                 │  │
│  │  ├─ baselineTransform: Transform                     │  │
│  │  ├─ mediaPipeEnabled: boolean                        │  │
│  │  ├─ landmarksVisible: boolean                        │  │
│  │  ├─ continuousTracking: boolean                      │  │
│  │  ├─ poseConfidence: 'Low' | 'Okay' | 'Good'         │  │
│  │  ├─ autoAlignInProgress: boolean                     │  │
│  │  └─ lastAutoAlignTime: number                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Actions                                              │  │
│  │  ├─ selectGarment(id)                                │  │
│  │  ├─ setTransform(partial)                            │  │
│  │  ├─ toggleMediaPipe()                                │  │
│  │  ├─ toggleLandmarks()                                │  │
│  │  ├─ toggleContinuousTracking()                       │  │
│  │  ├─ autoAlignGarment(x, y, scale, rotation)         │  │
│  │  ├─ setPoseConfidence(confidence)                    │  │
│  │  ├─ resetToBaseline()                                │  │
│  │  └─ clearAll()                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Persistence (localStorage)                          │  │
│  │  • garments (custom uploads)                         │  │
│  │  • snapToShoulders preference                        │  │
│  │  • activeMode                                        │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Layer 5: UI Components

```
┌────────────────────────────────────────────────────────────┐
│                   ARStage (Main Container)                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Layout Structure                                     │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │  VideoPreview (background)                      │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │  PoseLandmarks (canvas overlay, z-20)          │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │  GarmentOverlay (react-rnd, z-10)              │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │  Floating Controls (top-right)                  │ │  │
│  │  │  • AutoAlignButton                              │ │  │
│  │  │  • Landmarks Toggle                             │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │  Status Displays (bottom-left)                  │ │  │
│  │  │  • Camera status                                │ │  │
│  │  │  • Garment info                                 │ │  │
│  │  │  • MediaPipe status/FPS                         │ │  │
│  │  │  • Confidence indicator                         │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Side Effects (no UI)                                │  │
│  │  • ContinuousTracker (if enabled)                    │  │
│  │    - Monitors landmarks                              │  │
│  │    - Throttles to 10 FPS                             │  │
│  │    - Updates transform automatically                 │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│              GarmentOverlay (react-rnd wrapper)             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  <Rnd> Component                                      │  │
│  │  • size: { width, height }                           │  │
│  │  • position: { x, y }                                │  │
│  │  • lockAspectRatio: boolean                          │  │
│  │  • bounds: "parent"                                  │  │
│  │  • enableResizing: { corners, edges }               │  │
│  │  • onDragStop: update store                         │  │
│  │  • onResizeStop: update store                       │  │
│  │                                                       │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │  <div> with transforms                         │ │  │
│  │  │  • opacity: transform.opacity / 100            │ │  │
│  │  │  • transform: rotate(${rotation}deg)           │ │  │
│  │  │  • transformOrigin: center                     │ │  │
│  │  │                                                 │ │  │
│  │  │  ┌──────────────────────────────────────────┐ │ │  │
│  │  │  │  <img> Garment Image                     │ │ │  │
│  │  │  │  • src: selectedGarment.src              │ │ │  │
│  │  │  │  • draggable: false                      │ │ │  │
│  │  │  │  • pointer-events: none                  │ │ │  │
│  │  │  └──────────────────────────────────────────┘ │ │  │
│  │  │                                                 │ │  │
│  │  │  ┌──────────────────────────────────────────┐ │ │  │
│  │  │  │  Visual Handles                          │ │ │  │
│  │  │  │  • Border overlay                        │ │ │  │
│  │  │  │  • 4 corner dots                         │ │ │  │
│  │  │  └──────────────────────────────────────────┘ │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Keyboard Shortcuts Handler                          │  │
│  │  • ArrowUp/Down/Left/Right: move (1px, 10px w/Shift)│  │
│  │  • +/=: scale up 5%                                  │  │
│  │  • -: scale down 5%                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│           AutoAlignButton (User Action Trigger)             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Button States                                        │  │
│  │  ├─ Idle: "Auto-Align" (secondary variant)          │  │
│  │  ├─ Aligning: "Aligning..." + spinner (300ms)       │  │
│  │  ├─ Success: "Aligned!" (primary variant, 2s)       │  │
│  │  └─ Disabled: when no confident pose or no garment  │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  onClick Handler                                      │  │
│  │  1. Check: isConfidentPose(landmarks)               │  │
│  │  2. Calculate: shoulderPos = calculateShoulderPos() │  │
│  │  3. Calculate: garmentPos = calculateGarmentPos()   │  │
│  │  4. Execute: autoAlignGarment(x, y, scale, rotation)│  │
│  │  5. Feedback: toast.success() + button state change │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│       ContinuousTracker (Automatic Following Component)     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Side Effect Only (no UI rendered)                   │  │
│  │                                                       │  │
│  │  useEffect(() => {                                   │  │
│  │    if (!continuousTracking) return;                  │  │
│  │    if (!landmarks) return;                           │  │
│  │    if (!selectedGarmentId) return;                   │  │
│  │                                                       │  │
│  │    // Throttle check                                 │  │
│  │    const now = Date.now();                           │  │
│  │    if (now - lastUpdate < 100) return; // 10 FPS    │  │
│  │                                                       │  │
│  │    // Confidence check                               │  │
│  │    if (!isConfidentPose(landmarks)) return;          │  │
│  │                                                       │  │
│  │    // Calculate and update                           │  │
│  │    const shoulderPos = calculateShoulderPosition();  │  │
│  │    if (!shoulderPos) return;                         │  │
│  │                                                       │  │
│  │    const garmentPos = calculateGarmentPosition();    │  │
│  │    autoAlignGarment(x, y, scale, rotation);          │  │
│  │                                                       │  │
│  │    lastUpdate = now;                                 │  │
│  │  }, [landmarks, continuousTracking, ...]);           │  │
│  │                                                       │  │
│  │  return null; // Side effect only                    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│          PoseLandmarks (Debug Visualization Canvas)         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  <canvas> Element                                     │  │
│  │  • width: containerWidth                             │  │
│  │  • height: containerHeight                           │  │
│  │  • position: absolute, inset-0                       │  │
│  │  • z-index: 20 (above garment)                       │  │
│  │  • mixBlendMode: screen (blend with video)          │  │
│  │  • pointer-events: none (click-through)             │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Drawing Logic (2D Context)                          │  │
│  │  1. Clear canvas                                     │  │
│  │  2. Draw connections (skeleton lines)               │  │
│  │     • Cyan color (rgba(0, 255, 255, 0.6))           │  │
│  │     • 2px width                                      │  │
│  │     • Only if both endpoints visible                │  │
│  │  3. Draw landmarks (joint dots)                     │  │
│  │     • Color by body part:                           │  │
│  │       - Face: Magenta                               │  │
│  │       - Shoulders: Green (8px, larger)              │  │
│  │       - Arms: Yellow                                │  │
│  │       - Torso: Cyan                                 │  │
│  │       - Legs: Orange                                │  │
│  │     • 4px radius (8px for shoulders)                │  │
│  │     • Black outline                                 │  │
│  │  4. Draw landmark numbers (shoulders only)          │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Diagrams

### Auto-Align Flow

```
User Click "Auto-Align"
         │
         ▼
    ┌─────────┐
    │ Button  │ isConfidentPose(landmarks)?
    │ Handler │────No───▶ Toast Error: "No confident pose"
    └────┬────┘
         │ Yes
         ▼
calculateShoulderPosition(landmarks, width, height)
         │
         ├────No shoulders───▶ Toast Error: "Could not detect shoulders"
         │
         ▼ Success
    ┌──────────────────┐
    │ ShoulderPosition │
    │ { center, width, │
    │   angle }        │
    └────┬─────────────┘
         │
         ▼
calculateGarmentPosition(shoulderPos, baseWidth=200)
         │
         ▼
    ┌──────────────────┐
    │ GarmentSuggestion│
    │ { x, y, scale,   │
    │   rotation }     │
    └────┬─────────────┘
         │
         ▼
autoAlignGarment(x, y, scale, rotation)
         │
         ▼
    ┌─────────────┐
    │ Store Update│
    │ transform   │
    └────┬────────┘
         │
         ▼
    ┌─────────────┐
    │ Re-render   │
    │ Overlay     │
    └────┬────────┘
         │
         ▼
Toast Success: "Garment aligned to shoulders"
Button State: Green (2 seconds)
```

### Continuous Tracking Flow

```
Toggle "Continuous Tracking" ON
         │
         ▼
    ┌──────────────────────────┐
    │ ContinuousTracker Effect │
    └────┬─────────────────────┘
         │
         ▼
    Every frame (RAF from MediaPipe)
         │
         ▼
    ┌──────────────┐
    │ Throttle?    │ < 100ms since last update?
    │ Check        │────Yes───▶ Skip frame
    └────┬─────────┘
         │ No (≥100ms)
         ▼
    ┌──────────────┐
    │ Confident?   │ isConfidentPose(landmarks)?
    │ Check        │────No───▶ Skip update
    └────┬─────────┘
         │ Yes
         ▼
calculateShoulderPosition()
         │
         ├────No shoulders───▶ Skip update
         │
         ▼
calculateGarmentPosition()
         │
         ▼
autoAlignGarment()
         │
         ▼
Store Transform Updated
         │
         ▼
GarmentOverlay Re-renders with new position
         │
         ▼
    Loop continues (10 FPS)
```

### MediaPipe Detection Loop

```
Video Playing
      │
      ▼
requestAnimationFrame() callback
      │
      ▼
┌──────────────┐
│ Frame Change?│ video.currentTime != lastTime?
│ Check        │────No───▶ Skip (wait next frame)
└────┬─────────┘
     │ Yes
     ▼
poseLandmarker.detectForVideo(video, timestamp)
     │
     ▼
┌────────────────────┐
│ Result Object      │
│ • landmarks[0]     │ (first person, 33 points)
│ • worldLandmarks   │
└────┬───────────────┘
     │
     ▼
Mirror X Coordinates (for selfie view)
     │
     ▼
┌────────────────────┐
│ Mirrored Landmarks │
│ x' = 1 - x         │
│ y' = y             │
└────┬───────────────┘
     │
     ▼
Calculate Confidence (visible landmarks / total)
     │
     ▼
Update FPS Counter (frames/second)
     │
     ▼
setLastResult({ landmarks, confidence })
     │
     ▼
┌─────────────────────────────────────┐
│ Consumers react to state change:    │
│ • PoseLandmarks (draw skeleton)     │
│ • ContinuousTracker (update pos)    │
│ • ConfidenceIndicator (show status) │
│ • FPS Display (show performance)    │
└─────────────────────────────────────┘
     │
     ▼
requestAnimationFrame() next frame
     │
     └──────▶ Loop continues...
```

## 🎨 Visual Element Stacking (Z-Index)

```
Top (z-30+)
    ├─ Modals
    │
    ├─ (z-20) PoseLandmarks Canvas
    │         └─ 33 colored dots + skeleton lines
    │
    ├─ (z-10) GarmentOverlay (react-rnd)
    │         ├─ Garment image
    │         ├─ Border overlay
    │         └─ Resize handles
    │
    ├─ (z-5)  Floating Controls (top-right)
    │         ├─ Auto-Align button
    │         └─ Landmarks toggle
    │
    ├─ (z-5)  Status Displays (bottom-left)
    │         ├─ Camera status
    │         ├─ Garment info
    │         ├─ FPS counter
    │         └─ Confidence badge
    │
    └─ (z-0)  VideoPreview
              └─ <video> element (mirrored)
Bottom
```

## 📊 State Flow Diagram

```
┌────────────────────────────────────────────────────────────┐
│                    Zustand Store (Central)                  │
└────────────────┬───────────────────────────────────────────┘
                 │
         ┌───────┴────────┐
         │                │
         ▼                ▼
   ┌─────────┐      ┌──────────┐
   │ Getters │      │ Setters  │
   └────┬────┘      └────┬─────┘
        │                │
        │                │
   ┌────┴────────────────┴────┐
   │                           │
   ▼                           ▼
Components Read              Components Write
   │                           │
   ├─ ARStage                  ├─ User Actions
   ├─ GarmentOverlay          ├─ MediaPipe Detection
   ├─ AutoAlignButton         ├─ Auto-Align Logic
   ├─ ContinuousTracker       ├─ Continuous Tracking
   ├─ PoseLandmarks           └─ Manual Adjustments
   ├─ ARPanel
   └─ StatusFooter
```

## 🚦 Interaction Flow

### User Journey: First-Time Use

```
1. User opens /try-on page
         │
         ▼
2. Sees "Allow Camera" button
         │
         ▼
3. Clicks → Browser permission prompt
         │
         ├─ Denied → Error message + recovery guide
         │
         └─ Allowed → Video stream starts
                      │
                      ▼
4. Sees mirrored video feed of self
         │
         ▼
5. Garment selection panel visible on right
         │
         ▼
6. Clicks a garment thumbnail
         │
         ▼
7. Garment appears centered on screen
         │
         ▼
8. User can:
   ├─ Drag to reposition
   ├─ Resize with handles
   ├─ Use keyboard shortcuts
   │
   └─ OR enable MediaPipe for auto-align
      │
      ▼
9. Toggle "MediaPipe" ON
         │
         ▼
10. Model loads (2-4 seconds)
         │
         ▼
11. Landmarks appear (if facing camera)
         │
         ▼
12. Clicks "Auto-Align" button
         │
         ▼
13. Garment snaps to shoulders
         │
         ▼
14. User adjusts manually if needed
         │
         ▼
15. Toggle "Continuous Tracking" for hands-free
         │
         ▼
16. Garment follows movement (10 FPS)
         │
         ▼
17. User takes screenshot or exits
```

## 🧠 Decision Tree: Auto-Align Logic

```
                    User clicks "Auto-Align"
                              │
                    ┌─────────┴─────────┐
                    │                   │
              MediaPipe          MediaPipe
              Enabled?            Disabled?
                Yes │                No │
                    │                   │
                    ▼                   ▼
            Garment selected?    Toast: "Enable MediaPipe"
                Yes │  No │            STOP
                    │    └──▶ Toast: "Select a garment"
                    │              STOP
                    ▼
            Landmarks available?
                Yes │  No │
                    │    └──▶ Toast: "No pose detected"
                    │              STOP
                    ▼
            isConfidentPose()?
            (≥3 critical visible)
                Yes │  No │
                    │    └──▶ Toast: "Face camera with shoulders visible"
                    │              STOP
                    ▼
        calculateShoulderPosition()
                    │
        ┌───────────┴───────────┐
        │                       │
    Shoulders              No shoulders
    visible?                detected?
        Yes │                  No │
            │                     └──▶ Toast: "Adjust your position"
            │                               STOP
            ▼
    calculateGarmentPosition()
            │
            ▼
    autoAlignGarment(x, y, scale, rotation)
            │
            ▼
    Store Updated → Re-render
            │
            ▼
    Button: Green for 2s
    Toast: "Garment aligned to shoulders"
            │
            ▼
         SUCCESS
```

---

## 📱 Mobile Considerations

```
Desktop (>= 1024px)          Mobile (< 1024px)
─────────────────────        ─────────────────
┌─────────┬──────────┐       ┌───────────────┐
│  Video  │  Panel   │       │  Video + UI   │
│  (AR)   │ (Ctrl)   │       │  (Stacked)    │
│         │          │       │               │
│  Camera │ Garments │       │  Full Width   │
│  Feed   │ Controls │       │               │
│  640x   │ Sidebar  │       │  Touch        │
│  480    │          │       │  Gestures     │
└─────────┴──────────┘       └───────────────┘

• Mouse drag               • Touch drag
• Keyboard shortcuts       • Pinch to scale
• Hover states            • Two-finger rotate
• Higher resolution       • Lower resolution
• GPU acceleration        • Battery concerns
```

---

**Last Updated:** 2025-01-14
**Version:** 1.0
**Status:** ✅ Production Ready
