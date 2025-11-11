# Frontend Integration Guide - Garment Keypoint Detection

Quick reference for frontend developers integrating the keypoint detection endpoints.

---

## Quick Start

### 1. Check API Availability

```typescript
const checkKeypointAPI = async (): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:5000/health');
    const data = await response.json();
    return data.keypoint_model_loaded === true;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
};
```

### 2. Upload Garment and Get Keypoints

```typescript
interface KeypointResponse {
  success: boolean;
  garment_url: string;
  garment_public_id: string;
  all_keypoints: Keypoint[];
  garment_keypoints: GarmentKeypoints;
  image_dimensions: { width: number; height: number };
  detection_confidence: number;
  message: string;
}

const uploadGarmentForKeypoints = async (file: File): Promise<KeypointResponse | null> => {
  try {
    const formData = new FormData();
    formData.append('garment', file);

    const response = await fetch('http://localhost:5000/detect_garment_keypoints', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Keypoint detection failed:', error.detail);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Network error:', error);
    return null;
  }
};
```

---

## Response Structure

### Example Response

```json
{
  "success": true,
  "garment_url": "https://res.cloudinary.com/.../garment_abc123.jpg",
  "garment_public_id": "garments/originals/garment_abc123",
  "all_keypoints": [
    {
      "name": "left_shoulder",
      "x": 0.35,
      "y": 0.25,
      "x_pixel": 224.0,
      "y_pixel": 160.0,
      "visible": true,
      "confidence": 0.92,
      "derived": false
    }
  ],
  "garment_keypoints": {
    "left_shoulder": { "x": 0.35, "y": 0.25, "x_pixel": 224.0, "y_pixel": 160.0, "visible": true, "confidence": 0.92 },
    "right_shoulder": { "x": 0.65, "y": 0.24, "x_pixel": 416.0, "y_pixel": 153.6, "visible": true, "confidence": 0.89 },
    "shoulder_center": { "x": 0.50, "y": 0.245, "x_pixel": 320.0, "y_pixel": 156.8, "visible": true, "confidence": 0.905, "derived": true },
    "shoulder_width_pixel": 198.4,
    "shoulder_angle_degrees": -1.85,
    "left_hip": { "x": 0.35, "y": 0.75, "x_pixel": 224.0, "y_pixel": 480.0, "visible": true, "confidence": 0.85 },
    "right_hip": { "x": 0.65, "y": 0.76, "x_pixel": 416.0, "y_pixel": 486.4, "visible": true, "confidence": 0.82 }
  },
  "image_dimensions": { "width": 640, "height": 640 },
  "detection_confidence": 0.87,
  "message": "Keypoints detected successfully"
}
```

### TypeScript Interfaces

```typescript
interface Keypoint {
  name: string;
  x: number;              // Normalized 0-1
  y: number;              // Normalized 0-1
  x_pixel: number;        // Absolute pixels
  y_pixel: number;        // Absolute pixels
  visible: boolean;
  confidence: number;     // 0-1
  derived?: boolean;      // For calculated keypoints
}

interface GarmentKeypoints {
  left_shoulder?: Keypoint;
  right_shoulder?: Keypoint;
  shoulder_center?: Keypoint;
  shoulder_width_pixel?: number;
  shoulder_angle_degrees?: number;
  left_hip?: Keypoint;
  right_hip?: Keypoint;
  neckline_reference?: Keypoint;
}

interface KeypointResponse {
  success: boolean;
  garment_url: string;
  garment_public_id: string;
  all_keypoints: Keypoint[];
  garment_keypoints: GarmentKeypoints;
  image_dimensions: { width: number; height: number };
  detection_confidence: number;
  message: string;
}
```

---

## Updating Your Garment Store

### Add Keypoints to Garment Interface

```typescript
interface Garment {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;

  // Cloudinary info
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;

  // NEW: Keypoint data
  keypoints?: {
    leftShoulder: { x: number; y: number };
    rightShoulder: { x: number; y: number };
    shoulderCenter: { x: number; y: number };
    shoulderWidth: number;
    shoulderAngle: number;
    leftHip?: { x: number; y: number };
    rightHip?: { x: number; y: number };
    confidence: number;
  };
}
```

### Store Keypoints When Uploading

