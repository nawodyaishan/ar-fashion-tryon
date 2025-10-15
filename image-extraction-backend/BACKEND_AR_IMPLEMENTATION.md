# Backend Implementation: Automatic AR Try-On System

## Overview

This backend implementation provides a complete server-driven automatic AR try-on system. The backend handles all fitting calculations, eliminating the need for manual gesture controls on the frontend.

## Architecture

```
Frontend (React)                    Backend (FastAPI)
─────────────────                   ─────────────────

1. Upload Garment ──────────────▶ POST /process/garment/top
                                   ├─ Remove background (rembg)
                                   ├─ Detect anchors (contour analysis)
                                   ├─ Extract keypoints (armpit, hem, etc.)
                                   ├─ Generate mesh (Delaunay triangulation)
                                   └─ Return GSM + cache

2. Stream Pose      ──────────────▶ POST /fit/garment/top (10-15 Hz)
   (MediaPipe)                     ├─ Fetch GSM from cache
                                   ├─ Calculate similarity transform
                                   ├─ Calculate TPS warp
                                   ├─ Apply EMA smoothing
                                   └─ Return transform + warp

3. Render Result
   (Three.js/Canvas)
```

## Key Components

### 1. Garment Shape Model (GSM)

The GSM is the core data structure that describes a garment for AR rendering:

```python
{
  "gsm_id": "gsm_abc123",           # Unique identifier
  "image": {
    "w": 748,                        # Width in pixels
    "h": 1010,                       # Height in pixels
    "url": "https://..."             # Cloudinary URL or base64
  },
  "anchors": {                       # Primary alignment points
    "collar_left": [0.312, 0.128],   # Normalized (0-1)
    "neck_apex": [0.500, 0.184],
    "collar_right": [0.688, 0.128]
  },
  "anchor_confidence": 0.85,         # Auto-detection confidence
  "anchor_source": "auto",           # "auto", "custom", or "default"
  "keypoints": {                     # Secondary control points
    "armpit_left": [0.25, 0.28],
    "armpit_right": [0.75, 0.28],
    "side_left": [0.28, 0.58],
    "side_right": [0.72, 0.58],
    "hem_center": [0.50, 0.92]
  },
  "mesh": {                          # Triangulated mesh for warping
    "verts": [[x, y], ...],          # 50-100 vertices (normalized)
    "tris": [[i, j, k], ...]         # Triangle indices
  },
  "body_offsets": {                  # Fit heuristics
    "neck_drop_ratio": 0.06,         # How far below shoulders
    "torso_length_ratio": 1.05       # Hem position multiplier
  }
}
```

### 2. Fit Solver

The fit solver calculates how to position and warp the garment based on pose landmarks:

**Input:**
- GSM (from cache)
- Pose landmarks (from MediaPipe)
- Previous state (for smoothing)
- Session ID (for tracking)

**Output:**
```python
{
  "mode": "tracking",                # or "paused"
  "confidence": 0.95,                # Shoulder visibility
  "similarity": {                    # Rigid transform
    "tx": 220.5,                     # Translate X (pixels)
    "ty": 165.3,                     # Translate Y (pixels)
    "scale": 1.12,                   # Uniform scale
    "rot": 0.02                      # Rotation (radians)
  },
  "warp": {                          # Non-rigid deformation
    "type": "tps",                   # Thin-plate spline
    "src_ctrl": [[...], ...],        # Source control points
    "dst_ctrl": [[...], ...]         # Target control points
  },
  "occlusion": {                     # Rendering hints
    "neck_clip": {
      "center": [320, 200],
      "rx": 28,                      # Ellipse radius X
      "ry": 21                       # Ellipse radius Y
    }
  }
}
```

## API Endpoints

### POST /process/garment/top

Generate a Garment Shape Model (GSM) from an uploaded garment image.

**Request (Form-Data):**
```bash
curl -X POST "http://localhost:5000/process/garment/top" \
  -F "file=@shirt.png" \
  -F "category=shirt" \
  -F "auto_anchor=true" \
  -F "upload=true"
```

**Parameters:**
- `file` (file, optional): Image file (mutually exclusive with image_url)
- `image_url` (string, optional): Image URL to download
- `category` (string, default="shirt"): "shirt" or "tshirt"
- `auto_anchor` (boolean, default=true): Auto-detect collar anchors
- `custom_anchors_json` (string, optional): Override anchors `{"collar_left":[x,y],...}`
- `upload` (boolean, default=true): Upload to Cloudinary
- `cloud_folder` (string, default="garments/processed"): Cloudinary folder
- `public_id` (string, optional): Custom Cloudinary public ID

