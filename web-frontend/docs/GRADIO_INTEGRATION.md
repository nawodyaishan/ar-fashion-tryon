# Gradio API Integration - Photo Try-On (HD)

This document describes the Gradio HuggingFace Space integration for the Photo Try-On (HD) mode.

## Overview

The Photo Try-On (HD) mode now uses the **Gradio API** hosted on HuggingFace Spaces for high-quality virtual try-on processing. This integration combines:

1. **Garment Extraction API** (localhost:5000) - Classifies and extracts garment backgrounds
2. **Gradio API** (HuggingFace Space) - Processes final try-on with CatVTON model

---

## Architecture

```
User Uploads Images
        ↓
┌─────────────────────────────────────┐
│  1. Body Photo Upload               │
│     - Direct upload, no processing  │
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│  2. Garment Photo Upload            │
│     ↓                                │
│  Garment Extraction API             │
│  (localhost:5000)                   │
│     - Classification (T-shirt/Pants)│
│     - Background Removal (u2net)    │
│     ↓                                │
│  Extracted Garment (PNG)            │
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│  3. Generate Button Clicked         │
│     ↓                                │
│  Gradio API (HuggingFace Space)     │
│  nawodyaishan-ar-fashion-tryon      │
│     - Receives body + extracted     │
│       garment (both as base64)      │
│     - Runs CatVTON model            │
│     - Returns result (base64)       │
│     ↓                                │
│  Result Image (data URL)            │
└─────────────────┬───────────────────┘
                  ↓
            Display Result
```

---

## Complete Workflow

### Step 1: Body Photo Upload
```typescript
// User uploads body photo
setBody(file) {
  const previewUrl = URL.createObjectURL(file);
  set({ body: { file, previewUrl } });
}
```
- Simple file storage
- Creates preview URL
- No backend processing

### Step 2: Garment Photo Upload + Extraction
```typescript
// User uploads garment photo
setGarmentFile(file) {
  // 1. Set initial preview
  set({ status: 'uploading' });

  // 2. Extract garment via Garment Extraction API
  const { result, extractedFile } = await extractAndPrepareGarment(file);

  // 3. Check extraction success
  if (!result.success) {
    set({ status: 'error', error: result.message });
    return; // Stop if not T-shirt/Trousers
  }

  // 4. Store extracted garment
  set({
    garment: {
      file: extractedFile, // PNG with transparent background
      extracted: true,
      extractionResult: result,
    },
    status: 'valid',
  });
}
```

**UI Feedback**:
- Loading: "Extracting garment background..."
- Success: "Extracted: TSHIRT (95% confidence)"
- Error: "Garment must be a T-shirt or Trousers"

### Step 3: Generate Try-On (Gradio API)
```typescript
// User clicks "Generate Try-On"
tryOn() {
  // 1. Validation
  if (!body.file) throw Error('Body photo required');
  if (!garment.file || !garment.extracted) {
    throw Error('Valid extracted garment required');
  }

  set({ status: 'processing' });

  // 2. Call Gradio API
  const resultBase64 = await processWithGradio(
    body.file,
    garment.extractedFile, // Uses extracted PNG
    options.clothType || 'upper',
    options.numInferenceSteps ?? 50,
    options.guidanceScale ?? 2.5,
    options.seed ?? 42,
  );

  // 3. Display result
  set({
    status: 'done',
    resultUrl: resultBase64, // Data URL, ready to display
    step: 'RESULT',
  });
}
```

**Gradio Request Format**:
```json
{
  "data": [
    {
      "background": "data:image/jpeg;base64,/9j/4AAQ...", // Body photo
      "layers": []
    },
    "data:image/png;base64,iVBORw0KGgo...",              // Garment photo (extracted)
    "upper",                                             // Cloth type
    50,                                                  // num_inference_steps
    2.5,                                                 // guidance_scale
    42,                                                  // seed
    "result only"                                        // output_type
  ]
}
```

**Gradio Response**:
```json
{
  "data": [
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA..."  // Result image
  ],
  "duration": 28.5,
  "average_duration": 32.1
}
```

### Step 4: Display Result
```typescript
// Result is displayed directly (data URL)
<img src={resultUrl} alt="Try-on result" />

// Download
function handleDownload() {
  const link = document.createElement('a');
  link.href = resultUrl; // Data URL works directly
  link.download = 'tryon-result.png';
  link.click();
}
```

---

## API Service

**File**: `lib/services/gradioApi.ts`

### Key Functions

#### `processWithGradio()`
```typescript
async function processWithGradio(
  personFile: File,
  clothFile: File,
  clothType: ClothType = 'upper',
  numInferenceSteps = 50,
  guidanceScale = 2.5,
  seed = 42,
  signal?: AbortSignal,
): Promise<string>
```

**Process**:
1. Convert files to base64 data URLs
2. Prepare Gradio request format
3. POST to `/api/predict` endpoint
4. Parse response
5. Return base64 result image

**Returns**: Base64 data URL (ready to use in `<img>` src)

#### `base64ToBlob()`
```typescript
function base64ToBlob(base64: string): Blob
```
Converts base64 to Blob for advanced processing

