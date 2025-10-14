# Backend URL-Based Processing Endpoint

This document describes the `/classify_garment_by_url` endpoint that needs to be implemented in the FastAPI garment
extraction backend to support Cloudinary-first pipeline.

## Overview

The URL-based endpoint allows the backend to fetch and process images from public URLs (like Cloudinary) instead of
receiving direct file uploads. This approach:

- ✅ Reduces server bandwidth (no large uploads)
- ✅ Eliminates CORS issues (Cloudinary has proper CORS)
- ✅ Leverages CDN benefits for image serving
- ✅ Enables better caching and monitoring

## Endpoint Specification

### POST `/classify_garment_by_url`

Processes a garment image from a publicly accessible URL.

#### Request

**Content-Type:** `application/json`

**Body:**

```json
{
  "source_url": "https://res.cloudinary.com/your-cloud/image/upload/v123/garments/originals/file.jpg"
}
```

**Parameters:**

- `source_url` (string, required): Publicly accessible URL to the garment image
    - Must be a valid HTTP/HTTPS URL
    - Should point to PNG or JPEG image
    - Maximum recommended size: 10MB

#### Response

**Success (200 OK):**

```json
{
  "label": "TSHIRT",
  "confidence": 0.95,
  "garment_url": "https://ar-fashion-tryon-production.up.railway.app/static/uploads/garment_1234567890.jpg",
  "cutout_url": "https://ar-fashion-tryon-production.up.railway.app/static/outputs/cutout_1234567890.png",
  "cutout_path": "static/outputs/cutout_1234567890.png"
}
```

**Error (4xx/5xx):**

```json
{
  "error": "Failed to fetch image from URL",
  "detail": "HTTP 404: Not Found"
}
```

## Implementation Guide

### 1. Add Required Dependencies

```python
# In your requirements.txt or install via pip
import requests
from io import BytesIO
from PIL import Image
```

### 2. Implement the Endpoint

**File:** `app/main.py` or `app/routers/garment.py`

```python
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, HttpUrl
import requests
from io import BytesIO
from PIL import Image
import uuid
from datetime import datetime

router = APIRouter()

class GarmentUrlRequest(BaseModel):
    source_url: HttpUrl

@router.post("/classify_garment_by_url")
async def classify_garment_by_url(request: GarmentUrlRequest):
    """
    Process garment image from a public URL

    Args:
        request: GarmentUrlRequest containing source_url

    Returns:
        GarmentResponse with classification and extraction results
    """
    try:
        # 1. Fetch image from URL
        response = requests.get(
            str(request.source_url),
            timeout=30,  # 30 second timeout
            stream=True,
            headers={'User-Agent': 'AR-Fashion-TryOn-Backend/1.0'}
        )
        response.raise_for_status()

        # 2. Validate content type
        content_type = response.headers.get('content-type', '')
        if not content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid content type: {content_type}. Expected image/*"
            )

        # 3. Load image into memory
        image_bytes = BytesIO(response.content)
        image = Image.open(image_bytes)

        # 4. Validate image format
        if image.format not in ['PNG', 'JPEG', 'JPG']:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported image format: {image.format}. Use PNG or JPEG"
            )

        # 5. Save to uploads directory (for consistency with direct upload flow)
        timestamp = int(datetime.now().timestamp())
        unique_id = uuid.uuid4().hex[:8]
        filename = f"garment_{timestamp}_{unique_id}.{image.format.lower()}"
        garment_path = f"static/uploads/{filename}"

        # Ensure directory exists
        os.makedirs("static/uploads", exist_ok=True)
        image.save(garment_path)

        # 6. Process image (same as /classify_garment)
        # This is your existing classification + rembg logic
        label, confidence = await classify_garment_image(image)
        cutout_image = await remove_background(image)

        # 7. Save cutout
        cutout_filename = f"cutout_{timestamp}_{unique_id}.png"
        cutout_path = f"static/outputs/{cutout_filename}"
        os.makedirs("static/outputs", exist_ok=True)
        cutout_image.save(cutout_path)

        # 8. Build response URLs (absolute URLs for Railway)
        base_url = os.getenv("BASE_URL", "http://localhost:5000")
        garment_url = f"{base_url}/{garment_path}"
        cutout_url = f"{base_url}/{cutout_path}"

        return {
            "label": label,
            "confidence": confidence,
            "garment_url": garment_url,
            "cutout_url": cutout_url,
            "cutout_path": cutout_path
        }

    except requests.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch image from URL: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Image processing failed: {str(e)}"
        )
```

### 3. Reuse Existing Processing Logic

Extract your existing classification and background removal logic into reusable functions:

```python
async def classify_garment_image(image: Image.Image) -> tuple[str, float]:
    """
    Classify garment type from PIL Image
    Returns: (label, confidence)
    """
    # Your existing YOLO/classification logic here
    # Convert PIL Image to format expected by your model
    pass

async def remove_background(image: Image.Image) -> Image.Image:
    """
    Remove background from PIL Image using rembg
    Returns: PIL Image with transparent background
    """
    # Your existing rembg logic here
    # Convert PIL Image -> bytes -> rembg -> PIL Image
    pass
```

### 4. Update Main Router

```python
# In app/main.py
from app.routers import garment

app.include_router(garment.router, prefix="", tags=["garment"])
```

### 5. Environment Variables

Add to your backend `.env`:

```bash
# Base URL for absolute URL generation (Railway deployment)
BASE_URL=https://ar-fashion-tryon-production.up.railway.app

# For local development:
# BASE_URL=http://localhost:5000
```

## Testing

### 1. Test with cURL

```bash
curl -X POST "http://localhost:5000/classify_garment_by_url" \
  -H "Content-Type: application/json" \
  -d '{
    "source_url": "https://res.cloudinary.com/demo/image/upload/v1234/sample.jpg"
  }'
```

### 2. Test with Python

```python
import requests

response = requests.post(
    "http://localhost:5000/classify_garment_by_url",
    json={
        "source_url": "https://res.cloudinary.com/demo/image/upload/v1234/sample.jpg"
    }
)

print(response.json())
```

### 3. Test with Frontend

The frontend will call this automatically when using the Cloudinary pipeline:

```typescript
import {extractViaCloudinaryPipeline} from '@/lib/services/garmentApi';

// User selects a file
const result = await extractViaCloudinaryPipeline(file);

console.log('Classification:', result.result.classification);
console.log('Cloudinary URL:', result.cloudinaryUrl);
console.log('Extracted File:', result.extractedFile);
```

## Error Handling

The endpoint should handle these error cases:

1. **Invalid URL** (400 Bad Request)
    - Malformed URL
    - Non-HTTP/HTTPS protocol

2. **Fetch Failure** (502 Bad Gateway)
    - Network timeout
    - DNS resolution failed
    - Connection refused
    - HTTP 4xx/5xx from source

3. **Invalid Image** (400 Bad Request)
    - Not an image (wrong content-type)
    - Unsupported format (not PNG/JPEG)
    - Corrupted file

4. **Processing Failure** (500 Internal Server Error)
    - Classification model error
    - Background removal failed
    - File system error

## Security Considerations

1. **URL Validation**
    - Validate URL format before fetching
    - Consider allowlist for trusted domains (Cloudinary only)
    - Prevent SSRF attacks (don't allow localhost, private IPs)

2. **Size Limits**
    - Set `max_content_length` in requests (10MB recommended)
    - Check image dimensions after loading

3. **Timeout**
    - Set reasonable timeout (30 seconds)
    - Prevent hanging connections

4. **Rate Limiting**
    - Add rate limiting to prevent abuse
    - Consider per-IP or per-user limits

## Example: Restrict to Cloudinary Only

```python
from urllib.parse import urlparse

ALLOWED_DOMAINS = [
    'res.cloudinary.com',
    'cloudinary.com'
]

@router.post("/classify_garment_by_url")
async def classify_garment_by_url(request: GarmentUrlRequest):
    # Validate domain
    parsed = urlparse(str(request.source_url))
    if not any(parsed.netloc.endswith(domain) for domain in ALLOWED_DOMAINS):
        raise HTTPException(
            status_code=400,
            detail=f"URL must be from allowed domains: {ALLOWED_DOMAINS}"
        )

    # ... rest of implementation
```

## Complete Flow Diagram

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. User selects garment image
       ▼
┌─────────────────────────────────┐
│  uploadToCloudinary(file)       │
│  - POST to Cloudinary API       │
│  - Returns secure_url           │
└──────┬──────────────────────────┘
       │ 2. secure_url: https://res.cloudinary.com/.../garment.jpg
       ▼
┌─────────────────────────────────┐
│  extractGarmentByUrl(url)       │
│  - POST /classify_garment_by_url│
│  - Body: { source_url: url }    │
└──────┬──────────────────────────┘
       │ 3. Backend fetches from Cloudinary
       ▼
┌─────────────────────────────────┐
│  Backend Processing             │
│  - Download image from URL      │
│  - Classify garment             │
│  - Remove background            │
│  - Save cutout                  │
└──────┬──────────────────────────┘
       │ 4. Response with cutout_url
       ▼
┌─────────────────────────────────┐
│  downloadExtractedImage(url)    │
│  - Fetch cutout image           │
│  - Convert to File object       │
└──────┬──────────────────────────┘
       │ 5. Display or use in VTON
       ▼
┌─────────────┐
│   Browser   │
└─────────────┘
```

## Performance Comparison

### Direct Upload (Current)

- **Upload time**: 2-5s (10MB image to Railway)
- **Processing time**: 3-8s (classification + rembg)
- **Download time**: 1-2s (cutout from Railway)
- **Total**: ~6-15s

### Cloudinary Pipeline (New)

- **Upload time**: 1-3s (10MB to Cloudinary CDN)
- **Backend fetch**: 0.5-1s (Cloudinary → Railway)
- **Processing time**: 3-8s (same)
- **Download time**: 0.5-1s (Cloudinary CDN)
- **Total**: ~5-13s + better reliability

## Next Steps

1. ✅ Implement endpoint in FastAPI backend
2. ✅ Test with Cloudinary URLs
3. ✅ Update frontend to use `extractViaCloudinaryPipeline()`
4. ✅ Configure Cloudinary environment variables
5. ✅ Deploy and verify in production

## Related Documentation

- [Cloudinary Upload API](https://cloudinary.com/documentation/upload_images#unsigned_upload)
- [garmentApi.ts Frontend Implementation](../lib/services/garmentApi.ts)
- [CORS Fix Documentation](CORS_FIX.md)
- [Gradio Integration](GRADIO_INTEGRATION.md)