```typescript
const addGarmentWithKeypoints = async (file: File): Promise<Garment | null> => {
  // Upload and get keypoints
  const keypointData = await uploadGarmentForKeypoints(file);

  if (!keypointData) {
    console.error('Failed to detect keypoints');
    return null;
  }

  // Create garment object
  const garment: Garment = {
    id: generateId(),
    name: file.name,
    src: keypointData.garment_url,
    width: keypointData.image_dimensions.width,
    height: keypointData.image_dimensions.height,
    cloudinaryUrl: keypointData.garment_url,
    cloudinaryPublicId: keypointData.garment_public_id,

    // Store keypoints
    keypoints: {
      leftShoulder: {
        x: keypointData.garment_keypoints.left_shoulder?.x ?? 0,
        y: keypointData.garment_keypoints.left_shoulder?.y ?? 0,
      },
      rightShoulder: {
        x: keypointData.garment_keypoints.right_shoulder?.x ?? 0,
        y: keypointData.garment_keypoints.right_shoulder?.y ?? 0,
      },
      shoulderCenter: {
        x: keypointData.garment_keypoints.shoulder_center?.x ?? 0,
        y: keypointData.garment_keypoints.shoulder_center?.y ?? 0,
      },
      shoulderWidth: keypointData.garment_keypoints.shoulder_width_pixel ?? 0,
      shoulderAngle: keypointData.garment_keypoints.shoulder_angle_degrees ?? 0,
      leftHip: keypointData.garment_keypoints.left_hip ? {
        x: keypointData.garment_keypoints.left_hip.x,
        y: keypointData.garment_keypoints.left_hip.y,
      } : undefined,
      rightHip: keypointData.garment_keypoints.right_hip ? {
        x: keypointData.garment_keypoints.right_hip.x,
        y: keypointData.garment_keypoints.right_hip.y,
      } : undefined,
      confidence: keypointData.detection_confidence,
    },
  };

  // Add to store
  useGarmentStore.getState().addGarment(garment);

  return garment;
};
```

---

## Using Keypoints for AR Alignment

### Calculate Garment Transform

```typescript
interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface BodyShoulders {
  left: { x: number; y: number };    // From MediaPipe
  right: { x: number; y: number };   // From MediaPipe
}

const calculateGarmentTransform = (
  bodyShoulders: BodyShoulders,
  garment: Garment,
  containerWidth: number,
  containerHeight: number
): Transform => {

  // Check if garment has keypoints
  if (!garment.keypoints) {
    // Fallback to your existing simple positioning
    return calculateSimpleTransform(bodyShoulders, garment);
  }

  // 1. Calculate body shoulder center and width
  const bodyShoulderCenter = {
    x: (bodyShoulders.left.x + bodyShoulders.right.x) / 2,
    y: (bodyShoulders.left.y + bodyShoulders.right.y) / 2,
  };

  const bodyShoulderWidth = Math.sqrt(
    Math.pow(bodyShoulders.right.x - bodyShoulders.left.x, 2) +
    Math.pow(bodyShoulders.right.y - bodyShoulders.left.y, 2)
  );

  // 2. Get garment keypoint data
  const garmentShoulderCenter = garment.keypoints.shoulderCenter;
  const garmentShoulderWidth = garment.keypoints.shoulderWidth;

  // 3. Calculate scale (match shoulder widths)
  const scale = bodyShoulderWidth / garmentShoulderWidth;

  // 4. Calculate position
  // Convert normalized coordinates to pixels
  const garmentCenterPixels = {
    x: garmentShoulderCenter.x * garment.width,
    y: garmentShoulderCenter.y * garment.height,
  };

  // After scaling, align centers
  const scaledGarmentCenter = {
    x: garmentCenterPixels.x * scale,
    y: garmentCenterPixels.y * scale,
  };

  const position = {
    x: bodyShoulderCenter.x - scaledGarmentCenter.x,
    y: bodyShoulderCenter.y - scaledGarmentCenter.y,
  };

  // 5. Calculate rotation
  const bodyAngle = Math.atan2(
    bodyShoulders.right.y - bodyShoulders.left.y,
    bodyShoulders.right.x - bodyShoulders.left.x
  ) * (180 / Math.PI);

  const rotation = bodyAngle - garment.keypoints.shoulderAngle;

  return {
    x: Math.round(position.x),
    y: Math.round(position.y),
    scale: Math.max(0.5, Math.min(2.0, scale)),
    rotation: Math.max(-45, Math.min(45, rotation)),
  };
};
```

### Apply Transform to Garment Image

```typescript
const applyGarmentTransform = (
  imageElement: HTMLImageElement,
  transform: Transform
) => {
  const style = `
    transform:
      translate(${transform.x}px, ${transform.y}px)
      scale(${transform.scale})
      rotate(${transform.rotation}deg);
    transform-origin: center center;
    position: absolute;
  `;

  imageElement.style.cssText = style;
};
```

---

## Error Handling

### Handle API Errors