#### `downloadBase64Image()`
```typescript
function downloadBase64Image(base64: string, filename: string)
```
Downloads result image directly from base64

---

## Configuration

### Environment Variables

**File**: `.env.local`

```bash
# Gradio API URL (HuggingFace Space)
NEXT_PUBLIC_GRADIO_API_URL=https://nawodyaishan-ar-fashion-tryon.hf.space

# Garment Extraction API
NEXT_PUBLIC_GARMENT_API_BASE=http://localhost:5000

# API Timeout (milliseconds)
API_TIMEOUT=120000

# Max File Size (bytes)
MAX_FILE_SIZE=10485760
```

### Default Values

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| `clothType` | `'upper'` | `'upper'`, `'lower'`, `'overall'` | Garment category |
| `numInferenceSteps` | `50` | `20-100` | Quality vs speed (higher = better quality) |
| `guidanceScale` | `2.5` | `1.0-10.0` | How closely to follow garment details |
| `seed` | `42` | `-1 to 999` | Reproducibility (`-1` = random) |
| `outputType` | `'result only'` | Fixed | Output format |

---

## UI Updates

### Garment Upload Step

**Shows extraction status**:
```tsx
{status === 'uploading' && (
  <Alert>
    <Loader2 className="animate-spin" />
    Extracting garment background...
  </Alert>
)}

{garment.extracted && (
  <Alert className="bg-green-500/10">
    <Sparkles className="text-green-600" />
    Extracted: TSHIRT (95% confidence)
  </Alert>
)}

{status === 'error' && (
  <Alert variant="destructive">
    <AlertCircle />
    {error}
  </Alert>
)}
```

### Generate Button

**Requirements**:
- Body photo uploaded ✅
- Garment photo uploaded ✅
- **Garment successfully extracted** ✅ (new requirement)

```tsx
const canGenerate =
  body.file &&
  garment.file &&
  garment.extracted;

<Button
  disabled={!canGenerate || status === 'processing'}
  onClick={handleGenerate}
>
  {status === 'processing' ? (
    <>
      <Loader2 className="animate-spin" />
      Processing with Gradio...
    </>
  ) : (
    <>
      <Sparkles />
      Generate Try-On
    </>
  )}
</Button>

{status === 'processing' && (
  <div className="text-center">
    <p>Processing on HuggingFace Space</p>
    <p className="text-xs">This may take 30-60 seconds. Please wait...</p>
  </div>
)}
```

---

## Processing Times

### Garment Extraction
- **API**: Garment Extraction (localhost)
- **Time**: 1-3 seconds
- **Factors**: Image size, CPU/GPU availability

### Virtual Try-On
- **API**: Gradio (HuggingFace Space)
- **Time**: 30-60 seconds typical
- **Factors**:
  - Queue position (shared compute)
  - Image resolution
  - Inference steps (50 = balanced)
  - Model complexity

**Total Time**: ~35-65 seconds from upload to result

---

## Error Handling

### Common Errors

#### 1. Invalid Garment Type
```javascript
// Garment Extraction API returns:
{
  success: false,
  message: "Garment must be a T-shirt or Trousers. Detected: unknown"
}

// UI shows:
"Garment extraction failed. Please upload a valid T-shirt or Trousers image."
```

#### 2. Gradio API Timeout
```javascript
// After 120 seconds:
throw new Error('Request timeout. Please try again.');

// UI shows:
"Processing failed. Please try again."
```

#### 3. Network Error
```javascript
// Network failure:
throw new Error('Network error. Please check your connection.');
```

#### 4. Garment Not Extracted
```javascript
// User tries to generate without extraction:
if (!garment.extracted) {
  set({
    error: 'Garment extraction failed. Please upload a valid T-shirt or Trousers image.',
    status: 'error'
  });
}

// Button is disabled
<Button disabled={!garment.extracted}>
  Generate Try-On
</Button>
```

---

## Testing

### Manual Testing Steps

1. **Start Services**:
   ```bash
   # Terminal 1: Garment Extraction API
   cd image-extraction-backend
   python main.py
   # Running on http://localhost:5000

   # Terminal 2: Frontend
   cd web-frontend
   pnpm dev
   # Running on http://localhost:3000
   ```

2. **Test Complete Flow**:
   - Go to `/try-on` → "Photo Try-On (HD)" tab
   - **Step 1**: Upload body photo → See preview
   - **Step 2**: Upload T-shirt image
     - Watch "Extracting garment background..."
     - See "Extracted: TSHIRT (95% confidence)"
   - **Step 3**: Click "Generate Try-On"
     - Wait for "Processing with Gradio..." (30-60s)
   - **Step 4**: See result, download, or regenerate

3. **Test Error Cases**:
   - Upload non-garment image → See "Invalid garment" error
   - Try to generate without extraction → Button disabled
   - Test timeout (if HuggingFace is down)

### Expected Console Logs

