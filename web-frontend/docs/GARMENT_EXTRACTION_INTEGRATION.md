# Garment Extraction Integration - Mode-Specific Implementation

This document explains how garment extraction is implemented differently for **Photo Try-On** and **AR Mode**.

## Overview

The system now has **two distinct workflows** for handling garment images:

### 1. Photo Try-On Mode (HD Processing)
- ✅ **No garment extraction** - sends raw garment to backend
- ✅ **Validation only** - file type and size checks
- ✅ **Cloth type selector** - UI for selecting upper/lower/full body
- ✅ **Backend handles extraction** - FastAPI processes garment internally

### 2. AR Mode (Live Preview)
- ✅ **Full garment extraction** - processes garment before display
- ✅ **FastAPI extraction endpoint** - `/classify_garment` or `/classify_garment_by_url`
- ✅ **Automatic placement** - extracted garment placed on AR preview
- ✅ **Classification metadata** - includes label and confidence

## Photo Try-On Mode

### User Flow

```
1. Upload body photo (BODY step)
   ↓
2. Upload garment image (GARMENT step)
   - Validates file type (PNG/JPEG/WEBP)
   - Validates file size (max 10MB)
   - Creates preview URL
   ✅ NO extraction API call
   ↓
3. Select cloth type (GENERATE step)
   - Radio buttons: Upper Body / Lower Body / Full Body
   - Sets cloth_type: "upper" | "lower" | "full"
   ↓
4. Click "Generate Try-On"
   - Sends raw garment file to FastAPI
   - Backend handles extraction internally
   ↓
5. View result (RESULT step)
   - Displays result from Cloudinary
```

### Implementation

**File:** `lib/store/useVtonStore.ts`

```typescript
setGarmentFile: async (file) => {
  if (!file) {
    set({ garment: { ...get().garment, file: undefined, previewUrl: undefined, id: undefined } });
    return { ok: false, message: 'No garment file' };
  }

  // Validate file type
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    const msg = 'Invalid file type. Please upload PNG, JPEG, or WEBP image.';
    set({ status: 'error', error: msg });
    return { ok: false, message: msg };
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    const msg = 'File too large. Maximum size is 10MB.';
    set({ status: 'error', error: msg });
    return { ok: false, message: msg };
  }

  const previewUrl = URL.createObjectURL(file);
  set({
    garment: { ...get().garment, file, previewUrl, id: undefined },
    status: 'valid',
    error: undefined,
  });

  return { ok: true };
},
```

**File:** `components/tryon/PhotoWizard.tsx`

```typescript
// Upload handler - validation only
const handleGarmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return toast.error('Please upload an image file');
  if (file.size > 10 * 1024 * 1024) return toast.error('File size must be less than 10MB');

  const toastId = 'garment-upload';
  toast.loading('Uploading garment...', { id: toastId });

  const { ok, message } = await setGarmentFile(file);

  if (ok) toast.success('Garment uploaded', { id: toastId });
  else toast.error(message || 'Garment upload failed', { id: toastId });
};

// Cloth type selector UI
<Card className="p-4 space-y-4">
  <div className="space-y-2">
    <Label className="text-sm font-medium">Garment Type</Label>
    <p className="text-xs text-muted-foreground">
      Select the type of garment you're trying on
    </p>
  </div>
  <RadioGroup
    value={options.clothType || 'upper'}
    onValueChange={(value) => setOptions({ clothType: value as 'upper' | 'lower' | 'full' })}
    className="grid grid-cols-3 gap-4"
  >
    <div>
      <RadioGroupItem value="upper" id="upper" className="peer sr-only" />
      <Label htmlFor="upper" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
        <svg className="mb-2 h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="text-xs font-medium">Upper Body</span>
        <span className="text-xs text-muted-foreground">Shirts, Tops</span>
      </Label>
    </div>
    <div>
      <RadioGroupItem value="lower" id="lower" className="peer sr-only" />
      <Label htmlFor="lower" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
        <svg className="mb-2 h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        </svg>
        <span className="text-xs font-medium">Lower Body</span>
        <span className="text-xs text-muted-foreground">Pants, Skirts</span>
      </Label>
    </div>
    <div>
      <RadioGroupItem value="full" id="full" className="peer sr-only" />
      <Label htmlFor="full" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
        <svg className="mb-2 h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <span className="text-xs font-medium">Full Body</span>
        <span className="text-xs text-muted-foreground">Dresses, Suits</span>
      </Label>
    </div>
  </RadioGroup>
</Card>
```