```typescript
const uploadWithErrorHandling = async (file: File) => {
  try {
    const response = await fetch('http://localhost:5000/detect_garment_keypoints', {
      method: 'POST',
      body: (() => {
        const formData = new FormData();
        formData.append('garment', file);
        return formData;
      })(),
    });

    if (!response.ok) {
      const error = await response.json();

      if (response.status === 503) {
        // Model not loaded
        console.error('Keypoint detection unavailable');
        toast.error('AR alignment not available. Using basic positioning.');
        return null;
      }

      if (response.status === 413) {
        // File too large
        toast.error('Image too large. Please use a smaller image (max 16MB).');
        return null;
      }

      // Other errors
      console.error('Detection failed:', error.detail);
      toast.error('Failed to detect garment keypoints');
      return null;
    }

    const data = await response.json();

    // Check confidence
    if (data.detection_confidence < 0.5) {
      console.warn('Low detection confidence:', data.detection_confidence);
      toast.warning('Keypoint detection confidence is low. Results may be inaccurate.');
    }

    return data;

  } catch (error) {
    console.error('Network error:', error);
    toast.error('Network error. Please try again.');
    return null;
  }
};
```

---

## Complete Example

### Add Garment Button Component

```typescript
'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';

export function AddGarmentButton() {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      // 1. Upload and get keypoints
      const formData = new FormData();
      formData.append('garment', file);

      const response = await fetch('http://localhost:5000/detect_garment_keypoints', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      // 2. Create garment object
      const garment: Garment = {
        id: crypto.randomUUID(),
        name: file.name,
        src: data.garment_url,
        width: data.image_dimensions.width,
        height: data.image_dimensions.height,
        cloudinaryUrl: data.garment_url,
        cloudinaryPublicId: data.garment_public_id,
        keypoints: {
          leftShoulder: {
            x: data.garment_keypoints.left_shoulder?.x ?? 0,
            y: data.garment_keypoints.left_shoulder?.y ?? 0,
          },
          rightShoulder: {
            x: data.garment_keypoints.right_shoulder?.x ?? 0,
            y: data.garment_keypoints.right_shoulder?.y ?? 0,
          },
          shoulderCenter: {
            x: data.garment_keypoints.shoulder_center?.x ?? 0,
            y: data.garment_keypoints.shoulder_center?.y ?? 0,
          },
          shoulderWidth: data.garment_keypoints.shoulder_width_pixel ?? 0,
          shoulderAngle: data.garment_keypoints.shoulder_angle_degrees ?? 0,
          confidence: data.detection_confidence,
        },
      };

      // 3. Add to store
      useGarmentStore.getState().addGarment(garment);

      console.log('Garment added with keypoints:', garment);

    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload garment');
    } finally {
      setUploading(false);
    }
  };

  return (
    <label className="cursor-pointer">
      <input
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        onChange={handleFileUpload}
        disabled={uploading}
        className="hidden"
      />
      <div className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
        <Upload size={20} />
        {uploading ? 'Uploading...' : 'Add Garment'}
      </div>
    </label>
  );
}
```

---

## Migration Strategy

### Phase 1: Add Keypoint Detection (No Breaking Changes)

```typescript
// Keep existing upload function
const addGarment = async (file: File) => {
  // Your existing code
};

// Add new function with keypoints
const addGarmentWithKeypoints = async (file: File) => {
  // New code with keypoint detection
};

// Use conditionally
const handleUpload = async (file: File) => {
  // Check if keypoint API is available
  const keypointAvailable = await checkKeypointAPI();

  if (keypointAvailable) {
    return await addGarmentWithKeypoints(file);
  } else {
    return await addGarment(file);  // Fallback to existing
  }
};
```

### Phase 2: Update Alignment Logic

```typescript
// In your pose-utils.ts or similar file

export function calculateGarmentPosition(
  shoulderPos: ShoulderPosition,
  garment: Garment,
  // ... other params
): Transform {

  // NEW: Check if garment has keypoints
  if (garment.keypoints && garment.keypoints.confidence > 0.5) {
    return calculateGarmentPositionWithKeypoints(
      shoulderPos,
      garment,
      // ... other params
    );
  }

  // FALLBACK: Use existing algorithm
  return calculateGarmentPositionSimple(
    shoulderPos,
    garment,
    // ... other params
  );
}
```

---

## API Endpoints Summary

| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `/health` | GET | None | Status + `keypoint_model_loaded` |
| `/detect_garment_keypoints` | POST | Form-data: `garment` file | Keypoint data + Cloudinary URL |
| `/detect_garment_keypoints_by_url` | POST | JSON: `{"source_url": "..."}` | Keypoint data + Cloudinary URL |

---

## Testing

### Test with cURL

```bash
# Test health
curl http://localhost:5000/health | jq

# Test file upload
curl -X POST "http://localhost:5000/detect_garment_keypoints" \
  -F "garment=@test.jpg" | jq

# Test URL upload
curl -X POST "http://localhost:5000/detect_garment_keypoints_by_url" \
  -H "Content-Type: application/json" \
  -d '{"source_url": "https://example.com/garment.jpg"}' | jq
```

---

## Questions?

- Full API documentation: `KEYPOINT_API_GUIDE.md`
- Implementation details: `IMPLEMENTATION_SUMMARY.md`
- Backend code: `services/keypoint_service.py`, `app.py`

---

**Ready to integrate!** Start with the "Complete Example" section above and adapt to your existing codebase.
