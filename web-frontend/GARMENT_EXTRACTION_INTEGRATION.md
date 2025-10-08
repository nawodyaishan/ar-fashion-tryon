# Garment Extraction API Integration

This document describes how the Garment Extraction API is integrated into the AR Fashion Try-On frontend.

## Overview

All garment images uploaded to the platform are automatically processed through the **Garment Extraction API** for:

1. **Classification**: Determines if the garment is a T-shirt or Trousers
2. **Background Removal**: Extracts the garment with transparent background using u2net model
3. **Quality Validation**: Ensures only valid garment types are used

This preprocessing improves the quality of both AR Live Preview and Photo Try-On (HD) results.

---

## Architecture

```
User Uploads Image
        ↓
Garment Extraction API (localhost:5000)
        ↓
    ┌─────────────────────┐
    │  Classification     │
    │  (CNN Model)        │
    └─────────────────────┘
        ↓
    ┌─────────────────────┐
    │  Background Removal │
    │  (u2net/rembg)      │
    └─────────────────────┘
        ↓
    Success? ────┐
        ↓        │
       Yes      No
        ↓        │
   Store Image   │
        ↓        │
   AR Mode / Photo Mode
        ↓
  VTON Backend (localhost:8000)
```

---

## Integration Points

### 1. AR Mode (Live Preview)

**File**: `components/tryon/ARPanel.tsx`

When users upload custom garments in AR mode:

```typescript
// 1. User selects file
const file = e.target.files?.[0];

// 2. Extract garment via API
const { result, extractedFile } = await extractAndPrepareGarment(file);

// 3. Check extraction success
if (!result.success || !extractedFile) {
  toast.error(result.message); // e.g., "Garment must be a T-shirt or Trousers"
  return;
}

// 4. Store extracted garment with metadata
const newGarment = {
  id: `custom-${Date.now()}`,
  name: file.name,
  src: await loadImageFromFile(extractedFile),
  extracted: true,
  extractedUrl: result.extraction?.cutout_url,
  classification: result.classification, // { label: 'tshirt', confidence: 0.95 }
  processingTime: result.processing_time_ms,
};

// 5. Add to garments list
addGarment(newGarment);
```

**Features**:
- ✅ Real-time extraction feedback
- ✅ Confidence score display
- ✅ Automatic rejection of invalid garments
- ✅ Loading state with "Extracting..." message

---

### 2. Photo Try-On HD Mode

**File**: `lib/store/useVtonStore.ts`

When users upload garment in Photo Mode:

```typescript
// Modified setGarmentFile action
setGarmentFile: async (file) => {
  if (!file) return;

  // Step 1: Show initial preview
  const previewUrl = URL.createObjectURL(file);
  set({ garment: { file, previewUrl }, status: 'uploading' });

  // Step 2: Extract garment
  const { result, extractedFile } = await extractAndPrepareGarment(file);

  // Step 3: Check success
  if (!result.success || !extractedFile) {
    set({
      status: 'error',
      error: result.message || 'Invalid garment type',
    });
    return;
  }

  // Step 4: Update state with extracted garment
  const extractedPreviewUrl = URL.createObjectURL(extractedFile);
  set({
    garment: {
      file: extractedFile,        // Use extracted file
      previewUrl: extractedPreviewUrl,
      extracted: true,
      extractionResult: result,
      extractedFile,
    },
    status: 'valid',
  });
};

// Modified tryOn action
tryOn: async () => {
  // Use extracted file for VTON processing
  const finalGarmentFile = garment.extractedFile || garment.file;

  const payload = {
    bodyFile: body.file,
    garmentFile: finalGarmentFile, // Extracted, background-removed garment
    ...options,
  };

  const imageBlob = await processImages(payload);
  // ...
};
```

**Workflow**:
1. User uploads garment image → **Extraction API**
2. API returns extracted PNG with transparent background
3. Extracted image is used for VTON processing
4. Better quality results due to clean background

---

## API Service

**File**: `lib/services/garmentApi.ts`

Core functions:

### `extractGarment(file: File): Promise<GarmentProcessResponse>`

Uploads a file to the extraction API and returns classification + extraction results.

