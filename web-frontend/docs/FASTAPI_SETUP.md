# FastAPI Gradio Integration - Quick Setup

This guide will help you set up and use the new FastAPI backend for virtual try-on.

## What Changed?

Your frontend now uses a **FastAPI backend** instead of calling Gradio directly. This provides:

✅ Automatic retry logic (3 attempts)
✅ Cloudinary storage for all images
✅ Better error handling
✅ Garment classification included
✅ Single unified API endpoint

## Setup Steps

### 1. Backend Setup

Your FastAPI backend (`app.py`) is ready to use! Just configure the environment:

```bash
# In your backend directory (image-extraction-backend)
# Create .env file with:

# Cloudinary (required for image storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your-api-secret

# Gradio (required for virtual try-on)
GRADIO_SPACE=nawodyaishan/ar-fashion-tryon
HF_TOKEN=hf_your_token_here  # Optional, for private spaces

# CORS (allow your frontend)
CORS_ALLOW_ORIGINS=http://localhost:3000,https://yourapp.vercel.app

# Optional settings
MAX_CONTENT_MB=16
CLOUDINARY_FOLDER=garments
```

**Start the backend:**

```bash
python app.py
# Should start on http://localhost:5000
```

### 2. Frontend Setup

Update your frontend environment:

```bash
# In web-frontend/.env.local

# Point to your FastAPI backend (includes virtual try-on)
NEXT_PUBLIC_GARMENT_API_BASE=http://localhost:5000

# Cloudinary (optional, for garment extraction)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=ar_fashion_unsigned

# Legacy Gradio (no longer needed)
# NEXT_PUBLIC_GRADIO_SPACE=nawodyaishan/ar-fashion-tryon
# NEXT_PUBLIC_HF_TOKEN=hf_xxx
```

**Start the frontend:**

```bash
pnpm dev
# Should start on http://localhost:3000
```

### 3. Test the Integration

1. Go to http://localhost:3000/try-on
2. Switch to **"Photo Try-On (HD)"** tab
3. Upload a body photo (BODY step)
4. Upload a garment image (GARMENT step)
    - Garment will be automatically extracted
5. Click **"Generate Try-On"** (GENERATE step)
6. View result (RESULT step)

**Expected console output:**

```
🎨 Starting virtual try-on via FastAPI...
🚀 Virtual Try-On Request: {
  endpoint: '/virtual_tryon',
  person_image: 'person.jpg',
  garment_image: 'tshirt.png',
  cloth_type: 'upper',
  process_garment: false
}
✅ Virtual Try-On Success: {
  duration: '45.23s',
  result_url: 'https://res.cloudinary.com/.../tryon_abc123.png'
}
```

## How It Works

### Complete Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Virtual Try-On Workflow                       │
└─────────────────────────────────────────────────────────────────┘

1. User uploads body + garment images
   ↓
2. Frontend calls /virtual_tryon endpoint
   ↓
3. FastAPI uploads images to Cloudinary
   ↓
4. FastAPI optionally processes garment (classify + cutout)
   ↓
5. FastAPI calls Gradio Space API
   ├─ Retry #1 (immediate)
   ├─ Retry #2 (2s delay)
   └─ Retry #3 (4s delay)
   ↓
6. FastAPI downloads result from Gradio
   ↓
7. FastAPI uploads result to Cloudinary
   ↓
8. Frontend displays result from Cloudinary URL
```

### API Endpoints Used

**Frontend → FastAPI:**

- `POST /virtual_tryon` - Complete try-on workflow

**FastAPI → Cloudinary:**

- Upload person image
- Upload garment image
- Upload cutout image (if processed)
- Upload result image

**FastAPI → Gradio:**

- `POST /submit_function` - Virtual try-on inference

## Code Changes

### 1. New API Service Function

**File:** `lib/services/vtonApi.ts`

```typescript
export async function virtualTryOn(
    payload: ProcessImagesPayload,
    processGarment: boolean = true,
    signal?: AbortSignal,
): Promise<VirtualTryonResponse>
```

### 2. Updated Store

**File:** `lib/store/useVtonStore.ts`

```typescript
// Before (direct Gradio)
import {processWithGradio} from '@/lib/services/gradioApi';

const resultDataUrl = await processWithGradio(...);

// After (FastAPI)
import {virtualTryOn} from '@/lib/services/vtonApi';

const response = await virtualTryOn(...);
const resultUrl = response.result_url; // Cloudinary URL
```

### 3. New Types

**File:** `lib/types.ts`

```typescript
export interface VirtualTryonResponse {
    success: boolean;
    person_url: string;
    garment_url: string;
    cutout_url?: string;
    result_url: string;
    result_public_id: string;
    cloth_type: ClothType;
    parameters: {
        num_inference_steps: number;
        guidance_scale: number;
        seed: number;
        show_type: string;
    };
    garment_classification?: {
        label: string;
        confidence: number;
    };
}
```

### 4. New HTTP Client

**File:** `lib/services/http.ts`

```typescript
// Legacy VTON API (deprecated)
export const http = axios.create({
    baseURL: process.env.NEXT_PUBLIC_VTON_API_BASE || 'http://127.0.0.1:8000',
    timeout: 60_000,
});

