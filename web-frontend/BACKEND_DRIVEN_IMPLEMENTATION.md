# Backend-Driven AR System Implementation

**Status**: ✅ Complete (MVP)
**Date**: 2025-01-15
**Version**: 2.0.0

## Overview

This implementation replaces the manual gesture-based AR system with a fully automatic backend-driven system. All fitting calculations (position, scale, rotation, warping) are handled by the backend fit solver at 10-15 Hz.

## Architecture

```
Frontend (React)                    Backend (FastAPI - Railway)
─────────────────                   ──────────────────────────────

1. Upload Garment ──────────────▶ POST /process/garment/top
                                   ├─ Remove background (rembg)
                                   ├─ Detect anchors (contour)
                                   ├─ Extract keypoints (armpit, hem)
                                   ├─ Generate mesh (Delaunay)
                                   └─ Return GSM + cache

2. Stream Pose      ──────────────▶ POST /fit/garment/top (10 Hz)
   (MediaPipe)                     ├─ Fetch GSM from cache
                                   ├─ Calculate similarity transform
                                   ├─ Calculate TPS warp
                                   ├─ Apply EMA smoothing
                                   └─ Return transform + warp

3. Render Result
   (Canvas API)
```

## New Components

### 1. FitClient Service

**File**: `lib/services/fit-client.ts`

Handles communication with backend fit solver at 10-15 Hz.

**Key Features**:
- Automatic throttling (100ms between requests = 10 Hz)
- Request cancellation (AbortController)
- EMA smoothing state management
- Session tracking

**Usage**:
```typescript
const client = new FitClient('http://localhost:5000');
const fitResult = await client.getFit(gsmId, {
  L_shoulder: [250, 200, 0.95],
  R_shoulder: [390, 200, 0.95],
  L_hip: [280, 450, 0.85],
  R_hip: [360, 450, 0.85]
});
```

### 2. useFitSolver Hook

**File**: `lib/hooks/useFitSolver.ts`

Connects MediaPipe pose detection to backend fit solver.

**Key Features**:
- Auto-initializes FitClient
- Converts MediaPipe landmarks to backend format
- Throttled requests (10 Hz)
- Auto-cleanup on unmount

**Usage**:
```typescript
const { fitResult, error, reset } = useFitSolver({
  gsmId: selectedGarment?.gsmId,
  landmarks: landmarks, // from MediaPipe
  enabled: mediaPipeEnabled && !!gsmId
});
```

### 3. ARStageBackend Component

**File**: `components/tryon/ARStageBackend.tsx`

Simplified AR stage without gesture controls.

**Key Features**:
- Backend-driven transform application
- Auto-tracking with confidence display
- Status footer with real-time feedback
- GSM validation warnings

**Removed**:
- ❌ GestureEditor (no hand gestures)
- ❌ ContinuousTracker (logic on backend)
- ❌ Mouse/keyboard gesture controls
- ❌ Manual transform adjustments

### 4. GarmentOverlayBackend Component

**File**: `components/tryon/GarmentOverlayBackend.tsx`

Canvas-based garment rendering with backend transforms.

**Key Features**:
- Canvas rendering (not react-rnd)
- Backend similarity transform application
- TPS warp support (simplified for MVP)
- Neck clipping (occlusion)
- Debug control points (dev mode)

**Removed**:
- ❌ Drag/resize handles
- ❌ Manual transform controls
- ❌ Mouse gesture detection

### 5. StatusFooter Component

**File**: `components/tryon/StatusFooter.tsx`

Status display at bottom of AR stage.

**Shows**:
- Camera status (active/inactive)
- MediaPipe FPS
- Fitting status (tracking/searching)
- Confidence level (Good/Fair/Poor)

### 6. Simplified Store

**File**: `lib/tryon-store-simple.ts`

Simplified state management for backend-driven system.

**Key Changes**:
- Single `transform` (from backend)
- No dual transform system (tracked/userDelta/final)
- Added `gsmId` to Garment type
- Removed gesture-related state

## API Integration

### Upload Garment → Get GSM

**Endpoint**: `POST /process/garment/top`