### API Call

**Endpoint:** `POST /virtual_tryon`

```typescript
const response = await virtualTryOn(
  {
    bodyFile: body.file,
    garmentFile: garment.file!, // Raw garment file (not extracted)
    clothType: options.clothType || 'upper',
    options: {
      numInferenceSteps: options.numInferenceSteps ?? 50,
      guidanceScale: options.guidanceScale ?? 2.5,
      seed: options.seed ?? 42,
    },
  },
  false, // process_garment = false (backend handles it internally)
  controller.signal,
);
```

## AR Mode (Live Preview)

### User Flow

```
1. Click "Add Garment" button
   ↓
2. Upload garment image
   - Validates file type (PNG/JPEG/WEBP)
   - Validates file size (max 10MB)
   ↓
3. Garment extraction starts
   - Toast: "Extracting garment..."
   - Calls FastAPI extraction endpoint
   - Backend processes: classify + background removal
   ↓
4. Extracted garment loaded
   - Creates File object from extracted image
   - Adds to garment store with metadata
   - Toast: "🌩️ Garment extracted via Cloudinary: TSHIRT (95% confidence)"
   ↓
5. Garment auto-selected
   - Garment placed on AR preview
   - User can drag, resize, rotate
   - MediaPipe pose detection optional
```

### Implementation

**File:** `components/tryon/ARPanel.tsx`

```typescript
import { extractGarmentSmart } from '@/lib/services/garmentApi';

const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    toast.error('Please upload an image file (JPEG, PNG, WEBP)');
    return;
  }

  // Validate file size (max 10MB for extraction API)
  if (file.size > 10 * 1024 * 1024) {
    toast.error('File size must be less than 10MB');
    return;
  }

  try {
    setUploading(true);
    toast.loading('Extracting garment...', { id: 'extraction' });

    // Step 1: Extract garment through API (auto-selects Cloudinary or direct upload)
    const { result, extractedFile, method, cloudinaryUrl } = await extractGarmentSmart(file);

    // Check if extraction was successful
    if (!result.success || !extractedFile) {
      toast.error(result.message || 'Failed to extract garment', { id: 'extraction' });
      return;
    }

    // Step 2: Load extracted image
    const extractedSrc = await loadImageFromFile(extractedFile);
    const dimensions = await getImageDimensions(extractedSrc);

    // Step 3: Create new garment with extraction metadata
    const newGarment = {
      id: `custom-${Date.now()}`,
      name: file.name.replace(/\.[^/.]+$/, ''),
      src: extractedSrc,
      width: dimensions.width,
      height: dimensions.height,
      sizeKb: getFileSizeKB(extractedFile),
      category: 'misc' as const,
      extracted: true,
      extractedUrl: result.extraction?.cutout_url,
      cloudinaryUrl: cloudinaryUrl,
      classification: result.classification ? {
        label: result.classification.label as 'tshirt' | 'trousers' | 'unknown',
        confidence: result.classification.confidence
      } : undefined,
      processingTime: result.processing_time_ms || undefined,
    };

    // Step 4: Add garment to store and select it
    addGarment(newGarment);
    selectGarment(newGarment.id); // ✅ Triggers GarmentOverlay to display

    const methodEmoji = method === 'cloudinary' ? '🌩️' : '📤';
    const methodLabel = method === 'cloudinary' ? 'via Cloudinary' : 'direct upload';
    toast.success(
      `${methodEmoji} Garment extracted ${methodLabel}: ${result.classification?.label.toUpperCase()} (${(result.classification!.confidence * 100).toFixed(0)}% confidence)`,
      { id: 'extraction' },
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to upload garment';
    toast.error(errorMessage, { id: 'extraction' });
    console.error(err);
  } finally {
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }
};
```

