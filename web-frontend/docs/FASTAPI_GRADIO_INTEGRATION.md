# FastAPI Gradio Integration

This document explains the new unified backend architecture that replaces direct Gradio client calls with a FastAPI
proxy that integrates Gradio, providing better control, retry logic, and Cloudinary storage.

## Overview

The virtual try-on system now uses a **FastAPI backend that wraps Gradio API**, providing:

✅ **Unified Backend** - Single endpoint for the complete workflow
✅ **Automatic Retry Logic** - Handles transient failures
✅ **Cloudinary Storage** - All images stored in CDN
✅ **Garment Processing** - Optional classification + background removal
✅ **Better Error Handling** - Detailed error messages
✅ **Request Tracking** - Consistent logging and monitoring

## Architecture

### Before (Direct Gradio Client)

```
┌─────────┐           ┌─────────────────┐
│ Browser │──────────▶│  Gradio Space   │
└─────────┘           │  (HuggingFace)  │
                      └─────────────────┘
```

**Issues:**

- ❌ No retry logic
- ❌ No centralized storage
- ❌ Limited error handling
- ❌ Client-side timeout management

### After (FastAPI Proxy)

```
┌─────────┐    ┌────────────┐    ┌─────────────┐    ┌─────────────────┐
│ Browser │───▶│   FastAPI  │───▶│ Cloudinary  │◀───│  Gradio Space   │
└─────────┘    │   Backend  │    └─────────────┘    │  (HuggingFace)  │
               └────────────┘                        └─────────────────┘
                     │
                     ▼
            ┌─────────────────┐
            │  Classification │
            │  (TensorFlow)   │
            └─────────────────┘
```

**Benefits:**

- ✅ Automatic retry (3 attempts with exponential backoff)
- ✅ All images stored in Cloudinary CDN
- ✅ Comprehensive error handling
- ✅ Server-side timeout management
- ✅ Garment classification metadata

## FastAPI Endpoint

### POST `/virtual_tryon`

Complete virtual try-on workflow with optional garment processing.

#### Request (multipart/form-data)

```typescript
{
    person_image: File,        // Required: Body photo
        garment_image
:
    File,       // Required: Garment photo
        cloth_type
:
    string,        // "upper" | "lower" | "overall"
        num_inference_steps
:
    number, // 20-100, default: 50
        guidance_scale
:
    number,    // 1.0-10.0, default: 2.5
        seed
:
    number,              // -1 to 999, default: 42
        show_type
:
    string,         // "result only" | "input & result" | "input & mask & result"
        process_garment
:
    boolean   // true = classify + cutout, false = use as-is
}
```

#### Response (application/json)

```json
{
  "success": true,
  "person_url": "https://res.cloudinary.com/.../person_abc123.jpg",
  "garment_url": "https://res.cloudinary.com/.../garment_abc123.jpg",
  "cutout_url": "https://res.cloudinary.com/.../cutout_abc123.png",
  "result_url": "https://res.cloudinary.com/.../tryon_abc123.png",
  "result_public_id": "garments/tryon_results/tryon_abc123",
  "cloth_type": "upper",
  "parameters": {
    "num_inference_steps": 50,
    "guidance_scale": 2.5,
    "seed": 42,
    "show_type": "result only"
  },
  "garment_classification": {
    "label": "TSHIRT",
    "confidence": 0.95
  }
}
```

## Frontend Integration

### API Service (`lib/services/vtonApi.ts`)

```typescript
import {garmentHttp} from './http';
import type {VirtualTryonResponse} from '@/lib/types';

export async function virtualTryOn(
    payload: ProcessImagesPayload,
    processGarment: boolean = true,
    signal?: AbortSignal,
): Promise<VirtualTryonResponse> {
    const fd = new FormData();

    // Add images
    fd.append('person_image', payload.bodyFile);
    fd.append('garment_image', payload.garmentFile);

    // Add parameters
    fd.append('cloth_type', payload.clothType || 'upper');
    fd.append('num_inference_steps', (payload.options?.numInferenceSteps ?? 50).toString());
    fd.append('guidance_scale', (payload.options?.guidanceScale ?? 2.5).toString());
    fd.append('seed', (payload.options?.seed ?? 42).toString());
    fd.append('process_garment', processGarment.toString());

    // Call endpoint
    const {data} = await garmentHttp.post<VirtualTryonResponse>(
        '/virtual_tryon',
        fd,
        {signal}
    );

    return data;
}
```