```javascript
// Garment extraction
🔍 Extracting garment...
🚀 Garment Extraction Request: { fileName, fileSize, fileType }
✅ Garment Extraction Success: { label: 'tshirt', confidence: '92.34%', ... }

// Gradio processing
🎬 Starting try-on process (Gradio)...
✅ Validation passed: { bodyFile, garmentFile, garmentExtracted: true, ... }
📤 Sending to Gradio API (HuggingFace Space)...
🚀 Gradio API Request: { personFile, clothFile, clothType, ... }
🔄 Converting images to base64...
📤 Sending to Gradio API...
📥 Received result from Gradio...
✅ Gradio API Success: { duration: '28.5s', imageSize: '234KB' }
✅ Try-on complete!
```

---

## Performance Optimization

### Client-Side

1. **Image Compression** (optional):
   ```typescript
   // Before upload, compress large images
   import imageCompression from 'browser-image-compression';

   const compressed = await imageCompression(file, {
     maxSizeMB: 2,
     maxWidthOrHeight: 1024,
   });
   ```

2. **Lazy Loading**:
   ```typescript
   import dynamic from 'next/dynamic';

   const PhotoWizard = dynamic(() => import('./PhotoWizard'), {
     loading: () => <LoadingSkeleton />,
   });
   ```

### Server-Side

1. **Caching** (future):
   - Cache Gradio results by body+garment hash
   - Store in localStorage or IndexedDB
   - Skip API call for duplicate requests

2. **Request Batching** (future):
   - Queue multiple try-ons
   - Process in batch to optimize HuggingFace usage

---

## Differences from Local ML Backend

| Feature | Gradio API (Current) | Local ML Backend (Old) |
|---------|----------------------|-------------------------|
| **Endpoint** | `https://nawodyaishan-ar-fashion-tryon.hf.space/api/predict` | `http://127.0.0.1:8000/process_images/` |
| **Request Format** | JSON with base64 images | `multipart/form-data` with File objects |
| **Response Format** | JSON with base64 image | Binary Blob (PNG) |
| **Processing Time** | 30-60 seconds (shared compute) | 10-30 seconds (dedicated GPU) |
| **Setup Required** | None (hosted) | Local ML backend must be running |
| **Cost** | Free (HuggingFace Spaces) | Local compute resources |
| **Availability** | 24/7 (subject to HuggingFace uptime) | Manual start required |
| **Garment Extraction** | Required before Gradio | Optional |

---

## Migration Notes

### From Local ML Backend

If you were using the local ML backend (`localhost:8000`), here's what changed:

**Before** (`vtonApi.ts`):
```typescript
// Old: Direct multipart/form-data upload
const fd = new FormData();
fd.append('person_image', bodyFile);
fd.append('cloth_image', garmentFile);
fd.append('cloth_type', 'upper');

const { data } = await http.post<Blob>('/process_images/', fd);
const resultUrl = URL.createObjectURL(data); // Blob URL
```

**After** (`gradioApi.ts`):
```typescript
// New: Base64 JSON request to Gradio
const resultBase64 = await processWithGradio(
  bodyFile,
  garmentFile,
  'upper',
  50, 2.5, 42
);
// resultBase64 is already a data URL, use directly
```

**Key Changes**:
1. Response is **base64 data URL** instead of Blob
2. No need to create Object URL
3. No need to revoke URLs (data URLs don't leak memory like blob URLs)
4. Garment **must** be extracted first (not optional)

---

## Troubleshooting

### Issue: "Garment extraction failed"
**Cause**: Uploaded image is not a T-shirt or Trousers

**Solution**: Upload a clear image of clothing, front-facing view

---

### Issue: "Processing timeout"
**Cause**: Gradio API took longer than 120 seconds

**Solutions**:
- Check HuggingFace Space status
- Retry the request
- Use lower `numInferenceSteps` (e.g., 30 instead of 50)

---

### Issue: "Network error"
**Cause**: Cannot reach Gradio API

**Solutions**:
- Check internet connection
- Verify Gradio API URL is correct
- Check if HuggingFace Spaces is accessible

---

### Issue: Generate button disabled
**Cause**: Garment not extracted or invalid

**Solution**: Re-upload garment image, ensure it's a T-shirt or Trousers

---

## Future Enhancements

1. **Progress Indicator**: Show real-time progress from Gradio
2. **Result History**: Cache previous results
3. **Batch Processing**: Queue multiple try-ons
4. **Advanced Options**: Expose more CatVTON parameters
5. **Fallback to Local**: Switch to local ML backend if Gradio is unavailable

---

## Related Files

### Service Layer
- `lib/services/gradioApi.ts` - Gradio API client
- `lib/services/garmentApi.ts` - Garment extraction
- `lib/services/http.ts` - Axios instance

### State Management
- `lib/store/useVtonStore.ts` - Photo mode state with Gradio integration

### Components
- `components/tryon/PhotoWizard.tsx` - Photo try-on UI

### Configuration
- `.env.local.example` - Environment template
- `.env.local` - Your configuration

---

## References

- [HuggingFace Spaces API Docs](https://huggingface.co/docs/hub/spaces-sdks-gradio)
- [Gradio Client Library](https://www.gradio.app/guides/getting-started-with-the-js-client)
- [CatVTON Model](https://huggingface.co/zhengchong/CatVTON)