**Response (200 OK):**
```json
{
  "gsm_id": "gsm_abc123",
  "image": {
    "w": 748,
    "h": 1010,
    "url": "https://res.cloudinary.com/.../gsm_abc123.png"
  },
  "anchors": {
    "collar_left": [0.312, 0.128],
    "neck_apex": [0.500, 0.184],
    "collar_right": [0.688, 0.128]
  },
  "anchor_confidence": 0.85,
  "anchor_source": "auto",
  "keypoints": {
    "armpit_left": [0.25, 0.28],
    "armpit_right": [0.75, 0.28],
    "side_left": [0.28, 0.58],
    "side_right": [0.72, 0.58],
    "hem_center": [0.50, 0.92]
  },
  "mesh": {
    "verts": [[0.31, 0.13], [0.69, 0.13], ...],
    "tris": [[0, 1, 2], [1, 3, 2], ...]
  },
  "body_offsets": {
    "neck_drop_ratio": 0.06,
    "torso_length_ratio": 1.05
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input (no file/URL, invalid image, etc.)
- `413 Payload Too Large`: File exceeds MAX_CONTENT_MB
- `500 Internal Server Error`: Processing failed

---

### POST /fit/garment/top

Calculate garment fit from pose landmarks (real-time, 10-15 Hz).

**Request (JSON):**
```bash
curl -X POST "http://localhost:5000/fit/garment/top" \
  -H "Content-Type: application/json" \
  -d '{
    "gsm_id": "gsm_abc123",
    "pose": {
      "L_shoulder": [250, 200, 0.95],
      "R_shoulder": [390, 200, 0.95],
      "L_hip": [280, 450, 0.85],
      "R_hip": [360, 450, 0.85]
    },
    "prev_state": null,
    "session_id": "user123"
  }'
```

**Parameters:**
- `gsm_id` (string, required): GSM identifier from /process/garment/top
- `pose` (object, required): Pose landmarks with visibility
  - `L_shoulder`: [x, y, visibility] in pixels
  - `R_shoulder`: [x, y, visibility] in pixels
  - `L_hip`: [x, y, visibility] in pixels (optional, improves fit)
  - `R_hip`: [x, y, visibility] in pixels (optional, improves fit)
- `prev_state` (object, optional): Previous result for EMA smoothing
- `session_id` (string, optional): Session identifier for tracking

**Response (200 OK - Tracking):**
```json
{
  "mode": "tracking",
  "confidence": 0.95,
  "similarity": {
    "tx": 220.5,
    "ty": 165.3,
    "scale": 1.12,
    "rot": 0.02
  },
  "warp": {
    "type": "tps",
    "src_ctrl": [
      [0.30, 0.12],
      [0.70, 0.12],
      [0.25, 0.28],
      [0.75, 0.28],
      [0.28, 0.58],
      [0.72, 0.58],
      [0.50, 0.92]
    ],
    "dst_ctrl": [
      [0.28, 0.11],
      [0.72, 0.11],
      [0.26, 0.27],
      [0.74, 0.27],
      [0.29, 0.59],
      [0.71, 0.59],
      [0.50, 0.93]
    ]
  },
  "occlusion": {
    "neck_clip": {
      "center": [320, 200],
      "rx": 28,
      "ry": 21
    },
    "arm_over_shirt": {
      "left": false,
      "right": false
    }
  }
}
```

**Response (200 OK - Paused):**
```json
{
  "mode": "paused",
  "confidence": 0.42,
  "similarity": null,
  "warp": null,
  "occlusion": null
}
```

**Error Responses:**
- `404 Not Found`: GSM not found in cache
- `500 Internal Server Error`: Fit solver failed

---

## Implementation Details

### 1. Anchor Detection Algorithm

**Contour-Based Detection:**
1. Focus on top 35% of garment for collar region
2. Find largest contour (outer garment edge)
3. Smooth contour with Savitzky-Golay filter (window=5)
4. Detect neck apex: topmost point near horizontal center
5. Find collar left/right: ±15% from center, within top 25%

**Confidence Scoring:**
- Width score: How close collar width is to 40% of garment width
- Center score: How well neck apex is horizontally centered
- Final confidence: Average of width + center scores

### 2. Keypoint Extraction

**Armpit Points:**
- Search upper 50% of garment
- Left: rightmost point on left side (<40% width)
- Right: leftmost point on right side (>60% width)

**Side Seams:**
- Search waist region (40-70% height)
- Left: rightmost point on left side (<50% width)
- Right: leftmost point on right side (>50% width)

**Hem Center:**
- Search bottom 15% of garment (>85% height)
- Find point closest to horizontal center

### 3. Mesh Generation

**Delaunay Triangulation:**
1. Collect control points: anchors + keypoints
2. Sample contour (simplify to ~50 points)
3. Remove duplicate vertices
4. Triangulate using Scipy's Delaunay
5. Normalize all vertices to [0, 1] range

### 4. Fit Solver Algorithm

**Similarity Transform:**
```python
# 1. Calculate shoulder center and width
shoulder_center = (L_shoulder + R_shoulder) / 2
shoulder_width = ||R_shoulder - L_shoulder||
shoulder_angle = atan2(R_shoulder.y - L_shoulder.y, R_shoulder.x - L_shoulder.x)

