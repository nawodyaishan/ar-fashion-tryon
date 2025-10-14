# Garment Extraction Integration - Complete Guide

This document provides a comprehensive overview of the garment extraction system, including both direct upload and
Cloudinary-first pipelines.

## Overview

The AR Fashion Try-On app uses a sophisticated garment extraction pipeline that:

1. **Classifies** garment type (T-shirt, Trousers, etc.) using ML
2. **Removes background** using rembg or similar technology
3. **Prepares** the extracted garment for virtual try-on

The system now supports **two pipeline modes** with automatic fallback:

### Pipeline Modes

| Mode              | When Used                               | Performance    | Recommended For |
|-------------------|-----------------------------------------|----------------|-----------------|
| **Cloudinary**    | When Cloudinary env vars are set        | ⚡ Faster (CDN) | Production      |
| **Direct Upload** | Fallback when Cloudinary not configured | 🐢 Slower      | Development     |

## Architecture

### Option 1: Cloudinary Pipeline (Production Recommended)

```
┌─────────┐     ┌─────────────┐     ┌──────────┐     ┌─────────┐
│ Browser │────▶│  Cloudinary │────▶│  Backend │────▶│ Browser │
└─────────┘     └─────────────┘     └──────────┘     └─────────┘
     │                 │                   │               │
     │  Upload file    │                   │               │
     │ ──────────────▶ │                   │               │
     │                 │                   │               │
     │  secure_url     │                   │               │
     │ ◀────────────── │                   │               │
     │                 │                   │               │
     │  POST /classify_garment_by_url     │               │
     │ ──────────────────────────────────▶│               │
     │                 │                   │               │
     │                 │  Fetch from CDN   │               │
     │                 │ ◀─────────────────│               │
     │                 │                   │               │
     │                 │  Process + Save   │               │
     │                 │                   │               │
     │  { cutout_url, label, confidence } │               │
     │ ◀──────────────────────────────────│               │
     │                 │                   │               │
     │  Download cutout                    │               │
     │ ───────────────────────────────────────────────────▶│
```

**Benefits:**

- ✅ Faster uploads (CDN network)
- ✅ No CORS issues
- ✅ Reduced backend bandwidth
- ✅ Global CDN caching

### Option 2: Direct Upload (Fallback)

```
┌─────────┐                      ┌──────────┐                ┌─────────┐
│ Browser │─────────────────────▶│  Backend │───────────────▶│ Browser │
└─────────┘                      └──────────┘                └─────────┘
     │                                  │                          │
     │  POST /classify_garment          │                          │
     │  (FormData with image file)      │                          │
     │ ────────────────────────────────▶│                          │
     │                                  │                          │
     │                                  │  Process + Save          │
     │                                  │                          │
     │  { cutout_url, label, ... }      │                          │
     │ ◀────────────────────────────────│                          │
     │                                  │                          │
     │  Download cutout                 │                          │
     │ ─────────────────────────────────────────────────────────▶│
```

**Benefits:**

- ✅ Simple setup (no external dependencies)
- ✅ Works immediately (no config needed)
- ✅ Good for local development

## API Reference

### Frontend API (`lib/services/garmentApi.ts`)

#### 1. `extractGarmentSmart()` - Recommended 🌟

Smart wrapper that automatically chooses the best pipeline.

```typescript
async function extractGarmentSmart(
    file: File,
    signal?: AbortSignal,
    forceMethod?: 'cloudinary' | 'direct'
): Promise<{
    result: GarmentProcessResponse;
    extractedFile: File | null;
    cloudinaryUrl?: string;
    method: 'cloudinary' | 'direct';
}>
```

**Usage:**

```typescript
// Automatic selection (recommended)
const {result, extractedFile, method} = await extractGarmentSmart(file);

// Force Cloudinary
const {result, extractedFile} = await extractGarmentSmart(file, signal, 'cloudinary');

// Force direct upload
const {result, extractedFile} = await extractGarmentSmart(file, signal, 'direct');
```

