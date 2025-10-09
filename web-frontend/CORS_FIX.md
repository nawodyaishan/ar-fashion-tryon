# CORS Fix for Garment Extraction API

## Issue Description

When uploading garment images for extraction, the frontend was encountering CORS errors:

```
Access to XMLHttpRequest at 'http://ar-fashion-tryon-production.up.railway.app/static/outputs/cutout_xxx.png'
from origin 'http://localhost:3000' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check: Redirect is not allowed for a preflight request.
```

Additionally, browser console showed:
```
Refused to set unsafe header "User-Agent"
```

## Root Causes

### 1. Forbidden User-Agent Header
**Location:** `lib/services/http.ts`

The axios HTTP client was configured with a `User-Agent` header:

```typescript
headers: {
  'X-Client': 'ar-tryon-web',
  'User-Agent': 'ar-tryon-web-client', // ❌ FORBIDDEN in browsers
}
```

**Problem:** `User-Agent` is a [forbidden header name](https://developer.mozilla.org/en-US/docs/Glossary/Forbidden_header_name) in web browsers. JavaScript cannot set this header - the browser sets it automatically. Attempting to set it causes the request to fail.

### 2. CORS Preflight with Custom Headers
**Location:** `lib/services/garmentApi.ts` → `downloadExtractedImage()`

Using axios to download static files triggered CORS preflight (OPTIONS request) due to custom headers. When Railway's static file server responded with a redirect (HTTP → HTTPS or similar), the preflight failed because **redirects are not allowed during preflight**.

## Solutions Implemented

### Fix 1: Remove User-Agent Header
**File:** `lib/services/http.ts`

```typescript
export const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_VTON_API_BASE || 'http://127.0.0.1:8000',
  timeout: 60_000,
  headers: {
    'X-Client': 'ar-tryon-web',
    // User-Agent removed - browser sets it automatically
  },
});
```

### Fix 2: Use Native Fetch for Static Files
**File:** `lib/services/garmentApi.ts` → `downloadExtractedImage()`

Replaced axios with native `fetch()` to avoid CORS preflight:

```typescript
export async function downloadExtractedImage(
  cutoutUrl: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const fullUrl = resolveUrl(cutoutUrl);

  // Use native fetch instead of axios to avoid CORS preflight
  // Simple GET requests don't trigger preflight
  const response = await fetch(fullUrl, {
    method: 'GET',
    signal,
    // No custom headers = no preflight
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.blob();
}
```

**Why this works:**
- Simple GET requests without custom headers don't trigger CORS preflight
- Fetch API is native to browsers and handles CORS more gracefully
- No axios interceptors or default headers interfere

## CORS Flow Comparison

### Before (Axios with Headers)
```
1. Browser sends OPTIONS preflight (due to custom headers)
2. Railway server responds with redirect (HTTP → HTTPS)
3. ❌ CORS fails: "Redirect is not allowed for a preflight request"
```

### After (Native Fetch)
```
1. Browser sends simple GET request (no preflight needed)
2. Server responds with image data
3. ✅ CORS succeeds
```

## Backend CORS Configuration

Your FastAPI backend already has proper CORS configured:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)
```

This configuration is correct and doesn't need changes.

## Testing

### Successful Flow
1. User uploads garment image
2. Frontend sends `POST /classify_garment` with FormData
3. Backend processes image and returns:
   ```json
   {
     "label": "tshirt",
     "confidence": 0.95,
     "garment_url": "https://..../uploads/garment_xxx.jpg",
     "cutout_url": "https://..../outputs/cutout_xxx.png",
     "cutout_path": "static/outputs/cutout_xxx.png"
   }
   ```
4. Frontend downloads cutout using native fetch (no CORS issues)
5. Extracted image displayed successfully

### Console Output
```
🚀 Garment Extraction Request: {fileName: '...', fileSize: '...', fileType: '...'}
✅ Garment Extraction Success: {label: 'TSHIRT', confidence: 0.95, ...}
📥 Downloading extracted image: https://ar-fashion-tryon-production.up.railway.app/static/outputs/cutout_xxx.png
✅ Downloaded extracted image: {size: '45.32 KB', type: 'image/png'}
```

## Common CORS Issues

### Issue: "Redirect is not allowed for a preflight request"
**Cause:** Server redirecting during OPTIONS request
**Fix:** Use simple requests (GET without custom headers) or ensure server doesn't redirect during preflight

### Issue: "Refused to set unsafe header 'User-Agent'"
**Cause:** Trying to set forbidden headers in JavaScript
**Fix:** Remove forbidden headers (User-Agent, Host, Origin, etc.)

### Issue: "No 'Access-Control-Allow-Origin' header"
**Cause:** Backend CORS not configured
**Fix:** Add CORS middleware (already configured in your FastAPI app)

## Forbidden Headers List

Never set these headers in browser JavaScript:

- `Accept-Charset`
- `Accept-Encoding`
- `Access-Control-*` (all)
- `Connection`
- `Content-Length`
- `Cookie`
- `Date`
- `DNT`
- `Expect`
- `Host`
- `Keep-Alive`
- `Origin`
- `Referer`
- `TE`
- `Trailer`
- `Transfer-Encoding`
- `Upgrade`
- `User-Agent` ← **This was our issue**
- `Via`

## Production Considerations

1. **HTTPS Only**: Ensure both frontend and backend use HTTPS in production
2. **Specific Origins**: Replace `allow_origins=["*"]` with specific domains:
   ```python
   allow_origins=[
       "https://yourapp.vercel.app",
       "https://www.yourdomain.com"
   ]
   ```
3. **Credentials**: If using cookies, set `allow_credentials=True` and specify exact origins
4. **Security Headers**: Add security headers to static file responses

## Related Files

- `lib/services/http.ts` - Axios client configuration
- `lib/services/garmentApi.ts` - Garment extraction API functions
- Backend: `app/main.py` - CORS middleware configuration

## References

- [MDN: Forbidden Header Names](https://developer.mozilla.org/en-US/docs/Glossary/Forbidden_header_name)
- [MDN: CORS Preflight](https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request)
- [FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/)
