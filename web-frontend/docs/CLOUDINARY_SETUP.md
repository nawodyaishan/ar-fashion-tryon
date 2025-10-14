# Cloudinary Integration Setup Guide

This guide walks you through setting up Cloudinary for the AR Fashion Try-On garment extraction pipeline.

## Why Cloudinary?

The Cloudinary-first approach offers several benefits over direct backend uploads:

✅ **Better Performance**

- CDN-backed image delivery (faster downloads)
- Distributed global network
- Optimized image serving

✅ **Reduced Server Load**

- No large file uploads to backend
- Backend only fetches from Cloudinary URLs
- Reduced bandwidth costs

✅ **No CORS Issues**

- Cloudinary has proper CORS configuration
- No preflight request complications
- Browser-friendly direct uploads

✅ **Scalability**

- CDN handles traffic spikes
- Backend processing remains lightweight
- Better horizontal scaling

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Cloudinary Pipeline                         │
└─────────────────────────────────────────────────────────────────┘

1. Browser → Cloudinary API
   ├─ User selects garment image
   ├─ uploadToCloudinary(file)
   └─ Returns: secure_url (e.g., https://res.cloudinary.com/.../garment.jpg)

2. Browser → Backend API
   ├─ extractGarmentByUrl(secure_url)
   ├─ POST /classify_garment_by_url
   └─ Body: { source_url: "https://res.cloudinary.com/..." }

3. Backend → Cloudinary
   ├─ Fetch image from Cloudinary URL
   ├─ Process: Classification + Background Removal
   └─ Save cutout to backend storage

4. Backend → Browser
   ├─ Response: { label, confidence, cutout_url, ... }
   └─ Browser downloads cutout for display/VTON

5. Browser displays result
   └─ Extracted garment ready for virtual try-on
```

## Prerequisites

- Cloudinary account (free tier available)
- Backend endpoint `/classify_garment_by_url` implemented

## Step 1: Create Cloudinary Account

1. Go to [Cloudinary Sign Up](https://cloudinary.com/users/register/free)
2. Sign up with email or GitHub/Google
3. Verify your email address
4. Log in to your [Cloudinary Console](https://console.cloudinary.com/)

## Step 2: Get Your Cloud Name

1. In the Cloudinary Dashboard, you'll see:
   ```
   Cloud name: your-cloud-name
   API Key: 123456789012345
   API Secret: abcdefghijklmnopqrstuvwxyz123456
   ```

2. Copy your **Cloud name** (you'll need this for `.env.local`)

## Step 3: Create Unsigned Upload Preset

**Why unsigned?** Browser-based uploads need to be "unsigned" (no authentication required) for security. This prevents
exposing your API secret in client-side code.

### Option A: Via Console UI (Recommended)

1. Go to **Settings** → **Upload** → **Upload presets**
    - Direct link: https://console.cloudinary.com/settings/upload

2. Click **Add upload preset**

3. Configure the preset:
   ```
   Upload preset name: ar_fashion_unsigned
   Signing Mode: Unsigned ✅ (IMPORTANT!)
   Folder: garments/originals

   Asset & Delivery settings:
   - Resource type: Image
   - Access mode: Public
   - Unique filename: ✅ (recommended)
   - Overwrite: ❌ (recommended)

   Upload manipulations (optional):
   - Max file size: 10 MB
   - Allowed formats: jpg, png, webp
   ```

4. Click **Save**

5. Copy the **Upload preset name** (e.g., `ar_fashion_unsigned`)

### Option B: Via API (Advanced)

```bash
curl -X POST \
  https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/upload_presets \
  -H "Content-Type: application/json" \
  -u "API_KEY:API_SECRET" \
  -d '{
    "name": "ar_fashion_unsigned",
    "unsigned": true,
    "folder": "garments/originals"
  }'
```

## Step 4: Configure Environment Variables

1. Open or create `.env.local` in your `web-frontend` directory

2. Add the following variables:

```bash
# ==============================================================================
# Cloudinary Configuration
# ==============================================================================