```typescript
const result = await extractGarment(file);

if (result.success) {
  // result.classification = { label: 'tshirt', confidence: 0.92 }
  // result.extraction = { cutout_url: '/static/outputs/cutout_xxx.png', ... }
  // result.processing_time_ms = 1234.56
}
```

### `extractAndPrepareGarment(file: File): Promise<{ result, extractedFile }>`

Full pipeline: Extract garment and download as File object for use with VTON.

```typescript
const { result, extractedFile } = await extractAndPrepareGarment(originalFile);

if (result.success && extractedFile) {
  // extractedFile is a File object ready to upload to VTON backend
  // It contains the garment with transparent background
}
```

### `checkGarmentApiHealth(): Promise<GarmentHealthCheck>`

Checks if the Garment Extraction API is available.

```typescript
const health = await checkGarmentApiHealth();
// { status: 'healthy', model_loaded: true, model_name: '...', version: '1.0.0' }
```

---

## Type Definitions

**File**: `lib/types.ts`

```typescript
// Garment classification result
export interface ClassificationResult {
  label: 'tshirt' | 'trousers' | 'unknown';
  confidence: number; // 0.0 to 1.0
}

// Extraction result URLs
export interface ExtractionResult {
  cutout_url: string;      // URL to extracted image
  cutout_path: string;     // Relative path
  original_url: string;    // URL to original
}

// Full API response
export interface GarmentProcessResponse {
  success: boolean;
  message: string;
  classification: ClassificationResult | null;
  extraction: ExtractionResult | null;
  processing_time_ms: number | null;
}

// Extended Garment type with extraction metadata
export interface Garment {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
  sizeKb: number;
  category?: 'tops' | 'jackets' | 'misc';

  // Extraction metadata (populated after extraction)
  extracted?: boolean;
  extractedUrl?: string;
  classification?: ClassificationResult;
  processingTime?: number;
}
```

---

## Configuration

### Environment Variables

**File**: `.env.local`

```bash
# Garment Extraction API Base URL
NEXT_PUBLIC_GARMENT_API_BASE=http://localhost:5000

# VTON ML Backend (for final processing)
NEXT_PUBLIC_VTON_API_BASE=http://127.0.0.1:8000
```

### API Endpoints

The Garment Extraction API exposes:

- `POST /api/process` - Process and extract garment
- `GET /api/health` - Health check
- `GET /static/outputs/{filename}` - Download extracted images

**Base URL**: `http://localhost:5000` (configurable)

---

## Error Handling

### Invalid Garment Type

If the uploaded image is not a T-shirt or Trousers:

```javascript
{
  "success": false,
  "message": "Garment must be a T-shirt or Trousers. Detected: unknown",
  "classification": {
    "label": "unknown",
    "confidence": 0.45
  },
  "extraction": null
}
```

**Frontend Response**:
- Toast error message
- Prevents garment from being added
- User must upload valid garment

### File Too Large

Max file size: **10MB**

```javascript
{
  "detail": "File too large. Maximum size is 10.0MB"
}
```

### Invalid File Type

Supported: JPEG, PNG, WEBP

```javascript
{
  "detail": "Invalid file type. Must be an image (JPEG, PNG, WEBP)."
}
```

### API Unavailable

If the extraction API is down:

```javascript
throw new Error('Garment Extraction API is not available');
```

**Frontend Response**:
- Toast error
- Graceful fallback (could allow manual upload without extraction in future)

---

## User Experience Flow

### AR Mode

1. User clicks **"Add Garment"** button
2. Selects image file (JPEG/PNG/WEBP)
3. Loading state: **"Extracting..."** with pulsing icon
4. Extraction completes (1-3 seconds typical)
5. Success toast: **"Garment extracted: TSHIRT (95% confidence)"**
6. Garment appears in grid with transparent background
7. User can drag/resize/rotate on AR preview

### Photo Mode

1. User uploads body photo (Step 1)
2. User uploads garment photo (Step 2)
3. **Automatic extraction starts** on garment upload
4. Status changes: `idle` → `uploading` → `valid` or `error`
5. If valid: Preview shows extracted garment
6. User clicks **"Generate"** (Step 3)
7. Extracted garment is sent to VTON backend
8. Result displayed (Step 4)