**File:** `components/tryon/GarmentOverlay.tsx`

```typescript
export function GarmentOverlay({
  containerWidth,
  containerHeight,
}: GarmentOverlayProps) {
  const { selectedGarmentId, garments, transform, setTransform } = useTryonStore();

  // Find selected garment
  const selectedGarment = garments.find((g) => g.id === selectedGarmentId);

  // Don't render if no garment selected
  if (!selectedGarment) return null;

  return (
    <Rnd
      size={{
        width: garmentDimensions.width,
        height: garmentDimensions.height
      }}
      position={{
        x: transform.x,
        y: transform.y
      }}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      lockAspectRatio={transform.lockAspect}
      bounds="parent"
    >
      <div
        className="w-full h-full relative"
        style={{
          opacity: transform.opacity / 100,
          transform: `rotate(${transform.rotation}deg)`,
          transformOrigin: 'center'
        }}
      >
        {/* Render extracted garment */}
        <img
          ref={imageRef}
          src={selectedGarment.src} // ✅ Uses extracted garment src
          alt={selectedGarment.name}
          className="w-full h-full object-contain pointer-events-none select-none"
          draggable={false}
        />
      </div>
    </Rnd>
  );
}
```

## Extraction API Service

**File:** `lib/services/garmentApi.ts`

### Smart Pipeline Selector

```typescript
/**
 * Smart garment extraction that automatically chooses the best pipeline:
 * - If Cloudinary is configured → Uses Cloudinary pipeline (production recommended)
 * - If not → Falls back to direct upload pipeline
 */
export async function extractGarmentSmart(
  file: File,
  signal?: AbortSignal,
  forceMethod?: 'cloudinary' | 'direct',
): Promise<{
  result: GarmentProcessResponse;
  extractedFile: File | null;
  cloudinaryUrl?: string;
  method: 'cloudinary' | 'direct';
}> {
  const useCloudinary =
    forceMethod === 'cloudinary' ||
    (forceMethod !== 'direct' && isCloudinaryConfigured());

  if (useCloudinary) {
    console.log('🌩️ Using Cloudinary pipeline (production mode)');
    const cloudinaryResult = await extractViaCloudinaryPipeline(file, signal);
    return { ...cloudinaryResult, method: 'cloudinary' };
  } else {
    console.log('📤 Using direct upload pipeline (fallback mode)');
    const directResult = await extractAndPrepareGarment(file, signal);
    return { ...directResult, method: 'direct' };
  }
}
```

### Cloudinary Pipeline (Production)

```typescript
/**
 * Complete Cloudinary pipeline: Upload to Cloudinary → Process by URL
 */
export async function extractViaCloudinaryPipeline(
  file: File,
  signal?: AbortSignal,
): Promise<{
  result: GarmentProcessResponse;
  extractedFile: File | null;
  cloudinaryUrl?: string;
}> {
  // Step 1: Upload to Cloudinary
  const uploadResult = await uploadToCloudinary(file, 'garments/originals', signal);

  // Step 2: Process by URL via FastAPI /classify_garment_by_url
  const result = await extractGarmentByUrl(uploadResult.secure_url, signal);

  // Step 3: Download extracted image as File
  let extractedFile: File | null = null;

  if (result.success && result.extraction?.cutout_url) {
    const labelSafe = (result.classification?.label || 'garment').replace(/[^\w.-]+/g, '_');
    const fileName = `extracted_${labelSafe}.png`;
    extractedFile = await extractedUrlToFile(result.extraction.cutout_url, fileName);
  }

  return {
    result,
    extractedFile,
    cloudinaryUrl: uploadResult.secure_url,
  };
}
```