**Console Output:**

- Cloudinary: `🌩️ Using Cloudinary pipeline (production mode)`
- Direct: `📤 Using direct upload pipeline (fallback mode)`

## Quick Start

### 1. Basic Setup (Direct Upload)

Works out of the box, no configuration needed:

```bash
# Start backend
cd ../image-extraction-backend
python app.py

# Start frontend
cd web-frontend
pnpm dev
```

Your app will use direct upload mode automatically.

### 2. Production Setup (Cloudinary)

For better performance, add Cloudinary:

1. **Get Cloudinary credentials** (see [CLOUDINARY_SETUP.md](CLOUDINARY_SETUP.md))

2. **Add to `.env.local`:**
   ```bash
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=ar_fashion_unsigned
   ```

3. **Implement backend endpoint** (see [BACKEND_URL_ENDPOINT.md](BACKEND_URL_ENDPOINT.md))

4. **Restart and test:**
   ```bash
   pnpm dev
   ```

Your app will now use Cloudinary pipeline automatically!

## How It Works

### Automatic Pipeline Selection

The app uses a smart wrapper that automatically detects configuration:

```typescript
// In your components (ARPanel.tsx, useVtonStore.ts)
import {extractGarmentSmart} from '@/lib/services/garmentApi';

// This automatically chooses the best method
const {result, extractedFile, method} = await extractGarmentSmart(file);

console.log(`Used ${method} pipeline`); // "cloudinary" or "direct"
```

**Decision Logic:**

```
If CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET are set:
  → Use Cloudinary pipeline
Else:
  → Use direct upload pipeline
```

### Pipeline Components

Both pipelines use the same core components:

1. **Classification API** (`/classify_garment` or `/classify_garment_by_url`)
    - Determines garment type (TSHIRT, TROUSERS, etc.)
    - Returns confidence score (0.0 to 1.0)

2. **Background Removal**
    - Removes background using rembg/u2net
    - Returns transparent PNG cutout

3. **File Download**
    - Downloads extracted cutout as Blob
    - Converts to File object for VTON

## UI Integration

### Current Implementation

Both AR mode and Photo mode use the smart pipeline:

#### AR Panel (components/tryon/ARPanel.tsx)

```typescript
const handleFileUpload = async (file: File) => {
    const {result, extractedFile, method, cloudinaryUrl} =
        await extractGarmentSmart(file);

    // Store garment with metadata
    const newGarment = {
        id: `custom-${Date.now()}`,
        src: extractedSrc,
        cloudinaryUrl: cloudinaryUrl,  // Available if Cloudinary was used
        classification: result.classification,
        // ... other props
    };
};
```

#### Photo Wizard (lib/store/useVtonStore.ts)

```typescript
const setGarmentFile = async (file: File) => {
    const {result, extractedFile, method} = await extractGarmentSmart(file);

    if (result.success && extractedFile) {
        set({
            garment: {
                file: extractedFile,
                extracted: true,
                extractionResult: result,
            },
            status: 'valid',
        });
    }
};
```

### User Experience

**With Cloudinary:**

- Toast: `🌩️ Garment extracted via Cloudinary: TSHIRT (95% confidence)`
- Console: `🌩️ Using Cloudinary pipeline (production mode)`

**Without Cloudinary:**

- Toast: `📤 Garment extracted direct upload: TSHIRT (95% confidence)`
- Console: `📤 Using direct upload pipeline (fallback mode)`

## Configuration

### Environment Variables

```bash
# Required: Garment extraction backend
NEXT_PUBLIC_GARMENT_API_BASE=http://localhost:5000

# Optional: Cloudinary (for production)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=ar_fashion_unsigned
```

### Backend Requirements

#### Required Endpoint: `/classify_garment`

- Accepts `multipart/form-data`
- Field name: `garment`
- Returns classification + cutout URL