// Garment API with Gradio (recommended)
export const garmentHttp = axios.create({
    baseURL: process.env.NEXT_PUBLIC_GARMENT_API_BASE || 'http://127.0.0.1:5000',
    timeout: 120_000, // 2 minutes for Gradio
});
```

## Benefits

### 1. Automatic Retry Logic

**Before:**

```typescript
// Manual retry required
try {
    return await processWithGradio(...);
} catch (err) {
    // Retry manually or show error
}
```

**After:**

```typescript
// Automatic 3 retries with exponential backoff
const response = await virtualTryOn(...);
// Backend handles retries: immediate, 2s, 4s delays
```

### 2. Cloudinary Storage

**Before:**

```typescript
// Result as data URL (large base64 string in memory)
const resultDataUrl = await processWithGradio(...);
// "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..." (5+ MB)
```

**After:**

```typescript
// Result as Cloudinary URL (CDN-backed)
const response = await virtualTryOn(...);
console.log(response.result_url);
// "https://res.cloudinary.com/.../tryon_abc123.png"
```

### 3. Garment Classification

**Before:**

```typescript
// No classification metadata
const resultDataUrl = await processWithGradio(...);
```

**After:**

```typescript
// Includes garment classification
const response = await virtualTryOn(...);
console.log(response.garment_classification);
// { label: "TSHIRT", confidence: 0.95 }
```

### 4. Better Error Handling

**Before:**

```typescript
// Generic error messages
catch
(err)
{
    // "Request failed"
}
```

**After:**

```typescript
// Detailed error messages
catch
(err)
{
    // "Virtual try-on failed after 3 attempts: Connection timeout"
    // "Invalid person image. Allowed: png, jpg, jpeg"
    // "Person image too large (>16MB)"
}
```

## Troubleshooting

### Issue: "Unable to connect to AI service"

**Check:**

1. Is FastAPI backend running on port 5000?
   ```bash
   curl http://localhost:5000/health
   ```

2. Is Gradio Space online?
    - Visit: https://huggingface.co/spaces/nawodyaishan/ar-fashion-tryon

3. Are environment variables set?
   ```bash
   echo $GRADIO_SPACE
   echo $HF_TOKEN
   ```

### Issue: "Cloudinary upload failed"

**Check:**

1. Are Cloudinary credentials correct?
   ```bash
   echo $CLOUDINARY_CLOUD_NAME
   echo $CLOUDINARY_API_KEY
   echo $CLOUDINARY_API_SECRET
   ```

2. Test Cloudinary access:
   ```bash
   curl -X POST https://api.cloudinary.com/v1_1/$CLOUDINARY_CLOUD_NAME/image/upload \
     -F "file=@test.jpg" \
     -F "upload_preset=$CLOUDINARY_UPLOAD_PRESET"
   ```

### Issue: "Virtual try-on failed after 3 attempts"

**Check:**

1. Backend logs:
   ```bash
   tail -f backend.log
   ```

2. Gradio Space status:
    - Check if Space is in "Building" state
    - Verify GPU allocation

3. Network connectivity:
   ```bash
   curl -I https://nawodyaishan-ar-fashion-tryon.hf.space
   ```

## Production Deployment

### Backend (Railway/Heroku/Docker)

```bash
# Set environment variables in Railway/Heroku dashboard
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
GRADIO_SPACE=nawodyaishan/ar-fashion-tryon
HF_TOKEN=hf_xxx
CORS_ALLOW_ORIGINS=https://yourapp.vercel.app
```

### Frontend (Vercel/Netlify)

```bash
# Set environment variable in Vercel dashboard
NEXT_PUBLIC_GARMENT_API_BASE=https://garment-api.railway.app

# Optional (for garment extraction)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=ar_fashion_unsigned
```

## Migration Checklist

- [x] FastAPI backend running with `/virtual_tryon` endpoint
- [x] Cloudinary credentials configured
- [x] Gradio Space configured (GRADIO_SPACE, HF_TOKEN)
- [x] Frontend environment updated (GARMENT_API_BASE)
- [x] Frontend code updated to use `virtualTryOn()`
- [x] CORS configured for your domain
- [x] Test complete workflow end-to-end
- [x] Monitor logs for errors
- [x] Deploy to production

## Next Steps

1. ✅ Test locally with both body and garment images
2. ✅ Monitor console logs for any errors
3. ✅ Verify images appear in Cloudinary dashboard
4. ✅ Test with different garment types (upper/lower/overall)
5. ✅ Deploy to production
6. ✅ Update production environment variables
7. ✅ Test production deployment

## Related Documentation

- [FastAPI Gradio Integration (Complete)](FASTAPI_GRADIO_INTEGRATION.md)
- [Cloudinary Setup](CLOUDINARY_SETUP.md)
- [Garment Extraction](GARMENT_EXTRACTION_COMPLETE.md)

## Summary

✅ **Drop-in replacement** for direct Gradio client
✅ **Better reliability** with automatic retries
✅ **CDN storage** for all images
✅ **Detailed logging** for debugging
✅ **Production ready** with proper error handling

The FastAPI Gradio integration is now active! 🚀