### Direct Upload Pipeline (Fallback)

```typescript
/**
 * Full pipeline: Extract garment and convert to File for AR display
 */
export async function extractAndPrepareGarment(
  originalFile: File,
  signal?: AbortSignal,
): Promise<{
  result: GarmentProcessResponse;
  extractedFile: File | null;
}> {
  // Step 1: Extract garment via FastAPI /classify_garment
  const result = await extractGarment(originalFile, signal);

  // Step 2: If successful, download extracted image as File
  let extractedFile: File | null = null;

  if (result.success && result.extraction?.cutout_url) {
    const labelSafe = (result.classification?.label || 'garment').replace(/[^\w.-]+/g, '_');
    const fileName = `extracted_${labelSafe}.png`;
    extractedFile = await extractedUrlToFile(result.extraction.cutout_url, fileName);
  }

  return { result, extractedFile };
}
```

## API Endpoints

### Photo Try-On Mode

**Endpoint:** `POST /virtual_tryon` (port 5000)

**Request:**
```typescript
FormData {
  person_image: File,
  garment_image: File,        // Raw garment (not extracted)
  cloth_type: 'upper' | 'lower' | 'full',
  num_inference_steps: number,
  guidance_scale: number,
  seed: number,
  process_garment: boolean    // false = backend handles extraction
}
```

**Response:**
```typescript
{
  success: boolean,
  person_url: string,         // Cloudinary URL
  garment_url: string,        // Cloudinary URL
  cutout_url?: string,        // Cloudinary URL (if processed)
  result_url: string,         // Cloudinary URL (try-on result)
  result_public_id: string,
  cloth_type: 'upper' | 'lower' | 'full',
  parameters: {
    num_inference_steps: number,
    guidance_scale: number,
    seed: number,
    show_type: string
  },
  garment_classification?: {
    label: string,
    confidence: number
  }
}
```

### AR Mode (Extraction)

**Endpoint:** `POST /classify_garment_by_url` (port 5000) - **Cloudinary pipeline**

**Request:**
```typescript
{
  source_url: string  // Cloudinary URL of uploaded garment
}
```

**Response:**
```typescript
{
  label: string,
  confidence: number,
  garment_url: string,  // Original garment URL
  cutout_url: string,   // Extracted garment URL (Cloudinary)
  cutout_path: string   // Relative path
}
```

**Endpoint:** `POST /classify_garment` (port 5000) - **Direct upload fallback**

**Request:**
```typescript
FormData {
  garment: File
}
```

**Response:** Same as `/classify_garment_by_url`

## Environment Configuration

### Frontend (.env.local)

```bash
# Garment Extraction & Virtual Try-On API (FastAPI)
NEXT_PUBLIC_GARMENT_API_BASE=http://localhost:5000

# Cloudinary (optional, for Cloudinary pipeline in AR mode)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=ar_fashion_unsigned

# For production:
# NEXT_PUBLIC_GARMENT_API_BASE=https://garment-api.railway.app
```

### Backend (FastAPI)

```bash
# Cloudinary (required for both modes)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your-api-secret

# Gradio (required for Photo Try-On)
GRADIO_SPACE=nawodyaishan/ar-fashion-tryon
HF_TOKEN=hf_your_token_here  # Optional, for private spaces

# CORS
CORS_ALLOW_ORIGINS=http://localhost:3000,https://yourapp.vercel.app

# Optional
MAX_CONTENT_MB=16
CLOUDINARY_FOLDER=garments
```

## Benefits of Mode-Specific Implementation

### Photo Try-On Mode

✅ **Faster workflow** - no frontend extraction step
✅ **Simpler code** - validation-only, no API calls
✅ **Better UX** - user selects cloth type with visual UI
✅ **Backend control** - server handles extraction with retry logic

