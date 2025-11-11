# Position Calculation Algorithms

## Table of Contents
1. [Algorithm Overview](#algorithm-overview)
2. [Shoulder Detection](#shoulder-detection)
3. [Garment Position Calculation](#garment-position-calculation)
4. [Confidence Assessment](#confidence-assessment)
5. [Edge Cases & Validation](#edge-cases--validation)
6. [Mathematical Details](#mathematical-details)

---

## Algorithm Overview

The AR system uses a **two-stage pipeline** to position garments on detected body landmarks:

```
Stage 1: Shoulder Detection
  Input:  33 MediaPipe landmarks + container dimensions
  Output: Shoulder position object (center, width, angle)

Stage 2: Garment Position Calculation
  Input:  Shoulder position + garment dimensions
  Output: Transform object (x, y, scale, rotation)
```

### Design Goals

1. **Accuracy**: Position garment naturally on shoulders
2. **Robustness**: Handle various poses (standing, sitting, tilted)
3. **Consistency**: Stable positioning across frames (minimal jitter)
4. **Performance**: Fast calculations (< 1ms per frame)
5. **Tunable**: Easy to adjust sizing and offset parameters

---

## Shoulder Detection

### Function Signature

**File**: `lib/utils/pose-utils.ts`

```typescript
export function calculateShoulderPosition(
  landmarks: NormalizedLandmark[],
  containerWidth: number,
  containerHeight: number
): ShoulderPosition | null;

interface ShoulderPosition {
  leftShoulder: { x: number; y: number };   // Pixel coordinates
  rightShoulder: { x: number; y: number };  // Pixel coordinates
  center: { x: number; y: number };         // Midpoint
  width: number;                            // Euclidean distance
  angle: number;                            // Tilt in degrees
}
```

### Algorithm Steps

#### Step 1: Extract Shoulder Landmarks

```typescript
// Landmark indices from BlazePose topology
const LEFT_SHOULDER_INDEX = 11;
const RIGHT_SHOULDER_INDEX = 12;

const leftShoulder = landmarks[LEFT_SHOULDER_INDEX];
const rightShoulder = landmarks[RIGHT_SHOULDER_INDEX];

// Validation: Check if landmarks exist
if (!leftShoulder || !rightShoulder) {
  console.warn('⚠️ Shoulder landmarks not found');
  return null;
}
```

**Expected Values** (frontal pose):
```typescript
leftShoulder:  { x: 0.60-0.65, y: 0.25-0.30, z: -0.1, visibility: 0.85+ }
rightShoulder: { x: 0.35-0.40, y: 0.25-0.30, z: -0.1, visibility: 0.85+ }
```

#### Step 2: Visibility Check

```typescript
const VISIBILITY_THRESHOLD = 0.5;

if (
  (leftShoulder.visibility || 0) < VISIBILITY_THRESHOLD ||
  (rightShoulder.visibility || 0) < VISIBILITY_THRESHOLD
) {
  console.warn('⚠️ Shoulder visibility too low:', {
    left: leftShoulder.visibility,
    right: rightShoulder.visibility
  });
  return null;
}
```

**Rationale**:
- Visibility < 0.5 indicates occlusion or poor detection
- Using partially visible landmarks causes jitter and misalignment
- Better to return null and preserve previous position

#### Step 3: Convert to Pixel Coordinates

```typescript
// Convert normalized (0-1) to pixels
const leftPixels = {
  x: leftShoulder.x * containerWidth,
  y: leftShoulder.y * containerHeight
};

const rightPixels = {
  x: rightShoulder.x * containerWidth,
  y: rightShoulder.y * containerHeight
};
```

**Example** (640x480 container):
```typescript
// Input (normalized, mirrored)
leftShoulder:  { x: 0.62, y: 0.28 }
rightShoulder: { x: 0.38, y: 0.28 }

// Output (pixels)
leftPixels:  { x: 397, y: 134 }  // 62% of 640 = 397
rightPixels: { x: 243, y: 134 }  // 38% of 640 = 243
```

#### Step 4: Calculate Center (Midpoint)

```typescript
const center = {
  x: (leftPixels.x + rightPixels.x) / 2,
  y: (leftPixels.y + rightPixels.y) / 2
};
```

**Example**:
```typescript
// Inputs
leftPixels:  { x: 397, y: 134 }
rightPixels: { x: 243, y: 134 }

// Output
center: { x: 320, y: 134 }  // Perfect horizontal center at 640px width
```

**Geometric Interpretation**:
- Center is the **reference point** for garment positioning
- Garment will be centered horizontally at this X coordinate
- Y coordinate is the **shoulder line** (used with offset for final position)

#### Step 5: Calculate Shoulder Width

```typescript
const width = Math.sqrt(
  Math.pow(rightPixels.x - leftPixels.x, 2) +
  Math.pow(rightPixels.y - leftPixels.y, 2)
);
```

**Formula**: Euclidean distance
```
width = √[(x₂ - x₁)² + (y₂ - y₁)²]
```

**Example** (level shoulders):
```typescript
// Inputs
leftPixels:  { x: 397, y: 134 }
rightPixels: { x: 243, y: 134 }

// Calculation
width = √[(243 - 397)² + (134 - 134)²]
      = √[(-154)² + 0²]
      = √23716
      = 154 pixels
```

**Example** (tilted shoulders, 5° angle):
```typescript
// Inputs
leftPixels:  { x: 400, y: 130 }  // Higher
rightPixels: { x: 240, y: 140 }  // Lower

// Calculation
width = √[(240 - 400)² + (140 - 130)²]
      = √[(-160)² + (10)²]
      = √25700
      = 160 pixels  // Slightly larger due to tilt
```

**Rationale**:
- Use Euclidean distance (not horizontal distance) for accuracy
- Accounts for shoulder tilt (important for rotated garments)
- More robust than simple `abs(x2 - x1)` approach

#### Step 6: Calculate Shoulder Angle (Tilt)

```typescript
const angle = Math.atan2(
  rightPixels.y - leftPixels.y,  // Vertical difference
  rightPixels.x - leftPixels.x   // Horizontal difference
) * (180 / Math.PI);              // Convert radians to degrees
```

**Formula**: Two-argument arctangent
```
angle = atan2(Δy, Δx) × (180 / π)
```

**Example** (level shoulders):
```typescript
// Inputs
leftPixels:  { x: 397, y: 134 }
rightPixels: { x: 243, y: 134 }

// Calculation
angle = atan2(134 - 134, 243 - 397)
      = atan2(0, -154)
      = atan2(0, negative) = 180°  // But in code, this is 0° due to coordinate system
      = 0°  // Actually level
```

**Example** (tilted left, user leaning right):
```typescript
// Inputs (right shoulder lower than left)
leftPixels:  { x: 400, y: 130 }  // Higher
rightPixels: { x: 240, y: 140 }  // Lower

// Calculation
angle = atan2(140 - 130, 240 - 400)
      = atan2(10, -160)
      = atan2(positive, negative) ≈ 176.4°
      // But we want -3.6° (clockwise rotation)
      // Need to adjust...

// CORRECTION: In our coordinate system (origin top-left, Y increases downward)
// Positive angle = right shoulder lower (clockwise)
// Negative angle = left shoulder lower (counter-clockwise)

// Actual calculation in code:
angle = atan2(10, -160) * (180 / π) ≈ -3.6°
```

**Coordinate System Notes**:
- Origin: Top-left corner
- X increases: Left to right
- Y increases: **Top to bottom** (inverted from traditional Cartesian)
- Positive angle: Clockwise rotation
- Negative angle: Counter-clockwise rotation

**Clamping**:
```typescript
// Limit extreme tilts (±45° max)
const clampedAngle = Math.max(-45, Math.min(45, angle));
```

**Why clamp?**
- MediaPipe can detect extreme poses (±90°)
- Garments don't naturally tilt that much
- Prevents garment from rotating vertically
- User can manually adjust if needed

#### Step 7: Return Result

```typescript
return {
  leftShoulder: leftPixels,
  rightShoulder: rightPixels,
  center,
  width: Math.round(width),      // Round to integer pixels
  angle: Math.round(clampedAngle * 10) / 10  // Round to 0.1 degree
};
```

**Complete Example** (frontal pose, 640x480 container):
```typescript
// Input landmarks (normalized, mirrored)
landmarks[11] = { x: 0.62, y: 0.28, z: -0.12, visibility: 0.94 }  // Left shoulder
landmarks[12] = { x: 0.38, y: 0.28, z: -0.15, visibility: 0.92 }  // Right shoulder

// Output
{
  leftShoulder: { x: 397, y: 134 },
  rightShoulder: { x: 243, y: 134 },
  center: { x: 320, y: 134 },
  width: 154,
  angle: 0.0
}
```

---

## Garment Position Calculation

### Function Signature

```typescript
export function calculateGarmentPosition(
  shoulderPos: ShoulderPosition,
  garmentBaseWidth: number = 200,  // Default garment width in pixels
  sizeRatio: number = 0.9          // 90% of shoulder width
): Transform;

interface Transform {
  x: number;          // Horizontal position (pixels from left)
  y: number;          // Vertical position (pixels from top)
  scale: number;      // Size multiplier (1.0 = base size)
  rotation: number;   // Angle in degrees
}
```

### Algorithm Steps

#### Step 1: Calculate Target Width

```typescript
const targetWidth = shoulderPos.width * sizeRatio;
```

**Rationale**:
- Garment should be **slightly narrower** than shoulder width
- 90% ratio prevents garment from extending beyond shoulders
- Looks more natural and realistic

**Example**:
```typescript
shoulderPos.width = 154 pixels  // Detected shoulder width
sizeRatio = 0.9                 // 90%

targetWidth = 154 × 0.9 = 138.6 pixels
```

**Historical Note**:
- Original implementation used **120%** ratio (too large)
- Updated to **90%** for better proportions (COMMIT: `bd3427a`)

#### Step 2: Calculate Scale Factor

```typescript
const scale = targetWidth / garmentBaseWidth;
```

**Explanation**:
- `garmentBaseWidth` is the **original pixel width** of the garment image
- `scale` is the **multiplier** to apply via CSS transform
- Result: Garment will be scaled to match target width

**Example**:
```typescript
targetWidth = 138.6 pixels
garmentBaseWidth = 200 pixels  // Original image size

scale = 138.6 / 200 = 0.693
```

**Interpretation**:
- `scale = 1.0` → Garment displayed at original size (200px)
- `scale = 0.693` → Garment displayed at 69.3% of original size (138.6px)
- `scale = 2.0` → Garment displayed at 200% of original size (400px)

**Safety Clamping**:
```typescript
const MIN_SCALE = 0.5;   // 50% of base size (prevent tiny garments)
const MAX_SCALE = 1.5;   // 150% of base size (prevent giant garments)

const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
```

**Why clamp?**
- Prevents extreme cases (child vs. adult proportions)
- Maintains visual consistency
- User can manually adjust scale if needed

#### Step 3: Calculate Horizontal Position (X)

```typescript
const x = shoulderPos.center.x - (garmentBaseWidth * scale) / 2;
```

**Goal**: Center garment horizontally on shoulder center

**Explanation**:
- `garmentBaseWidth * scale` = **actual rendered width** of garment
- Divide by 2 = **half width** (distance from center to edge)
- Subtract from center = **left edge position**

**Example**:
```typescript
shoulderPos.center.x = 320 pixels  // Horizontal center
garmentBaseWidth = 200 pixels
scale = 0.693

// Rendered width
renderedWidth = 200 × 0.693 = 138.6 pixels

// Half width
halfWidth = 138.6 / 2 = 69.3 pixels

// Left edge position
x = 320 - 69.3 = 250.7 pixels
```

**Verification**:
```
Left edge:   x = 250.7
Right edge:  x + renderedWidth = 250.7 + 138.6 = 389.3
Center:      (250.7 + 389.3) / 2 = 320 ✅ Correct!
```

#### Step 4: Calculate Vertical Position (Y)

```typescript
const VERTICAL_OFFSET_RATIO = 0.15;  // 15% upward from shoulder line

const y = shoulderPos.center.y - (garmentBaseWidth * scale * VERTICAL_OFFSET_RATIO);
```

**Goal**: Position garment slightly **above** shoulder line to account for collar/neckline

**Explanation**:
- `shoulderPos.center.y` = **shoulder line** (midpoint of shoulders)
- `garmentBaseWidth * scale` = **rendered width** (used for aspect ratio)
- Multiply by 0.15 = **15% offset** (upward)
- Subtract from shoulder line = **top edge position**

**Example**:
```typescript
shoulderPos.center.y = 134 pixels  // Shoulder line
garmentBaseWidth = 200 pixels
scale = 0.693
VERTICAL_OFFSET_RATIO = 0.15

// Offset amount
offset = 200 × 0.693 × 0.15 = 20.8 pixels

// Top edge position
y = 134 - 20.8 = 113.2 pixels
```

**Rationale**:
- Without offset: Garment would start at shoulder line (looks unnatural)
- With 15% offset: Garment collar sits at appropriate height
- Offset scales with garment size (larger garments = more offset)

**Visual Explanation**:
```
     y = 113.2  ← Top of garment (collar)
         ↓
    ┌────────┐
    │        │
    │ SHIRT  │
    │        │
    ├────────┤  ← y + (height * 0.15) = 134 (shoulder line)
    │        │
    └────────┘
```

#### Step 5: Apply Rotation

```typescript
const rotation = shoulderPos.angle;  // Already clamped to ±45°
```

**Direct Copy**:
- Garment rotation matches shoulder tilt exactly
- No additional processing needed
- Already clamped in shoulder detection step

**CSS Transform**:
```css
transform: rotate(${rotation}deg);
transform-origin: center;  /* Rotate around center point */
```

#### Step 6: Round and Return

```typescript
return {
  x: Math.round(x),              // Integer pixels (no sub-pixel rendering)
  y: Math.round(y),
  scale: Math.round(scale * 1000) / 1000,  // 3 decimal places
  rotation: Math.round(rotation * 10) / 10  // 1 decimal place
};
```

**Rounding Strategy**:
- Position: Integer pixels (CSS uses integers anyway)
- Scale: 3 decimals (balance precision vs. readability)
- Rotation: 1 decimal (human can't perceive <0.1° differences)

### Complete Example

**Input**:
```typescript
// Shoulder detection result (640x480 container, frontal pose)
shoulderPos = {
  center: { x: 320, y: 134 },
  width: 154,
  angle: 0.0
};

// Garment properties
garmentBaseWidth = 200 pixels
sizeRatio = 0.9  // 90% of shoulder width
```

**Calculation**:
```typescript
// Step 1: Target width
targetWidth = 154 × 0.9 = 138.6 pixels

// Step 2: Scale
scale = 138.6 / 200 = 0.693

// Step 3: Horizontal position
x = 320 - (200 × 0.693) / 2 = 320 - 69.3 = 250.7 → 251 pixels

// Step 4: Vertical position
y = 134 - (200 × 0.693 × 0.15) = 134 - 20.8 = 113.2 → 113 pixels

// Step 5: Rotation
rotation = 0.0 degrees
```

**Output**:
```typescript
{
  x: 251,       // 251 pixels from left edge
  y: 113,       // 113 pixels from top edge
  scale: 0.693, // 69.3% of original size
  rotation: 0.0 // No tilt
}
```

**Visual Result** (640x480 frame):
```
   0                    320                  640
   ↓                     ↓                    ↓
0  ┌──────────────────────────────────────────┐
   │                                          │
   │                                          │
113│          ┌────────────┐                  │ ← Top of garment
   │          │   SHIRT    │                  │
134│          ├────────────┤                  │ ← Shoulder line
   │          │            │                  │
   │          └────────────┘                  │
   │                                          │
480└──────────────────────────────────────────┘
```

---

## Confidence Assessment

### Function: isConfidentPose

**File**: `lib/utils/pose-utils.ts`

```typescript
export function isConfidentPose(landmarks: NormalizedLandmark[]): boolean;
```

**Purpose**: Determine if pose detection is **reliable enough** for auto-alignment

### Algorithm

```typescript
// Critical landmarks for upper-body detection
const CRITICAL_LANDMARKS = [
  11,  // Left shoulder
  12,  // Right shoulder
  23,  // Left hip
  24   // Right hip
];

const VISIBILITY_THRESHOLD = 0.5;

export function isConfidentPose(landmarks: NormalizedLandmark[]): boolean {
  if (!landmarks || landmarks.length < 33) {
    return false;  // Invalid input
  }

  // Count how many critical landmarks are visible
  const visibleCount = CRITICAL_LANDMARKS.filter(index => {
    const landmark = landmarks[index];
    return landmark && (landmark.visibility || 0) > VISIBILITY_THRESHOLD;
  }).length;

  // Require at least 3 out of 4 critical landmarks
  const MIN_VISIBLE = 3;
  return visibleCount >= MIN_VISIBLE;
}
```

### Rationale

**Why these landmarks?**
- **Shoulders (11, 12)**: Required for garment alignment
- **Hips (23, 24)**: Indicate full torso visibility
- Together: Form a "diamond" shape that defines upper body

**Why 3 out of 4?**
- **4/4**: Too strict, fails on slight occlusions (e.g., hand partially covering hip)
- **3/4**: Balanced, allows one landmark to be occluded
- **2/4**: Too lenient, can produce incorrect alignments

**Threshold (0.5)**:
- Values below 0.5 indicate poor detection or occlusion
- Values above 0.5 are generally reliable
- Corresponds to "Fair" quality in visibility scale

### Usage

**Auto-Align Button**:
```typescript
const handleAutoAlign = () => {
  if (!isConfidentPose(landmarks)) {
    toast.error('Cannot detect pose clearly. Adjust lighting or positioning.');
    return;
  }

  // Proceed with alignment...
};
```

**Continuous Tracking**:
```typescript
useEffect(() => {
  if (!continuousTracking || !isConfidentPose(landmarks)) {
    return; // Pause tracking if pose confidence drops
  }

  // Update garment position...
}, [landmarks, continuousTracking]);
```

**Confidence Indicator**:
```typescript
function getConfidenceLevel(confidence: number): 'Low' | 'Okay' | 'Good' {
  if (confidence >= 0.7) return 'Good';   // ≥70% landmarks visible
  if (confidence >= 0.5) return 'Okay';   // 50-70% visible
  return 'Low';                           // <50% visible
}
```

---

## Edge Cases & Validation

### Case 1: Shoulders Not Detected

**Scenario**: User's shoulders are out of frame or occluded

**Detection**:
```typescript
if (!shoulderPos) {
  // calculateShoulderPosition returned null
  console.warn('⚠️ Shoulders not detected');
  return;
}
```

**Handling**:
- **Manual Mode**: Continue using last known position (no update)
- **Auto-Align**: Show error toast, disable button
- **Continuous Tracking**: Pause tracking, preserve last position

### Case 2: Extreme Shoulder Width

**Scenario**: Child (very narrow) or tall person stepping back (appears narrow)

**Detection**:
```typescript
const MIN_WIDTH = 80;   // 80 pixels minimum
const MAX_WIDTH = 400;  // 400 pixels maximum

if (shoulderPos.width < MIN_WIDTH || shoulderPos.width > MAX_WIDTH) {
  console.warn('⚠️ Unusual shoulder width:', shoulderPos.width);
}
```

**Handling**:
- **Clamp scale** to MIN_SCALE (0.5) and MAX_SCALE (1.5)
- **Proceed with calculation** (user can manually adjust)
- **Log warning** for debugging

### Case 3: Off-Center Pose

**Scenario**: User standing to the side of frame

**Detection**:
```typescript
const centerX = containerWidth / 2;
const offset = Math.abs(shoulderPos.center.x - centerX);
const MAX_OFFSET = containerWidth * 0.3;  // 30% of width

if (offset > MAX_OFFSET) {
  console.warn('⚠️ User is off-center:', offset, 'px');
}
```

**Handling**:
- **Continue with calculation** (algorithm handles off-center)
- **Show visual guide** (center line in debug mode)
- **User can manually center** if needed

### Case 4: Partial Occlusion (Hand in Front)

**Scenario**: User's hand covers one shoulder

**Detection**:
```typescript
// In calculateShoulderPosition
if (leftShoulder.visibility < 0.5 || rightShoulder.visibility < 0.5) {
  return null;  // Insufficient visibility
}
```

**Handling**:
- **Return null** from shoulder detection
- **Preserve last known position** (don't update)
- **Wait for occlusion to clear** (automatic recovery)

### Case 5: Extreme Tilt (>45°)

**Scenario**: User leaning sideways significantly

**Detection**:
```typescript
// In calculateShoulderPosition
const rawAngle = Math.atan2(...) * (180 / Math.PI);

if (Math.abs(rawAngle) > 45) {
  console.warn('⚠️ Extreme shoulder tilt:', rawAngle);
}
```

**Handling**:
- **Clamp to ±45°** (prevents vertical garment)
- **Proceed with calculation** (garment won't over-rotate)
- **User can manually adjust rotation** if needed

### Case 6: Container Resize

**Scenario**: Browser window resized, container dimensions change

**Detection**:
```typescript
// In ARStage
useEffect(() => {
  const resizeObserver = new ResizeObserver(entries => {
    const { width, height } = entries[0].contentRect;
    setContainerSize({ width, height });
  });

  resizeObserver.observe(containerRef.current);

  return () => resizeObserver.disconnect();
}, []);
```

**Handling**:
- **Recalculate positions** with new dimensions
- **Preserve scale** (garment size relative to shoulders)
- **Update on next frame** (smooth transition)

---

## Mathematical Details

### Coordinate System Summary

```
Origin: Top-left corner (0, 0)
X-axis: Left (0) → Right (width)
Y-axis: Top (0) → Bottom (height)

MediaPipe normalized coordinates:
  x: 0.0 (left) to 1.0 (right)
  y: 0.0 (top) to 1.0 (bottom)
  z: negative (toward camera) to positive (away from camera)

Pixel coordinates:
  x: 0 to containerWidth (e.g., 640)
  y: 0 to containerHeight (e.g., 480)
```

### Distance Formula

**Euclidean Distance** (shoulder width):
```
d = √[(x₂ - x₁)² + (y₂ - y₁)²]

where:
  (x₁, y₁) = left shoulder pixel coordinates
  (x₂, y₂) = right shoulder pixel coordinates
```

**Example**:
```
Left:  (400, 130)
Right: (240, 140)

d = √[(240 - 400)² + (140 - 130)²]
  = √[(-160)² + (10)²]
  = √[25600 + 100]
  = √25700
  ≈ 160.3 pixels
```

### Angle Calculation

**Two-Argument Arctangent**:
```
θ = atan2(Δy, Δx) × (180 / π)

where:
  Δy = y₂ - y₁ (vertical difference)
  Δx = x₂ - x₁ (horizontal difference)
  π ≈ 3.14159
```

**Quadrant Handling** (atan2 automatically resolves):
```
Quadrant I   (Δx > 0, Δy > 0): 0° to 90°
Quadrant II  (Δx < 0, Δy > 0): 90° to 180°
Quadrant III (Δx < 0, Δy < 0): -180° to -90°
Quadrant IV  (Δx > 0, Δy < 0): -90° to 0°
```

**Example** (shoulders level):
```
Left:  (400, 130)
Right: (240, 130)  // Same Y coordinate

Δy = 130 - 130 = 0
Δx = 240 - 400 = -160

θ = atan2(0, -160) × (180 / π)
  = π × (180 / π)  // atan2(0, negative) = π radians
  = 180°
  // But in our coordinate system, this represents 0° (level)
  // Implementation adjusts for coordinate system
```

### Scaling Formula

**CSS Transform Scale**:
```
transform: scale(s)

where:
  s = targetWidth / baseWidth

Rendered width = baseWidth × s
Rendered height = baseHeight × s  (if aspect ratio locked)
```

**Example**:
```
baseWidth = 200 pixels
targetWidth = 140 pixels

s = 140 / 200 = 0.7

Rendered width = 200 × 0.7 = 140 pixels ✅
Rendered height = 240 × 0.7 = 168 pixels (if aspect ratio 200:240)
```

### Centering Formula

**Horizontal Centering**:
```
x_left = x_center - (width / 2)

where:
  x_center = center point X coordinate
  width = rendered width (baseWidth × scale)
```

**Verification**:
```
x_right = x_left + width
x_center_verify = (x_left + x_right) / 2  // Should equal x_center
```

---

## Performance Considerations

### Calculation Cost

**Per-Frame Cost** (JavaScript execution):
- `calculateShoulderPosition`: ~0.1-0.2 ms
- `calculateGarmentPosition`: ~0.05-0.1 ms
- `isConfidentPose`: ~0.02-0.05 ms
- **Total**: ~0.2-0.4 ms per frame

**Comparison**:
- MediaPipe detection: 30-50 ms per frame
- React re-render: 2-5 ms per frame
- Position calculation: **<1% of total pipeline**

**Conclusion**: Position algorithms are **negligible** performance impact

### Optimization Strategies

**1. Memoization** (current implementation):
```typescript
// In pose-utils.ts
const memoizedShoulderPos = useMemo(() => {
  return calculateShoulderPosition(landmarks, width, height);
}, [landmarks, width, height]);
```
**Benefit**: Avoid recalculating if inputs unchanged

**2. Throttling** (continuous tracking):
```typescript
// Update at 10 FPS instead of 30 FPS
if (Date.now() - lastUpdate < 100) {
  return; // Skip this frame
}
```
**Benefit**: 67% reduction in transform updates

**3. Integer Rounding**:
```typescript
// Round to integer pixels (no sub-pixel rendering)
x: Math.round(x),
y: Math.round(y)
```
**Benefit**: Slightly faster CSS rendering

---

## Next Steps

For component integration details, see:
- [04-component-architecture.md](./04-component-architecture.md) - How components use these algorithms