# 2. Calculate scale (map collar to shoulder with 110% ease)
collar_width_px = collar_width_norm * garment_w
target_collar_width = shoulder_width * 1.10
scale = target_collar_width / collar_width_px
scale = clamp(scale, 0.35, 2.8)

# 3. Calculate neck drop (6% of shoulder width)
neck_drop = 0.06 * shoulder_width
target_collar_y = shoulder_center.y + neck_drop

# 4. Calculate translation
collar_center_px = collar_center_norm * [garment_w, garment_h]
scaled_collar_center = collar_center_px * scale
tx = shoulder_center.x - scaled_collar_center.x
ty = target_collar_y - scaled_collar_center.y
```

**TPS Warping:**
1. Map garment anchors/keypoints to body landmarks
2. Transform destination points to garment-normalized space
3. Clamp warp magnitude to 8% max distortion
4. Return source and destination control points

**EMA Smoothing:**
```python
# Similarity transform: α = 0.15
smoothed = 0.15 * current + 0.85 * previous

# Warp control points: α = 0.10
smoothed = 0.10 * current + 0.90 * previous
```

**Hysteresis Tracking:**
- Enter tracking: confidence ≥ 0.70
- Exit tracking: confidence < 0.55
- Prevents flickering on/off at threshold

### 5. GSM Caching

**In-Memory Cache:**
- Simple dict: `_gsm_cache[gsm_id] = gsm`
- No expiration (for prototyping)
- Production: Use Redis with TTL

**Cache Key:**
- Format: `gsm_{random_hex_8}`
- Example: `gsm_a1b2c3d4e5f6g7h8`

---

## Testing

### Test 1: GSM Generation

```bash
# Test with local file
curl -X POST "http://localhost:5000/process/garment/top" \
  -F "file=@test_shirt.png" \
  -F "category=shirt" \
  -F "auto_anchor=true" \
  -F "upload=false"

# Expected: GSM with auto-detected anchors + base64 image
```

### Test 2: Fit Solver

```bash
# Step 1: Generate GSM (save gsm_id from response)
GSM_ID="gsm_abc123"

# Step 2: Call fit solver
curl -X POST "http://localhost:5000/fit/garment/top" \
  -H "Content-Type: application/json" \
  -d '{
    "gsm_id": "'$GSM_ID'",
    "pose": {
      "L_shoulder": [250, 200, 0.95],
      "R_shoulder": [390, 200, 0.95],
      "L_hip": [280, 450, 0.85],
      "R_hip": [360, 450, 0.85]
    },
    "session_id": "test_session"
  }'

# Expected: Tracking mode with similarity transform + warp
```

### Test 3: Custom Anchors

```bash
curl -X POST "http://localhost:5000/process/garment/top" \
  -F "file=@shirt.png" \
  -F "category=shirt" \
  -F "auto_anchor=false" \
  -F 'custom_anchors_json={"collar_left":[0.30,0.12],"neck_apex":[0.50,0.18],"collar_right":[0.70,0.12]}'

# Expected: GSM with custom anchors (anchor_source="custom")
```

---

## Integration with Frontend

### Frontend Workflow

```javascript
// 1. Upload garment and get GSM
const formData = new FormData();
formData.append('file', garmentFile);
formData.append('category', 'shirt');
formData.append('auto_anchor', 'true');

const gsmResponse = await fetch('http://localhost:5000/process/garment/top', {
  method: 'POST',
  body: formData
});

const gsm = await gsmResponse.json();
const gsmId = gsm.gsm_id;

// 2. Start pose detection (MediaPipe)
const pose = await poseDetector.estimatePoses(videoFrame);

// 3. Call fit solver (10-15 Hz)
const fitResponse = await fetch('http://localhost:5000/fit/garment/top', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    gsm_id: gsmId,
    pose: {
      L_shoulder: [pose.keypoints[11].x, pose.keypoints[11].y, pose.keypoints[11].score],
      R_shoulder: [pose.keypoints[12].x, pose.keypoints[12].y, pose.keypoints[12].score],
      L_hip: [pose.keypoints[23].x, pose.keypoints[23].y, pose.keypoints[23].score],
      R_hip: [pose.keypoints[24].x, pose.keypoints[24].y, pose.keypoints[24].score]
    },
    prev_state: prevFitResult,
    session_id: userId
  })
});