### Store Integration (`lib/store/useVtonStore.ts`)

```typescript
import {virtualTryOn} from '@/lib/services/vtonApi';

const tryOn = async () => {
    const {body, garment, options} = get();

    // Call unified endpoint
    const response = await virtualTryOn(
        {
            bodyFile: body.file,
            garmentFile: garment.extractedFile || garment.file,
            clothType: options.clothType || 'upper',
            options: {
                numInferenceSteps: options.numInferenceSteps ?? 50,
                guidanceScale: options.guidanceScale ?? 2.5,
                seed: options.seed ?? 42,
            },
        },
        false, // process_garment = false (already extracted)
    );

    // Use Cloudinary URL
    set({
        status: 'done',
        resultUrl: response.result_url,
        step: 'RESULT'
    });
};
```

## Backend Implementation

### Key Features

#### 1. Gradio Client Singleton

```python
gradio_client: Optional[Client] = None

async def get_gradio_client() -> Client:
    global gradio_client
    if gradio_client is None:
        gradio_client = await asyncio.to_thread(
            Client,
            GRADIO_SPACE,
            hf_token=HF_TOKEN
        )
    return gradio_client

@app.on_event("startup")
async def startup_load():
    await get_gradio_client()  # Pre-connect
```

#### 2. Retry Logic with Exponential Backoff

```python
async def _call_gradio_api(
    person_img_path: str,
    cloth_img_path: str,
    cloth_type: str,
    # ... other params
    max_retries: int = 3
) -> bytes:
    client = await get_gradio_client()

    for attempt in range(max_retries):
        try:
            result = await asyncio.to_thread(
                client.predict,
                person_image={
                    "background": handle_file(person_img_path),
                    "layers": [],
                    "composite": None
                },
                cloth_image=handle_file(cloth_img_path),
                # ... other params
                api_name="/submit_function"
            )
            return await _download_gradio_result(result)

        except Exception as e:
            if attempt == max_retries - 1:
                raise
            wait_time = 2 ** attempt
            await asyncio.sleep(wait_time)
```

#### 3. Cloudinary Integration

```python
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True,
)

# Upload to Cloudinary
def _cloudinary_upload_bytes(
    data: bytes,
    public_id: str,
    folder: str
) -> dict:
    return cloudinary.uploader.upload(
        io.BytesIO(data),
        folder=folder,
        public_id=public_id,
        resource_type="image",
        overwrite=True,
    )
```

#### 4. Complete Workflow

```python
@app.post("/virtual_tryon")
async def virtual_tryon(
    person_image: UploadFile,
    garment_image: UploadFile,
    cloth_type: str = "upper",
    # ... other params
    process_garment: bool = True
):
    # 1. Upload person to Cloudinary
    person_upload = await run_in_threadpool(
        _cloudinary_upload_bytes,
        person_body,
        f"person_{token}",
        FOLDER_ORIG
    )

    # 2. Optionally process garment
    if process_garment:
        label, conf = await run_in_threadpool(_run_classifier, garment_path)
        cutout = await run_in_threadpool(_cutout_from_path, garment_path)
        cutout_upload = await run_in_threadpool(
            _cloudinary_upload_bytes,
            cutout_bytes,
            f"cutout_{token}",
            FOLDER_CUT
        )

    # 3. Call Gradio API
    result_bytes = await _call_gradio_api(
        person_tmp_path,
        garment_tmp_path,
        cloth_type,
        num_inference_steps,
        guidance_scale,
        seed,
        show_type
    )

    # 4. Upload result to Cloudinary
    result_upload = await run_in_threadpool(
        _cloudinary_upload_bytes,
        result_bytes,
        f"tryon_{token}",
        FOLDER_TRYON
    )

    return {
        "success": True,
        "person_url": person_upload["secure_url"],
        "garment_url": garment_upload["secure_url"],
        "cutout_url": cutout_upload["secure_url"],
        "result_url": result_upload["secure_url"],
        # ... metadata
    }
```