**Request**:
```typescript
const formData = new FormData();
formData.append('file', garmentFile);
formData.append('category', 'shirt');
formData.append('auto_anchor', 'true');
formData.append('upload', 'true');

const response = await fetch(`${BACKEND_URL}/process/garment/top`, {
  method: 'POST',
  body: formData
});

const gsm = await response.json();
```

**Response**:
```json
{
  "gsm_id": "gsm_a1b2c3d4",
  "image": {
    "w": 748,
    "h": 1010,
    "url": "https://res.cloudinary.com/..."
  },
  "anchors": {
    "collar_left": [0.312, 0.128],
    "neck_apex": [0.500, 0.184],
    "collar_right": [0.688, 0.128]
  },
  "keypoints": {...},
  "mesh": {...},
  "body_offsets": {...}
}
```

**Frontend Integration**:
```typescript
// Update garment with gsmId
updateGarment(garmentId, { gsmId: gsm.gsm_id });
```

### Stream Pose → Get Fit

**Endpoint**: `POST /fit/garment/top`

**Request** (10 Hz):
```typescript
const fitResult = await fitClient.getFit(gsmId, {
  L_shoulder: [landmarks[11].x, landmarks[11].y, landmarks[11].visibility],
  R_shoulder: [landmarks[12].x, landmarks[12].y, landmarks[12].visibility],
  L_hip: [landmarks[23].x, landmarks[23].y, landmarks[23].visibility],
  R_hip: [landmarks[24].x, landmarks[24].y, landmarks[24].visibility]
});
```

**Response**:
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
    "src_ctrl": [[0.30, 0.12], ...],
    "dst_ctrl": [[0.28, 0.11], ...]
  },
  "occlusion": {
    "neck_clip": {
      "center": [320, 200],
      "rx": 28,
      "ry": 21
    }
  }
}
```

**Frontend Integration**:
```typescript
// Apply backend transform to store
if (fitResult?.mode === 'tracking' && fitResult.similarity) {
  setTransform({
    tx: fitResult.similarity.tx,
    ty: fitResult.similarity.ty,
    scale: fitResult.similarity.scale,
    rotation: fitResult.similarity.rot
  });
}
```

## Testing

### 1. Upload Garment for AR Processing

1. Navigate to `/try-on` page
2. Click "Add AR Garment" in ARPanel
3. Upload a garment image (shirt/tshirt)
4. Watch toast notifications:
   - "Extracting garment..." (background removal)
   - "Processing for AR..." (anchor detection + neck cut)
   - Success: "AR-ready garment processed! TSHIRT detected with anchors"
5. Verify garment appears in gallery with GSM ID

### 2. Enable MediaPipe Tracking

1. Click "MediaPipe OFF" → "MediaPipe ON"
2. Allow camera permission
3. Status should show:
   - ✅ Camera Active
   - FPS counter (30 FPS target)
   - 🔍 Searching... (yellow badge)

### 3. Automatic Garment Alignment

1. Face camera with shoulders visible
2. Within 1-2 seconds:
   - Status changes to 🎯 Tracking (green badge)
   - Garment snaps to shoulders automatically
   - Confidence shows "Good: 95%"
3. Move naturally:
   - Garment follows shoulders smoothly
   - No jitter or lag
   - Maintains proper alignment

### 4. Edge Cases

**Low Confidence**:
- Turn sideways → Status: 🔍 Searching...
- Face camera → Status: 🎯 Tracking

**No GSM ID**:
- Select non-processed garment
- Should show warning: "⚠️ Garment not processed for AR"

**Backend Connection Error**:
- Stop backend server
- Should gracefully handle (no crash)
- Status footer shows connection issues

## Performance Targets

- **Initial Snap**: < 2 seconds from facing camera
- **Tracking FPS**: 10-15 Hz (100ms latency)
- **Collar Accuracy**: ≤ 10px median error
- **Jitter**: < 5px oscillation
- **Backend Latency**: < 50ms per fit request

## Environment Configuration

**File**: `.env`

```bash
# Backend API (Railway production)
NEXT_PUBLIC_GARMENT_API_BASE=https://ar-fashion-tryon-production.up.railway.app

# For local backend testing:
# NEXT_PUBLIC_GARMENT_API_BASE=http://localhost:5000
```

## Migration Guide

### From Old System to New

**Replace ARStage**:
```diff
- import ARStage from '@/components/tryon/ARStage';
+ import ARStageBackend from '@/components/tryon/ARStageBackend';