#### Optional Endpoint: `/classify_garment_by_url`

- Required for Cloudinary pipeline
- Accepts JSON with `source_url`
- Backend fetches from URL and processes

## Performance Comparison

### Direct Upload

```
Upload (10MB → Backend):     2-5s
Processing:                  3-8s
Download (cutout):           1-2s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total:                       6-15s
```

### Cloudinary Pipeline

```
Upload (10MB → Cloudinary):  1-3s   ← CDN
Backend fetch (CDN):         0.5-1s ← Fast
Processing:                  3-8s   ← Same
Download (cutout):           0.5-1s ← From cache
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total:                       5-13s + Better reliability
```

## Troubleshooting

### Issue: Using direct upload instead of Cloudinary

**Symptoms:**

- Console shows: `📤 Using direct upload pipeline (fallback mode)`
- Toast says "direct upload" instead of "via Cloudinary"

**Solution:**

1. Check `.env.local` has both Cloudinary variables
2. Verify variable names (must start with `NEXT_PUBLIC_`)
3. Restart dev server: `pnpm dev`
4. Check browser console for config errors

### Issue: Backend endpoint not found

**Symptoms:**

- Error: `POST /classify_garment_by_url 404`

**Solution:**

1. Verify backend has the endpoint implemented
2. Check backend is running on correct port
3. Test endpoint directly with cURL

### Issue: CORS errors

**Symptoms:**

- "CORS policy blocked" errors in console

**Solution:**

- With Cloudinary: Should NOT happen (proper CORS)
- With direct upload: Check backend CORS config
- See [CORS_FIX.md](CORS_FIX.md) for details

## Testing

### Test Cloudinary Configuration

```bash
# In browser console
console.log({
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  preset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
});
```

### Test Backend Endpoints

```bash
# Test direct upload
curl -X POST http://localhost:5000/classify_garment \
  -F "garment=@test.jpg"

# Test URL-based (Cloudinary)
curl -X POST http://localhost:5000/classify_garment_by_url \
  -H "Content-Type: application/json" \
  -d '{"source_url": "https://res.cloudinary.com/demo/image/upload/sample.jpg"}'
```

### Test Frontend Integration

1. Upload a garment in AR mode or Photo mode
2. Check browser console for pipeline logs
3. Verify toast message shows correct method
4. Check Network tab for API calls

## Migration Guide

### Upgrading to Cloudinary

No code changes needed! Just add configuration:

1. Add Cloudinary env vars to `.env.local`
2. Implement `/classify_garment_by_url` endpoint
3. Restart dev server
4. Test with new upload

### Downgrading to Direct Upload

Remove or comment out Cloudinary env vars:

```bash
# NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
# NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
```

App automatically falls back to direct upload.

## Related Documentation

- **[CLOUDINARY_SETUP.md](CLOUDINARY_SETUP.md)** - Complete Cloudinary setup guide
- **[BACKEND_URL_ENDPOINT.md](BACKEND_URL_ENDPOINT.md)** - Backend implementation
- **[CORS_FIX.md](CORS_FIX.md)** - CORS troubleshooting
- **[GRADIO_INTEGRATION.md](GRADIO_INTEGRATION.md)** - Virtual try-on API

## Summary

✅ **Smart Selection**: Auto-detects best pipeline
✅ **Zero Config**: Works out of the box with direct upload
✅ **Production Ready**: Cloudinary for better performance
✅ **Backward Compatible**: No breaking changes
✅ **Type Safe**: Full TypeScript coverage
✅ **Well Logged**: Detailed console debugging
✅ **Error Resilient**: Graceful fallbacks and error handling

---

**Quick Links:**

- Setup: [CLOUDINARY_SETUP.md](CLOUDINARY_SETUP.md)
- Backend: [BACKEND_URL_ENDPOINT.md](BACKEND_URL_ENDPOINT.md)
- API: [lib/services/garmentApi.ts](../lib/services/garmentApi.ts)