# Your Cloudinary cloud name (from Step 2)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name

# Your unsigned upload preset name (from Step 3)
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=ar_fashion_unsigned
```

**Example:**

```bash
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=demo-cloud
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=ar_fashion_unsigned
```

3. Restart your development server:

```bash
pnpm dev
```

## Step 5: Implement Backend Endpoint

Your FastAPI backend needs to support URL-based processing. See [BACKEND_URL_ENDPOINT.md](BACKEND_URL_ENDPOINT.md) for
complete implementation guide.

**Quick implementation:**

```python
# app/main.py or app/routers/garment.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl
import requests
from io import BytesIO
from PIL import Image

router = APIRouter()

class GarmentUrlRequest(BaseModel):
    source_url: HttpUrl

@router.post("/classify_garment_by_url")
async def classify_garment_by_url(request: GarmentUrlRequest):
    try:
        # 1. Fetch image from Cloudinary URL
        response = requests.get(str(request.source_url), timeout=30)
        response.raise_for_status()

        # 2. Load image
        image = Image.open(BytesIO(response.content))

        # 3. Process image (your existing logic)
        label, confidence = classify_garment(image)
        cutout_image = remove_background(image)

        # 4. Save and return
        # ... save cutout to static/outputs/

        return {
            "label": label,
            "confidence": confidence,
            "garment_url": garment_url,
            "cutout_url": cutout_url,
            "cutout_path": cutout_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## Step 6: Test the Integration

### Test 1: Check Configuration

```bash
# Start your dev server
cd web-frontend
pnpm dev
```

Open browser console and check:

```javascript
// Should log: "🌩️ Using Cloudinary pipeline (production mode)"
// If you see: "📤 Using direct upload pipeline (fallback mode)"
// → Cloudinary is NOT configured (check .env.local)
```

### Test 2: Upload a Garment

1. Go to http://localhost:3000/try-on
2. Click **Upload Custom** (AR mode) or **Upload Garment** (Photo mode)
3. Select a garment image
4. Check browser console for:

```
☁️ Uploading to Cloudinary: { fileName: 'tshirt.jpg', folder: 'garments/originals' }
✅ Cloudinary upload success: { url: 'https://res.cloudinary.com/...', publicId: '...', uploadTime: '1234ms' }
🔗 Processing garment by URL: https://res.cloudinary.com/...
✅ URL-based extraction success: { label: 'TSHIRT', confidence: 0.95, totalTime: '2345ms' }
```

5. Check toast notification:
    - ✅ Success: "🌩️ Garment extracted via Cloudinary: TSHIRT (95% confidence)"
    - ❌ Error: Check console for details

### Test 3: Verify Cloudinary Storage

1. Go to [Cloudinary Media Library](https://console.cloudinary.com/console/media_library)
2. Navigate to **garments/originals** folder
3. You should see your uploaded images with:
    - Unique filenames
    - Public URLs
    - Image metadata (dimensions, format, size)

### Test 4: Test Backend Endpoint Directly

```bash
# Test with a public Cloudinary URL
curl -X POST "http://localhost:5000/classify_garment_by_url" \
  -H "Content-Type: application/json" \
  -d '{
    "source_url": "https://res.cloudinary.com/demo/image/upload/sample.jpg"
  }'
```

Expected response:

```json
{
  "label": "TSHIRT",
  "confidence": 0.95,
  "garment_url": "http://localhost:5000/static/uploads/garment_123.jpg",
  "cutout_url": "http://localhost:5000/static/outputs/cutout_123.png",
  "cutout_path": "static/outputs/cutout_123.png"
}
```

## How It Works in Your App

### Automatic Pipeline Selection

The app now uses `extractGarmentSmart()` which automatically chooses:

1. **If Cloudinary is configured** (both env vars set):
    - Uses Cloudinary pipeline
    - Logs: "🌩️ Using Cloudinary pipeline (production mode)"

2. **If Cloudinary is NOT configured**:
    - Falls back to direct upload
    - Logs: "📤 Using direct upload pipeline (fallback mode)"

### Code Example

The UI components automatically use the smart pipeline:

```typescript
// components/tryon/ARPanel.tsx
import {extractGarmentSmart} from '@/lib/services/garmentApi';

const {result, extractedFile, method, cloudinaryUrl} = await extractGarmentSmart(file);

// method will be 'cloudinary' or 'direct'
console.log(`Extraction method: ${method}`);
```

### Manual Pipeline Selection (Advanced)

You can force a specific pipeline:

```typescript
// Force Cloudinary (will error if not configured)
const result = await extractGarmentSmart(file, signal, 'cloudinary');

// Force direct upload (bypasses Cloudinary even if configured)
const result = await extractGarmentSmart(file, signal, 'direct');
```

## Production Deployment

### 1. Update Environment Variables

In your production environment (Vercel, Netlify, etc.), set:

```bash
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-production-cloud
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=ar_fashion_unsigned
```

### 2. Secure Your Upload Preset (Optional)

For production, consider these security measures:

#### A. Restrict Upload Preset

In Cloudinary Console → Upload Presets → Edit preset:

- **Allowed formats**: jpg, png, webp only
- **Max file size**: 10 MB
- **Max image dimensions**: 4096x4096
- **Auto-tagging**: Add tag "ar-fashion-app"

#### B. Domain Whitelist (Enterprise only)

Restrict uploads to your domain:

```json
{
  "unsigned": true,
  "allowed_origins": [
    "https://yourapp.vercel.app"
  ]
}
```

#### C. Rate Limiting

Use Cloudinary's rate limiting to prevent abuse:

- Settings → Security → Rate limits
- Set max uploads per IP per hour

### 3. Backend Production Config

Update your backend `.env`:

```bash
# Production Cloudinary settings
BASE_URL=https://your-backend.railway.app

# Optional: Restrict to Cloudinary URLs only
ALLOWED_IMAGE_DOMAINS=res.cloudinary.com,cloudinary.com
```

### 4. Monitor Usage

Track your Cloudinary usage:

1. Go to [Cloudinary Dashboard](https://console.cloudinary.com/console)
2. Check **Analytics** → **Usage**
3. Monitor:
    - Storage (GB)
    - Transformations
    - Bandwidth
    - API requests

Free tier limits:

- 25 GB storage
- 25 GB bandwidth/month
- 25,000 transformations/month

## Troubleshooting

### Issue 1: "Cloudinary not configured" error

**Symptom:** App uses direct upload instead of Cloudinary

**Causes:**

- Missing environment variables
- Incorrect variable names (must start with `NEXT_PUBLIC_`)
- Dev server not restarted after .env.local changes

**Fix:**

1. Verify `.env.local` has both variables
2. Check variable names (case-sensitive)
3. Restart dev server: `pnpm dev`
4. Check browser console for configuration status

### Issue 2: Upload fails with "Invalid upload preset"

**Symptom:** Cloudinary upload returns 400/401 error

**Causes:**

- Upload preset doesn't exist
- Upload preset is not unsigned
- Cloud name is incorrect

**Fix:**

1. Go to Cloudinary Console → Upload Presets
2. Verify preset exists and is "Unsigned"
3. Check Cloud name matches `.env.local`

### Issue 3: Backend can't fetch from Cloudinary URL

**Symptom:** Backend returns "Failed to fetch image from URL"

**Causes:**

- Backend has no internet access
- Firewall blocking Cloudinary domain
- Invalid URL format

**Fix:**

1. Test backend connectivity:
   ```bash
   curl https://res.cloudinary.com/demo/image/upload/sample.jpg
   ```
2. Check backend logs for detailed error
3. Verify URL is publicly accessible

### Issue 4: Images not appearing in Cloudinary Media Library

**Symptom:** Upload succeeds but images not in dashboard

**Causes:**

- Wrong folder path
- Images in different environment (e.g., sub-account)

**Fix:**

1. Check response `public_id` in browser console
2. Search by public_id in Media Library
3. Verify you're in the correct Cloudinary account

### Issue 5: CORS errors

**Symptom:** "CORS policy blocked" in browser console

**This should NOT happen with Cloudinary** - proper CORS is their default.

**Possible causes:**

- Using wrong Cloudinary API endpoint
- Custom domain misconfiguration
- Browser extension blocking requests

**Fix:**

1. Verify you're using `https://api.cloudinary.com/v1_1/{cloud_name}/image/upload`
2. Disable browser extensions and retry
3. Check Network tab for actual error response

## Advanced Features

### Image Transformations

Cloudinary supports on-the-fly transformations. You can request optimized versions:

```typescript
// In uploadToCloudinary function, add transformations
formData.append('transformation', JSON.stringify([
    {width: 1024, height: 1024, crop: 'limit'},
    {quality: 'auto', fetch_format: 'auto'}
]));
```

Or use URLs directly:

```
https://res.cloudinary.com/demo/image/upload/w_1024,h_1024,c_limit/garment.jpg
```

### Webhooks (Advanced)

Get notifications when uploads complete:

1. Settings → Upload → Notification URL
2. Add your webhook endpoint
3. Receive POST requests with upload metadata

### Backup Strategy

For critical applications:

1. **Store both URLs:**
   ```typescript
   const garment = {
     cloudinaryUrl: uploadResult.secure_url,
     backupUrl: backendResult.cutout_url
   };
   ```

2. **Fallback logic:**
   ```typescript
   try {
     return await fetch(cloudinaryUrl);
   } catch {
     return await fetch(backupUrl);
   }
   ```

## Migration from Direct Upload

If you're currently using direct upload:

1. **No code changes needed!** The app automatically detects Cloudinary config
2. Add Cloudinary env vars to `.env.local`
3. Implement backend `/classify_garment_by_url` endpoint
4. Restart servers
5. Test with a new upload
6. Old garments continue working (stored in backend)

## Performance Comparison

### Direct Upload (Before)

```
Upload (10MB image → Railway):     2-5s
Processing (classification + bg):  3-8s
Download (cutout → browser):       1-2s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total:                             6-15s
```

### Cloudinary Pipeline (After)

```
Upload (10MB image → Cloudinary):  1-3s   ← CDN network
Backend fetch (CDN → Railway):     0.5-1s ← Optimized fetch
Processing (classification + bg):  3-8s   ← Same
Download (cutout → browser):       0.5-1s ← From cache
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total:                             5-13s + Better reliability
```

## Cost Estimation

### Free Tier (Default)

- Storage: 25 GB
- Bandwidth: 25 GB/month
- Transformations: 25,000/month
- **Cost:** $0

**Capacity:**

- ~2,500 garment uploads (avg 10MB each)
- ~25,000 downloads (avg 1MB cutout each)

### Paid Plans

If you exceed free tier:

- **Plus:** $99/month (100 GB storage, 100 GB bandwidth)
- **Advanced:** $249/month (250 GB storage, 250 GB bandwidth)

**Cost calculator:** https://cloudinary.com/pricing

## Related Documentation

- [Cloudinary Upload API](https://cloudinary.com/documentation/upload_images)
- [Unsigned Uploads](https://cloudinary.com/documentation/upload_images#unsigned_upload)
- [Backend URL Endpoint](BACKEND_URL_ENDPOINT.md)
- [CORS Fix](CORS_FIX.md)
- [Garment API Service](../lib/services/garmentApi.ts)

## Support

- **Cloudinary Support:** https://support.cloudinary.com
- **Documentation:** https://cloudinary.com/documentation
- **Community:** https://community.cloudinary.com

## Next Steps

1. ✅ Configure Cloudinary (this guide)
2. ✅ Implement backend endpoint ([BACKEND_URL_ENDPOINT.md](BACKEND_URL_ENDPOINT.md))
3. ✅ Test locally with dev server
4. ✅ Deploy to production
5. ✅ Monitor usage in Cloudinary dashboard