## Environment Configuration

### Frontend (.env.local)

```bash
# Garment API Base (includes virtual try-on)
NEXT_PUBLIC_GARMENT_API_BASE=http://localhost:5000

# For production:
# NEXT_PUBLIC_GARMENT_API_BASE=https://garment-api.railway.app

# Legacy Gradio (deprecated)
# NEXT_PUBLIC_GRADIO_SPACE=nawodyaishan/ar-fashion-tryon
# NEXT_PUBLIC_HF_TOKEN=hf_xxx
```

### Backend (Railway/Docker)

```bash
# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz

# Gradio
GRADIO_SPACE=nawodyaishan/ar-fashion-tryon
HF_TOKEN=hf_xxx  # Optional, for private spaces

# CORS
CORS_ALLOW_ORIGINS=https://yourapp.vercel.app,https://www.yourdomain.com

# Optional
MAX_CONTENT_MB=16
CLOUDINARY_FOLDER=garments
```

## Error Handling

### Frontend Error Cases

```typescript
try {
    const response = await virtualTryOn(payload);
    set({resultUrl: response.result_url, status: 'done'});
} catch (err) {
    const error = err as Error;
    let msg = error.message || 'Processing failed';

    // Handle specific errors
    if (/exceeded.*gpu.*quota/i.test(msg)) {
        msg = 'Daily GPU quota reached. Please retry later.';
    }

    set({status: 'error', error: msg});
}
```

### Backend Error Responses

```python
# HTTP 400: Bad Request
{
  "detail": "Invalid person image. Allowed: png, jpg, jpeg"
}

# HTTP 413: Payload Too Large
{
  "detail": "Person image too large (>16MB)"
}

# HTTP 500: Server Error
{
  "detail": "Virtual try-on failed after 3 attempts: Connection timeout"
}

# HTTP 503: Service Unavailable
{
  "detail": "Unable to connect to AI service: Space is starting"
}
```

## Performance Optimizations

### 1. Client Pre-Connection

```python
@app.on_event("startup")
async def startup_load():
    # Load models
    await run_in_threadpool(_load_model_and_config)

    # Pre-connect to Gradio
    try:
        await get_gradio_client()
    except Exception:
        pass  # Will retry on first request
```

### 2. Concurrent Processing

```python
# Run classification and cutout in parallel
label, conf = await run_in_threadpool(_run_classifier, garment_path)
cutout = await run_in_threadpool(_cutout_from_path, garment_path)
```

### 3. Streaming Downloads

```python
def _download_url_bytes(url: str, max_bytes: int) -> bytes:
    r = requests.get(url, stream=True, timeout=20)
    for chunk in r.iter_content(1024 * 64):
        # Stream in 64KB chunks
        if total > max_bytes:
            raise ValueError("File too large")
```

## Testing

### Test Virtual Try-On Endpoint

```bash
curl -X POST "http://localhost:5000/virtual_tryon" \
  -F "person_image=@person.jpg" \
  -F "garment_image=@tshirt.png" \
  -F "cloth_type=upper" \
  -F "num_inference_steps=50" \
  -F "guidance_scale=2.5" \
  -F "seed=42" \
  -F "process_garment=false"
```

### Test with Frontend

```bash
# Start backend
cd image-extraction-backend
python app.py  # Port 5000

# Start frontend
cd web-frontend
pnpm dev  # Port 3000

# Test in browser
# 1. Go to http://localhost:3000/try-on
# 2. Switch to "Photo Try-On (HD)" tab
# 3. Upload body and garment images
# 4. Click "Generate Try-On"
```

## Monitoring & Logging

