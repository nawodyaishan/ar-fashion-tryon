# Garment Keypoint Detection API Guide

## Overview

The keypoint detection endpoints provide precise structural point detection for garments to enable accurate AR try-on alignment. These endpoints upload images to Cloudinary and return normalized keypoint coordinates.

## Installation

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

This will install:
- MMPose and dependencies (openmim, mmengine, mmcv, mmdet)
- All existing dependencies remain unchanged

### 2. Start the Server

```bash
uvicorn app:app --reload --host 0.0.0.0 --port 5000
```

On startup, you should see:
```
Loading MMPose keypoint detection model...
✓ MMPose keypoint model loaded successfully
```

### 3. Verify Installation

Check the health endpoint:

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "ok",
  "version": "2.0.0",
  "model_loaded": false,
  "model_name": null,
  "gradio_connected": false,
  "keypoint_model_loaded": true,  // ← Should be true
  "services": null
}
```

## API Endpoints

### 1. `/detect_garment_keypoints` (POST)

Detect keypoints from an uploaded garment image.

**Request:**

```bash
curl -X POST "http://localhost:5000/detect_garment_keypoints" \
  -F "garment=@/path/to/garment.jpg"
```

**Response:**

```json
{
  "success": true,
  "garment_url": "https://res.cloudinary.com/.../garments/originals/garment_abc123.jpg",
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
    },
    {
      "name": "right_shoulder",
      "x": 0.65,
      "y": 0.24,
      "x_pixel": 416.0,
      "y_pixel": 153.6,
      "visible": true,
      "confidence": 0.89,
      "derived": false
    }
    // ... more keypoints
  ],
  "garment_keypoints": {
    "left_shoulder": {
      "name": "left_shoulder",
      "x": 0.35,
      "y": 0.25,
      "x_pixel": 224.0,
      "y_pixel": 160.0,
      "visible": true,
      "confidence": 0.92
    },
    "right_shoulder": {
      "name": "right_shoulder",
      "x": 0.65,
      "y": 0.24,
      "x_pixel": 416.0,
      "y_pixel": 153.6,
      "visible": true,
      "confidence": 0.89
    },
    "shoulder_center": {
      "name": "shoulder_center",
      "x": 0.50,
      "y": 0.245,
      "x_pixel": 320.0,
      "y_pixel": 156.8,
      "visible": true,
      "confidence": 0.905,
      "derived": true
    },
    "shoulder_width_pixel": 198.4,
    "shoulder_angle_degrees": -1.85,
    "left_hip": { ... },
    "right_hip": { ... },
    "neckline_reference": { ... }
  },
  "image_dimensions": {
    "width": 640,
    "height": 640
  },
  "detection_confidence": 0.87,
  "message": "Keypoints detected successfully"
}
```

### 2. `/detect_garment_keypoints_by_url` (POST)

Detect keypoints from a garment image URL.

**Request:**

```bash
curl -X POST "http://localhost:5000/detect_garment_keypoints_by_url" \
  -H "Content-Type: application/json" \
  -d '{
    "source_url": "https://example.com/garment.jpg"
  }'
```

**Response:**

Same format as `/detect_garment_keypoints`

## Response Fields Explained

### Core Fields

- **`success`**: Boolean indicating operation success
- **`garment_url`**: Cloudinary URL of the uploaded image
- **`garment_public_id`**: Cloudinary public ID for future operations
- **`detection_confidence`**: Overall confidence score (0.0-1.0)
- **`message`**: Status message

### Keypoint Fields

Each keypoint contains:

- **`name`**: Keypoint identifier (e.g., "left_shoulder", "right_shoulder")
- **`x`**, **`y`**: Normalized coordinates (0.0-1.0 range)
  - Multiply by image dimensions to get pixel coordinates
  - Origin (0,0) is top-left corner
- **`x_pixel`**, **`y_pixel`**: Absolute pixel coordinates
- **`visible`**: Whether the keypoint is visible/detected
- **`confidence`**: Detection confidence (0.0-1.0)
- **`derived`**: (optional) True if calculated from other keypoints

### `all_keypoints` Array

Contains all detected body keypoints:

- `nose` - Useful as neckline reference
- `left_eye`, `right_eye`
- `left_ear`, `right_ear`
- **`left_shoulder`** ⭐ Critical for alignment
- **`right_shoulder`** ⭐ Critical for alignment
- `left_elbow`, `right_elbow`
- `left_wrist`, `right_wrist`
- **`left_hip`** ⭐ For garment bottom alignment
- **`right_hip`** ⭐ For garment bottom alignment
- `left_knee`, `right_knee`
- `left_ankle`, `right_ankle`

### `garment_keypoints` Object

Organized keypoints specifically for garment alignment:

- **`left_shoulder`**: Left shoulder seam position
- **`right_shoulder`**: Right shoulder seam position
- **`shoulder_center`**: Calculated midpoint (for centering garment)
- **`shoulder_width_pixel`**: Distance between shoulders (for scaling)
- **`shoulder_angle_degrees`**: Shoulder tilt angle (for rotation)
- **`left_hip`**: Left hip position (for garment length)
- **`right_hip`**: Right hip position (for garment length)
- **`neckline_reference`**: Nose position as neckline proxy

## Frontend Integration

### Basic Usage

```typescript
// Upload garment for keypoint detection
const formData = new FormData();
formData.append('garment', garmentFile);