---

## Benefits of Integration

### Quality Improvements

✅ **Clean Backgrounds**: All garments have transparent backgrounds, improving VTON quality

✅ **Type Validation**: Only T-shirts and Trousers are accepted, matching VTON capabilities

✅ **Consistent Input**: Standardized garment format for ML backend

### User Experience

✅ **Automatic Processing**: No manual background removal needed

✅ **Instant Feedback**: Users know immediately if garment is valid

✅ **Confidence Scores**: Transparency about classification certainty

### Developer Experience

✅ **Type Safety**: Full TypeScript support with typed responses

✅ **Error Handling**: Comprehensive error messages and states

✅ **Logging**: Console logs for debugging (`🚀`, `✅`, `❌` emoji prefixes)

---

## Console Logging

The integration includes detailed console logging for debugging:

```javascript
// Extraction start
🚀 Garment Extraction Request: { fileName, fileSize, fileType }

// Extraction success
✅ Garment Extraction Success: {
  label: 'tshirt',
  confidence: '92.34%',
  processingTime: '1234.56ms',
  extractedUrl: '/static/outputs/cutout_xxx.png'
}

// Extraction failure
⚠️ Garment Extraction Failed: { message, label, confidence }

// Error
❌ Garment Extraction Error: Error object
```

---

## Testing

### Manual Testing Steps

1. **Start Garment Extraction API**:
   ```bash
   cd image-extraction-backend
   python main.py
   # API running on http://localhost:5000
   ```

2. **Start Frontend**:
   ```bash
   cd web-frontend
   pnpm dev
   # Frontend on http://localhost:3000
   ```

3. **Test AR Mode**:
   - Go to `/try-on`
   - Click "Add Garment"
   - Upload a T-shirt image
   - Verify extraction success message
   - Check garment appears with transparent background

4. **Test Photo Mode**:
   - Go to `/try-on` → "Photo Try-On (HD)" tab
   - Upload body photo
   - Upload garment photo
   - Verify "Extracting..." status
   - Check extracted preview
   - Generate result

### Expected API Response Time

- Classification: ~200-500ms
- Background Removal: ~800-1500ms
- **Total**: ~1-2 seconds per garment

---

## Future Enhancements

### Possible Improvements

1. **Batch Processing**: Extract multiple garments at once
2. **Caching**: Cache extracted garments to avoid re-processing
3. **Advanced Validation**: Check garment quality, resolution, etc.
4. **Progressive Upload**: Show extraction progress percentage
5. **Fallback Mode**: Allow manual upload if API is unavailable
6. **Gallery Integration**: Pre-extract all gallery garments on build

---

## Troubleshooting

### Issue: "Garment Extraction API is not available"

**Cause**: API server is not running

**Solution**:
```bash
cd image-extraction-backend
python main.py
```

### Issue: "Garment must be a T-shirt or Trousers"

**Cause**: Uploaded image contains other clothing or objects

**Solution**: Upload a clear image of a T-shirt or Trousers

### Issue: Slow extraction (>5 seconds)

**Cause**: Large image file or slow CPU

**Solution**:
- Resize images before upload (< 2MB recommended)
- Ensure u2net model is loaded in memory
- Consider GPU acceleration for production

---

## API Documentation

For full API documentation, see:
- `/image-extraction-backend/API_DOCUMENTATION.md`
- Interactive docs: `http://localhost:5000/docs`

---

## Related Files

### Service Layer
- `lib/services/garmentApi.ts` - API client
- `lib/services/vtonApi.ts` - VTON backend client
- `lib/services/http.ts` - Axios instance

### State Management
- `lib/store/useVtonStore.ts` - Photo mode state with extraction
- `lib/tryon-store.ts` - AR mode state

### Components
- `components/tryon/ARPanel.tsx` - AR garment upload
- `components/tryon/PhotoWizard.tsx` - Photo mode upload

### Types
- `lib/types.ts` - All TypeScript type definitions

### Configuration
- `.env.local.example` - Environment variable template
- `.env.local` - Your local configuration (not committed)