### AR Mode

✅ **Real-time feedback** - see extracted garment immediately
✅ **Quality control** - classification metadata shown to user
✅ **Flexible storage** - supports both Cloudinary and direct upload
✅ **Production ready** - automatic pipeline selection

## Testing

### Test Photo Try-On Mode

1. Go to http://localhost:3000/try-on
2. Switch to **"Photo Try-On (HD)"** tab
3. Upload body photo
4. Upload garment image (no extraction toast)
5. Select cloth type (Upper/Lower/Full)
6. Click "Generate Try-On"
7. Verify result displays

**Expected console output:**
```
🚀 VTON API Request: {
  endpoint: '/virtual_tryon',
  person_image: 'person.jpg',
  garment_image: 'tshirt.png',
  cloth_type: 'upper',
  process_garment: false
}
✅ VTON API Success: {
  duration: '45.23s',
  result_url: 'https://res.cloudinary.com/.../tryon_abc123.png'
}
```

### Test AR Mode

1. Go to http://localhost:3000/try-on
2. Switch to **"Live AR Preview"** tab
3. Allow camera access
4. Click "Add Garment"
5. Upload garment image
6. Verify extraction toast: "🌩️ Garment extracted via Cloudinary: TSHIRT (95% confidence)"
7. Verify garment appears on AR preview
8. Drag, resize, rotate garment

**Expected console output:**
```
🚀 Garment Extraction Request: {
  fileName: 'tshirt.png',
  fileSize: '245.67 KB',
  fileType: 'image/png'
}
☁️ Uploading to Cloudinary: {
  fileName: 'tshirt.png',
  fileSize: '245.67 KB',
  folder: 'garments/originals'
}
✅ Cloudinary upload success: {
  url: 'https://res.cloudinary.com/.../tshirt.png',
  uploadTime: '234ms'
}
🔗 Processing garment by URL: https://res.cloudinary.com/.../tshirt.png
✅ URL-based extraction success: {
  label: 'tshirt',
  confidence: 0.95,
  cutoutUrl: 'https://res.cloudinary.com/.../cutout_abc123.png',
  totalTime: '1234ms'
}
```

## Troubleshooting

### Issue: "Garment extraction failed" (AR Mode)

**Check:**
1. Is FastAPI backend running on port 5000?
2. Are Cloudinary credentials configured?
3. Is file size under 10MB?
4. Is file type PNG/JPEG/WEBP?

**Solution:**
```bash
# Check backend health
curl http://localhost:5000/health

# Check Cloudinary config
echo $CLOUDINARY_CLOUD_NAME
echo $CLOUDINARY_API_KEY

# Test extraction endpoint
curl -X POST http://localhost:5000/classify_garment \
  -F "garment=@tshirt.png"
```

### Issue: "Virtual try-on failed" (Photo Try-On Mode)

**Check:**
1. Is cloth_type selected?
2. Is backend running?
3. Is Gradio Space online?

**Solution:**
```bash
# Test virtual try-on endpoint
curl -X POST http://localhost:5000/virtual_tryon \
  -F "person_image=@person.jpg" \
  -F "garment_image=@tshirt.png" \
  -F "cloth_type=upper" \
  -F "num_inference_steps=50" \
  -F "guidance_scale=2.5" \
  -F "seed=42" \
  -F "process_garment=false"
```

## Summary

✅ **Photo Try-On** - Raw garment upload with validation + cloth type selector
✅ **AR Mode** - Full extraction with automatic pipeline selection
✅ **Unified Backend** - FastAPI handles both workflows
✅ **Production Ready** - Cloudinary storage, retry logic, error handling
✅ **Type Safe** - TypeScript interfaces for all API responses
✅ **User Feedback** - Toast notifications with classification metadata

The system now provides optimal user experience for both modes! 🚀