const fitResult = await fitResponse.json();

// 4. Render garment
if (fitResult.mode === 'tracking') {
  // Apply similarity transform
  ctx.save();
  ctx.translate(fitResult.similarity.tx, fitResult.similarity.ty);
  ctx.rotate(fitResult.similarity.rot);
  ctx.scale(fitResult.similarity.scale, fitResult.similarity.scale);

  // Apply TPS warp (implement TPS interpolation)
  const warpedImage = applyTPSWarp(gsm.image, fitResult.warp);

  // Draw garment
  ctx.drawImage(warpedImage, 0, 0, gsm.image.w, gsm.image.h);

  // Clip neck region
  drawNeckClip(fitResult.occlusion.neck_clip);

  ctx.restore();
}
```

---

## Dependencies

### New Dependencies Added

```txt
# requirements.txt
scipy>=1.12.0          # Delaunay triangulation, signal processing
scikit-image>=0.22.0   # Morphology operations
shapely>=2.0.0         # Geometry operations (optional, for future)
```

### Installation

```bash
pip install -r requirements.txt
```

---

## Performance Considerations

### GSM Generation
- **Time**: ~2-5 seconds per garment
- **Bottleneck**: Background removal (rembg)
- **Optimization**: Cache GSMs, reuse for multiple sessions

### Fit Solver
- **Time**: <10ms per frame (target: 10-15 Hz)
- **Bottleneck**: None (pure numpy operations)
- **Latency**: Network RTT dominates (use WebSocket for production)

### Caching Strategy
- **Current**: In-memory dict (prototype)
- **Production**: Redis with TTL (1-hour expiration)
- **Scale**: ~1KB per GSM, 10K GSMs = 10MB RAM

---

## Future Enhancements

### Phase 2: Advanced Features
1. **Arm Occlusion Detection**: Detect when arms cross garment
2. **Multi-Garment Support**: Lower body, dresses, jackets
3. **Texture Warping**: Apply fabric patterns dynamically
4. **Shadow/Lighting**: Match environment lighting
5. **WebSocket Streaming**: Replace REST with WebSocket for fit solver

### Phase 3: Production Ready
1. **Redis Caching**: Replace in-memory cache
2. **Rate Limiting**: Prevent abuse of fit endpoint
3. **Metrics/Monitoring**: Track anchor confidence, fit quality
4. **A/B Testing**: Compare anchor detection algorithms
5. **Model Versioning**: Support multiple GSM versions

---

## Troubleshooting

### Issue: Low Anchor Confidence (<0.5)

**Symptoms:** GSM returns `anchor_confidence < 0.5`

**Solutions:**
1. Check garment image quality (blur, occlusion)
2. Use custom anchors: Set `custom_anchors_json`
3. Try different category: Switch "shirt" ↔ "tshirt"

### Issue: Fit Solver Returns "paused"

**Symptoms:** `mode: "paused"` despite visible pose

**Solutions:**
1. Check shoulder visibility scores (should be >0.7)
2. Ensure correct landmark indices (L_shoulder=11, R_shoulder=12 in MediaPipe)
3. Verify pose coordinates are in video pixel space

### Issue: GSM Not Found (404)

**Symptoms:** `/fit/garment/top` returns 404

**Solutions:**
1. Ensure `/process/garment/top` was called first
2. Check `gsm_id` matches exactly
3. Verify backend hasn't restarted (cache is in-memory)

---

## API Changes from Previous Version

### Breaking Changes
1. `/process/garment/top` response format changed:
   - ~~`status: "ok"`~~ → Direct GSM object
   - ~~`meta`~~ → Flattened into root
   - ~~`urls`~~ → `image.url`
   - **Added**: `gsm_id`, `keypoints`, `mesh`, `anchor_confidence`

2. New endpoint `/fit/garment/top` replaces client-side fit logic

### Migration Guide

**Before (v1.0):**
```javascript
// Client calculated transforms manually
const scale = calculateScale(garment, shoulders);
const position = calculatePosition(garment, neckPoint);
```

**After (v2.0):**
```javascript
// Backend calculates everything
const fit = await fetch('/fit/garment/top', {...});
// Use fit.similarity and fit.warp directly
```

---

## License & Credits

- **rembg**: Background removal (MIT License)
- **scipy**: Scientific computing (BSD License)
- **scikit-image**: Image processing (BSD License)
- **MediaPipe**: Pose detection (Apache 2.0 License)

---

**Last Updated:** 2025-01-15
**API Version:** 2.0.0
**Backend Version:** 2.0.0