### Frontend Console Output

```
🚀 Virtual Try-On Request: {
  endpoint: '/virtual_tryon',
  person_image: 'person.jpg',
  garment_image: 'tshirt.png',
  cloth_type: 'upper',
  num_inference_steps: 50,
  guidance_scale: 2.5,
  seed: 42,
  process_garment: false
}

✅ Virtual Try-On Success: {
  duration: '45.23s',
  result_url: 'https://res.cloudinary.com/.../tryon_abc123.png',
  cloth_type: 'upper',
  garment_classification: { label: 'TSHIRT', confidence: 0.95 }
}
```

### Backend Logs

```
✅ Person image uploaded: https://res.cloudinary.com/.../person_abc123.jpg
🔄 Processing garment (classify + background removal)...
📊 Garment classified: TSHIRT (95.00%)
✅ Garment cutout created: https://res.cloudinary.com/.../cutout_abc123.png
🚀 Attempt 1: Calling Gradio API
   Parameters: type=upper, steps=50, guidance=2.5, seed=42
✅ Gradio API success
✅ Try-on result uploaded: https://res.cloudinary.com/.../tryon_abc123.png
```

## Migration Guide

### Migrating from Direct Gradio Client

**Before:**

```typescript
import {processWithGradio} from '@/lib/services/gradioApi';

const resultDataUrl = await processWithGradio(
    bodyFile,
    garmentFile,
    'upper',
    50,
    2.5,
    42,
    {token: HF_TOKEN}
);
```

**After:**

```typescript
import {virtualTryOn} from '@/lib/services/vtonApi';

const response = await virtualTryOn({
    bodyFile,
    garmentFile,
    clothType: 'upper',
    options: {
        numInferenceSteps: 50,
        guidanceScale: 2.5,
        seed: 42
    }
});

const resultUrl = response.result_url; // Cloudinary URL
```

### Benefits of Migration

✅ **Automatic retries** - No more manual retry logic
✅ **CDN storage** - Results stored in Cloudinary
✅ **Better errors** - Detailed error messages
✅ **Metadata** - Garment classification included
✅ **Monitoring** - Centralized logging

## Troubleshooting

### Issue: "Unable to connect to AI service"

**Cause:** Gradio Space is offline or starting

**Solution:**

1. Check Space status: https://huggingface.co/spaces/{GRADIO_SPACE}
2. Wait for Space to start (automatic retry after 2s, 4s, 8s)
3. Verify HF_TOKEN if using private Space

### Issue: "Virtual try-on failed after 3 attempts"

**Cause:** Gradio API timeout or error

**Solution:**

1. Check backend logs for detailed error
2. Verify image formats (PNG/JPEG only)
3. Check file sizes (max 16MB)
4. Verify Gradio Space is running

### Issue: "Cloudinary upload failed"

**Cause:** Invalid Cloudinary credentials

**Solution:**

1. Verify environment variables:
    - `CLOUDINARY_CLOUD_NAME`
    - `CLOUDINARY_API_KEY`
    - `CLOUDINARY_API_SECRET`
2. Check Cloudinary dashboard for errors
3. Verify folder permissions

## Related Documentation

- [Garment Extraction Integration](GARMENT_EXTRACTION_INTEGRATION.md)
- [Cloudinary Setup](CLOUDINARY_SETUP.md)
- [Backend URL Endpoint](BACKEND_URL_ENDPOINT.md)
- [Gradio Integration (Legacy)](GRADIO_INTEGRATION.md)

## Summary

✅ **Unified Backend** - FastAPI wraps Gradio + Cloudinary
✅ **Automatic Retry** - 3 attempts with exponential backoff
✅ **CDN Storage** - All images in Cloudinary
✅ **Better UX** - Detailed errors and progress tracking
✅ **Production Ready** - CORS, timeouts, monitoring
✅ **Easy Migration** - Drop-in replacement for direct Gradio

The FastAPI Gradio integration provides a robust, scalable solution for virtual try-on with enterprise-grade
reliability! 🚀