const response = await fetch('http://localhost:5000/detect_garment_keypoints', {
  method: 'POST',
  body: formData
});

const data = await response.json();

// Access keypoints
const leftShoulder = data.garment_keypoints.left_shoulder;
const rightShoulder = data.garment_keypoints.right_shoulder;
const shoulderCenter = data.garment_keypoints.shoulder_center;

console.log(`Shoulder center: (${shoulderCenter.x}, ${shoulderCenter.y})`);
console.log(`Shoulder width: ${data.garment_keypoints.shoulder_width_pixel}px`);
```

### Aligning Garment to Body (Example)

```typescript
interface GarmentTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

function calculateGarmentTransform(
  bodyShoulders: { left: Point, right: Point },
  garmentKeypoints: any,
  containerWidth: number,
  containerHeight: number
): GarmentTransform {

  // 1. Calculate body shoulder center and width
  const bodyShoulderCenter = {
    x: (bodyShoulders.left.x + bodyShoulders.right.x) / 2,
    y: (bodyShoulders.left.y + bodyShoulders.right.y) / 2
  };

  const bodyShoulderWidth = Math.sqrt(
    Math.pow(bodyShoulders.right.x - bodyShoulders.left.x, 2) +
    Math.pow(bodyShoulders.right.y - bodyShoulders.left.y, 2)
  );

  // 2. Get garment shoulder data
  const garmentShoulderCenter = garmentKeypoints.shoulder_center;
  const garmentShoulderWidth = garmentKeypoints.shoulder_width_pixel;

  // 3. Calculate scale (match shoulder widths)
  const scale = bodyShoulderWidth / garmentShoulderWidth;

  // 4. Calculate position (align shoulder centers)
  const scaledGarmentCenter = {
    x: garmentShoulderCenter.x_pixel * scale,
    y: garmentShoulderCenter.y_pixel * scale
  };

  const position = {
    x: bodyShoulderCenter.x - scaledGarmentCenter.x,
    y: bodyShoulderCenter.y - scaledGarmentCenter.y
  };

  // 5. Calculate rotation (match shoulder angles)
  const bodyAngle = Math.atan2(
    bodyShoulders.right.y - bodyShoulders.left.y,
    bodyShoulders.right.x - bodyShoulders.left.x
  ) * (180 / Math.PI);

  const rotation = bodyAngle - garmentKeypoints.shoulder_angle_degrees;

  return {
    x: position.x,
    y: position.y,
    scale: Math.max(0.5, Math.min(2.0, scale)),
    rotation: Math.max(-45, Math.min(45, rotation))
  };
}
```

### Storing Keypoints with Garment Data

```typescript
interface Garment {
  id: string;
  name: string;
  src: string;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  width: number;
  height: number;