- <ARStage />
+ <ARStageBackend />
```

**Replace Store**:
```diff
- import { useTryonStore } from '@/lib/tryon-store';
+ import { useTryonStore } from '@/lib/tryon-store-simple';
```

**Update Garment Upload**:
```typescript
// After garment extraction, also process for AR
const gsmResponse = await fetch(`${API_URL}/process/garment/top`, {
  method: 'POST',
  body: formData
});
const gsm = await gsmResponse.json();

// Update garment with gsmId
addGarment({
  ...garment,
  gsmId: gsm.gsm_id
});
```

## Known Limitations (MVP)

1. **TPS Warping**: Simplified implementation (shows control points only)
   - For production: Implement proper TPS interpolation
   - Consider WebGL for performance

2. **Network Latency**: 10 Hz requires stable connection
   - For production: Implement WebSocket streaming
   - Add offline mode with cached fit results

3. **GSM Caching**: Backend uses in-memory cache
   - For production: Use Redis with TTL
   - Implement cache invalidation strategy

4. **Single Garment**: Only upper body (shirts/tshirts)
   - Planned: Lower body, dresses, accessories

5. **No Manual Adjustments**: Everything automatic
   - May add optional manual mode in future
   - For now: Re-process garment with custom anchors if needed

## Future Enhancements

### Phase 2: Advanced Features

1. **WebGL TPS Rendering**: GPU-accelerated warping
2. **Arm Occlusion**: Detect when arms cross garment
3. **Multi-Garment**: Lower body, dresses, jackets
4. **Texture Warping**: Apply fabric patterns dynamically
5. **Shadow/Lighting**: Match environment lighting

### Phase 3: Production Ready

1. **WebSocket Streaming**: Replace REST with WS for fit solver
2. **Redis Caching**: Replace in-memory GSM cache
3. **Rate Limiting**: Prevent abuse of fit endpoint
4. **Metrics/Monitoring**: Track anchor confidence, fit quality
5. **A/B Testing**: Compare anchor detection algorithms

## Troubleshooting

### Issue: GSM ID Missing

**Symptoms**: "⚠️ Garment not processed for AR" warning

**Solutions**:
1. Upload garment through "Add AR Garment" button
2. Wait for "AR-ready garment processed" toast
3. Check browser console for GSM ID in logs

### Issue: Tracking Not Starting

**Symptoms**: Status stuck on "🔍 Searching..."

**Solutions**:
1. Ensure shoulders are visible in frame
2. Check lighting (avoid backlighting)
3. Face camera directly (not sideways)
4. Verify backend is running (Railway URL accessible)

### Issue: Backend Connection Failed

**Symptoms**: Network errors in console, no fit results

**Solutions**:
1. Check `NEXT_PUBLIC_GARMENT_API_BASE` in `.env`
2. Verify Railway backend is deployed and running
3. Check CORS configuration on backend
4. Test backend health: `curl https://ar-fashion-tryon-production.up.railway.app/health`

### Issue: Low FPS (<10 Hz)

**Symptoms**: Laggy tracking, high latency

**Solutions**:
1. Check network latency to backend
2. Verify MediaPipe running on GPU (check browser console)
3. Close other tabs (reduce CPU load)
4. Check backend logs for slow processing

## Console Logging

**Backend Fit Applied**:
```
✅ FitClient initialized: https://...
📐 Backend fit applied: {tx: 220, ty: 165, scale: 1.12, rot: 0.02}
```

**Fit Result**:
```
{
  mode: "tracking",
  confidence: 0.95,
  similarity: {...},
  warp: {...},
  occlusion: {...}
}
```

## References

- **Backend API Docs**: `/image-extraction-backend/BACKEND_AR_IMPLEMENTATION.md`
- **Frontend Components**: This file
- **Fit Client**: `lib/services/fit-client.ts`
- **Fit Solver Hook**: `lib/hooks/useFitSolver.ts`

---

**Last Updated**: 2025-01-15
**Frontend Version**: 2.0.0
**Backend Version**: 2.0.0
**Status**: ✅ MVP Complete