  // NEW: Add keypoint data
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

// After uploading garment
const keypointResponse = await fetch('/detect_garment_keypoints', {
  method: 'POST',
  body: formData
});

const keypointData = await keypointResponse.json();

// Store in your garment data
const garment: Garment = {
  id: generateId(),
  name: garmentFile.name,
  src: keypointData.garment_url,
  cloudinaryUrl: keypointData.garment_url,
  cloudinaryPublicId: keypointData.garment_public_id,
  width: keypointData.image_dimensions.width,
  height: keypointData.image_dimensions.height,
  keypoints: {
    leftShoulder: {
      x: keypointData.garment_keypoints.left_shoulder.x,
      y: keypointData.garment_keypoints.left_shoulder.y
    },
    rightShoulder: {
      x: keypointData.garment_keypoints.right_shoulder.x,
      y: keypointData.garment_keypoints.right_shoulder.y
    },
    shoulderCenter: {
      x: keypointData.garment_keypoints.shoulder_center.x,
      y: keypointData.garment_keypoints.shoulder_center.y
    },
    shoulderWidth: keypointData.garment_keypoints.shoulder_width_pixel,
    shoulderAngle: keypointData.garment_keypoints.shoulder_angle_degrees,
    confidence: keypointData.detection_confidence
  }
};
```

## Error Handling

### Common Errors

**503 Service Unavailable** - Model not loaded
```json
{
  "detail": "Keypoint detection model not loaded. Check /health endpoint."
}
```

**400 Bad Request** - Invalid file
```json
{
  "detail": "Invalid file type. Allowed: jpg, jpeg, png"
}
```

**413 Payload Too Large** - File too large
```json
{
  "detail": "File too large (>16MB)"
}
```

**500 Internal Server Error** - Detection failed
```json
{
  "detail": "Keypoint detection failed: <error details>"
}
```

### Frontend Error Handling

```typescript
try {
  const response = await fetch('/detect_garment_keypoints', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();

    if (response.status === 503) {
      console.error('Keypoint detection not available:', error.detail);
      // Fall back to simple positioning without keypoints
    } else if (response.status === 413) {
      console.error('Image too large. Please use a smaller image.');
    } else {
      console.error('Detection failed:', error.detail);
    }

    return null;
  }

  const data = await response.json();

  // Check confidence threshold
  if (data.detection_confidence < 0.5) {
    console.warn('Low detection confidence. Results may be inaccurate.');
  }

  return data;

} catch (error) {
  console.error('Network error:', error);
  return null;
}
```

## Performance Considerations

### Model Loading

- Model loads once at startup (~2-5 seconds)
- Uses CPU inference (compatible with existing TensorFlow on CPU)
- Memory usage: ~200-300MB additional

### Inference Speed

- Single image: ~100-300ms on CPU
- Depends on image size and CPU performance
- No GPU required

### Optimization Tips

1. **Resize large images** before uploading (recommended: 640x640)
2. **Cache results** - keypoints don't change for the same garment
3. **Check confidence** - use threshold (e.g., >0.5) for quality control
4. **Fallback strategy** - use simple positioning if detection fails

## Backward Compatibility

### No Breaking Changes

All existing endpoints remain unchanged:
- `/health` - Added `keypoint_model_loaded` field
- `/classify_garment` - No changes
- `/classify_garment_by_url` - No changes
- `/detect_garment_type` - No changes
- `/construct_outfit` - No changes
- `/virtual_tryon` - No changes

### Graceful Degradation

If MMPose fails to load:
- Application still starts successfully
- `/health` returns `keypoint_model_loaded: false`
- Keypoint endpoints return 503 error
- All other endpoints work normally

## Testing

### Test with cURL

```bash
# 1. Check health
curl http://localhost:5000/health | jq

# 2. Test with local file
curl -X POST "http://localhost:5000/detect_garment_keypoints" \
  -F "garment=@test_garment.jpg" | jq

# 3. Test with URL
curl -X POST "http://localhost:5000/detect_garment_keypoints_by_url" \
  -H "Content-Type: application/json" \
  -d '{"source_url": "https://example.com/garment.jpg"}' | jq
```

### Test Script

See `test_keypoint_api.py` for a complete test suite.

## Troubleshooting

### Model Fails to Load

**Symptom:** `keypoint_model_loaded: false` in health check

**Solutions:**
1. Verify MMPose installation: `pip list | grep mmpose`
2. Check dependencies: `pip install -r requirements.txt`
3. Check logs for specific error messages
4. Try reinstalling: `pip uninstall mmpose && pip install mmpose`

### Low Detection Confidence

**Symptom:** `detection_confidence < 0.5`

**Causes:**
- Garment not clearly visible
- Poor lighting or image quality
- Garment heavily occluded
- Complex background not removed

**Solutions:**
1. Use higher quality images
2. Ensure garment occupies 40-80% of image
3. Use frontal view of garment
4. Pre-process with background removal

### Memory Issues

**Symptom:** Out of memory errors

**Solutions:**
1. Reduce image size before upload
2. Limit concurrent requests
3. Increase server memory allocation
4. Consider GPU deployment for production

## Next Steps

1. **Test the endpoints** with sample garments
2. **Integrate into frontend** using the examples above
3. **Evaluate accuracy** with your specific garment types
4. **Adjust confidence thresholds** based on your quality requirements
5. **Consider GPU deployment** for production (faster inference)

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs for detailed error messages
3. Test with sample images to isolate the issue
4. Verify all dependencies are installed correctly
