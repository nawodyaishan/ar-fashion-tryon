# Frontend Implementation Report
## Diffusion-Based Virtual Try-On System

---

## 1. System Architecture Overview

### 1.1 Technology Stack
The frontend is built using modern web technologies optimized for real-time image processing and ML integration:

- **Framework**: Next.js 15.4.2 with App Router and React 19
- **Package Manager**: pnpm (v10.13.1)
- **State Management**: Zustand with localStorage persistence
- **Styling**: Tailwind CSS v4 with glassmorphic design system
- **UI Components**: shadcn/ui with Radix UI primitives
- **HTTP Client**: Axios for ML backend communication
- **Image Processing**: Canvas API for client-side conversions

### 1.2 Multi-Mode Try-On Architecture
The system implements three distinct virtual try-on paths:

**NORMAL Mode** - Single garment try-on (shirt, pants, or dress)
- Single garment upload with ML classification
- Automatic garment type detection (upper/lower/overall)
- Confidence-based cloth type preselection

**FULL Mode** - Complete outfit construction
- Separate upper and lower garment uploads
- Server-side outfit composition via `/construct_outfit` API
- Combined outfit preview before try-on generation

**REFERENCE Mode** - Style transfer from full-body reference
- Full-body reference photo as style guide
- No garment classification required
- Experimental style transfer approach

### 1.3 Multi-Step Wizard Flow
Each mode follows a sequential wizard pattern:

```
PATH_SELECT → BODY → GARMENT/UPPER/LOWER → PREVIEW → GENERATE → RESULT
```

- **PATH_SELECT**: Choose try-on mode (NORMAL/FULL/REFERENCE)
- **BODY**: Upload body photo with quality validation
- **GARMENT**: Upload garment(s) with ML classification
- **PREVIEW**: Review constructed outfit (FULL mode only)
- **GENERATE**: Configure ML parameters and execute try-on
- **RESULT**: View, download, or regenerate result

---

## 2. API Layer Implementation

### 2.1 Virtual Try-On API Service
Location: `lib/services/vtonApi.ts`

**Primary Endpoint**: `POST /process_images/`

```typescript
export async function processImages(
  payload: ProcessImagesPayload,
  signal?: AbortSignal,
): Promise<Blob>
```

**Request Format** (multipart/form-data):
- `person_image` (File): Body photo - PNG/JPEG only
- `cloth_image` (File): Garment photo - PNG/JPEG only
- `cloth_type` (string): 'upper' | 'lower' | 'overall'
- `num_inference_steps` (number): 20-100, default 50
- `guidance_scale` (number): 1.0-10.0, default 2.5
- `seed` (number): -1 to 999, default 42

**Response**: Binary PNG image (Blob)

**Key Implementation Details**:
- 60-second timeout for ML processing
- Binary response handling with `responseType: 'blob'`
- Automatic WebP to PNG conversion before upload
- Structured console logging with emoji indicators (🚀, ✅, ❌)

### 2.2 Garment Classification API
Location: `lib/services/garmentApi.ts`

**Endpoint**: `POST /detect_garment_type`

```typescript
export async function detectGarmentType(
  file: File,
  signal?: AbortSignal,
): Promise<{
  label: string;
  confidence: number;
  filename: string;
}>
```

**Purpose**: Lightweight classification without background removal

**Classification Mapping**:
- Labels containing "SHIRT", "TOP", "JACKET" → `upper`
- Labels containing "TROUSER", "PANT", "JEAN" → `lower`
- Labels containing "DRESS", "GOWN", "SUIT" → `full`

**Confidence Thresholds**:
- ≥85%: LOCKED (auto-selected, changeable)
- 60-84%: SUGGESTED (recommended, confirm/change)
- <60%: UNKNOWN (manual selection required)

### 2.3 Outfit Construction API
Location: `lib/services/garmentApi.ts`

**Endpoint**: `POST /construct_outfit`

```typescript
export async function constructOutfit(
  upperGarment: File,
  lowerGarment: File,
  signal?: AbortSignal,
): Promise<{
  outfit: { url: string; public_id: string };
  upper_garment: { label: string; confidence: number };
  lower_garment: { label: string; confidence: number };
}>
```

**Process Flow**:
1. Upload upper and lower garment files
2. Backend classifies both garments
3. Backend composes outfit image (upper + lower merged)
4. Returns Cloudinary URLs for all images
5. Frontend displays outfit preview
6. User proceeds to GENERATE step with composed outfit

---

## 3. State Management Layer

### 3.1 VTON Store Architecture
Location: `lib/store/useVtonStore.ts`

Built with Zustand for reactive state management across wizard steps.

**Core State Interface**:
```typescript
interface VtonState {
  // Path & Navigation
  tryOnPath: 'NORMAL' | 'FULL' | 'REFERENCE';
  step: 'PATH_SELECT' | 'BODY' | 'GARMENT' | 'UPPER' | 'LOWER' |
        'PREVIEW' | 'GENERATE' | 'RESULT';

  // Image Selections
  body: ImageSelection;
  garment: ImageSelection & { classification?: GarmentClassification };
  upperGarment: ImageSelection & { classification?: GarmentClassification };
  lowerGarment: ImageSelection & { classification?: GarmentClassification };

  // Outfit Data (FULL mode)
  outfit: OutfitData;

  // ML Parameters
  options: VtonOptions;

  // Processing State
  status: 'idle' | 'valid' | 'classifying' | 'constructing' |
          'processing' | 'done' | 'error';
  resultUrl?: string;
  error?: string;
}
```

### 3.2 Key State Actions

**Image Upload with Quality Analysis**:
```typescript
setBody: async (file: File | undefined) => {
  // 1. WebP to PNG conversion if needed
  const { file: processedFile, converted } = await ensureBackendCompatibleFormat(file);

  // 2. Client-side quality analysis
  const qualityCheck = await analyzeImageQuality(processedFile, 3/4, 0.4);

  // 3. Store with preview URL and quality level
  set({
    body: {
      file: processedFile,
      previewUrl: URL.createObjectURL(processedFile),
      quality: qualityCheck.level // 'GOOD' | 'OK' | 'POOR'
    }
  });
}
```

**Garment Upload with Classification**:
```typescript
setGarmentFile: async (file: File | undefined, skipClassification = false) => {
  // 1. Validate file type and size
  // 2. Convert WebP to PNG if needed
  // 3. Create preview URL
  // 4. Call detectGarmentType API
  const classification = await detectGarmentType(file);

  // 5. Map label to detected type
  const detectedType = mapLabelToType(classification.label);

  // 6. Auto-preselect cloth type based on confidence
  if (classification.confidence >= 0.6) {
    set({
      options: {
        clothType: detectedType === 'full' ? 'overall' : detectedType
      }
    });
  }
}
```

**Try-On Execution**:
```typescript
tryOn: async () => {
  // 1. Prepare garment file (single or constructed outfit)
  let garmentFileForTryOn: File;
  if (tryOnPath === 'FULL') {
    // Download constructed outfit as File
    const response = await fetch(outfit.url);
    const blob = await response.blob();
    garmentFileForTryOn = new File([blob], 'outfit.png', { type: 'image/png' });
  } else {
    garmentFileForTryOn = garment.file;
  }

  // 2. Call virtual try-on API
  const response = await virtualTryOn({
    bodyFile: body.file,
    garmentFile: garmentFileForTryOn,
    clothType: options.clothType,
    options: {
      numInferenceSteps: options.numInferenceSteps ?? 50,
      guidanceScale: options.guidanceScale ?? 2.5,
      seed: options.seed ?? 42,
    }
  });

  // 3. Store result URL and transition to RESULT step
  set({ resultUrl: response.result_url, step: 'RESULT', status: 'done' });
}
```

### 3.3 Preflight Validation System
Before generation, the system validates:

```typescript
getPreflightChecks: () => ({
  resolutionOK: body.quality !== 'POOR',
  brightnessOK: body.quality !== 'POOR',
  requiredImagesOK: !!body.file && (tryOnPath === 'FULL' ? !!outfit.url : !!garment.file),
  clothTypeSelected: !!options.clothType,
  outfitReady: tryOnPath === 'FULL' ? !!outfit.url : true,
})
```

---

## 4. UI Component Implementation

### 4.1 PhotoWizard Component
Location: `components/tryon/PhotoWizard.tsx` (1690 lines)

**Responsive Layout Strategy**:
- Mobile/Tablet (<1280px): Stacked vertical layout
- Desktop (≥1280px): 3-rail grid layout (Controls | Preview | Actions)

**Step-by-Step UI Flow**:

**PATH_SELECT Step**:
```tsx
<div className="grid gap-3 sm:gap-4">
  {/* NORMAL Path Card */}
  <Card onClick={() => setPath('NORMAL')}>
    <Shirt icon /> Single Garment
    <Badge>Recommended</Badge>
  </Card>

  {/* FULL Path Card */}
  <Card onClick={() => setPath('FULL')}>
    <Layers icon /> Complete Outfit
    <Badge>Advanced</Badge>
  </Card>

  {/* REFERENCE Path Card */}
  <Card onClick={() => setPath('REFERENCE')}>
    <User icon /> Full Reference
    <Badge>Experimental</Badge>
  </Card>
</div>
```

**BODY Step**:
- File upload via drag-and-drop or file picker
- Camera capture with front-facing camera (selfie mode)
- Real-time quality badge display (GOOD/OK/POOR)
- Collapsible quality tips card with best practices

**GARMENT Step (NORMAL/REFERENCE)**:
- File upload or rear-facing camera capture
- Automatic ML classification with confidence display
- Classification chip showing detected type and confidence
- Loading state during classification

**GENERATE Step (3-Rail Desktop Layout)**:
```tsx
<div className="grid grid-cols-12 gap-6">
  {/* LEFT RAIL - Controls (3 cols) */}
  <div className="col-span-3">
    <ClothTypeSelector />
    <PreflightChecklist />
  </div>

  {/* CENTER RAIL - Preview (6 cols) */}
  <div className="col-span-6">
    <div className="grid grid-cols-2 gap-4">
      <Card>Body Photo Preview</Card>
      <Card>Garment Preview</Card>
    </div>
  </div>

  {/* RIGHT RAIL - Actions (3 cols) */}
  <div className="col-span-3">
    <Button onClick={handleGenerate}>Generate Try-On</Button>
    <Progress value={progress} />
    <Accordion>Advanced Settings</Accordion>
  </div>
</div>
```

### 4.2 Smart Cloth Type Selector
Location: `components/tryon/ClothTypeSelector.tsx`

**Three Visual States**:
1. **LOCKED** (≥85% confidence): Green check icon, auto-selected
2. **SUGGESTED** (60-84% confidence): Amber suggestion icon, confirm/change
3. **UNKNOWN** (<60% confidence): Gray icon, manual selection

**Disabled Types with Tooltips**:
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>
      <Button disabled>Lower</Button>
    </TooltipTrigger>
    <TooltipContent>
      Lower garments not compatible with detected upper
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### 4.3 Camera Capture Integration
**Body Photo Capture**:
```typescript
const startBodyCamera = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: 1280, height: 720 }
  });
  bodyVideoRef.current.srcObject = stream;
};

const captureBodyPhoto = () => {
  const canvas = bodyCanvasRef.current;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bodyVideoRef.current, 0, 0);

  canvas.toBlob((blob) => {
    const file = new File([blob], `body-${Date.now()}.jpg`, { type: 'image/jpeg' });
    setBody(file);
  }, 'image/jpeg', 0.95);
};
```

**Garment Photo Capture**:
- Rear-facing camera (`facingMode: 'environment'`)
- Same Canvas API workflow
- Automatic classification after capture

### 4.4 Progress Tracking System
**Animated Progress Indicator**:
```tsx
<AnimatePresence mode="wait">
  {status === 'processing' && (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <Card className="p-4">
        <Progress value={progress} className="h-2" />
        <motion.span animate={{ scale: [1, 1.2, 1] }}>
          {progress}%
        </motion.span>
        <span>This may take 30-60 seconds...</span>
      </Card>
    </motion.div>
  )}
</AnimatePresence>
```

**Progress Stages**:
- Classifying: 20%
- Constructing: 40%
- Uploading: 50%
- Processing: 60% → 90% (incremental)
- Done: 100%

---

## 5. Advanced Features

### 5.1 Image Quality Validation
Location: `lib/utils/imageQuality.ts`

**Client-Side Analysis**:
```typescript
export async function analyzeImageQuality(
  file: File,
  expectedAspect?: number,
  tolerance: number = 0.3,
): Promise<QualityCheck>
```

**Quality Checks**:
1. **Resolution Check**:
   - GOOD: ≥1024px width/height
   - OK: 800-1024px
   - POOR: <800px

2. **Brightness Check** (Luma Analysis):
   - GOOD: Average luma 50-230
   - POOR: <50 (too dark) or >230 (overexposed)

3. **Aspect Ratio Check**:
   - Body photos: Expected 3:4 (portrait)
   - Tolerance: ±30% by default

**Implementation**:
```typescript
const checkBrightness = (img: HTMLImageElement) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 100; // Sample size
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, 100, 100);

  const imageData = ctx.getImageData(0, 0, 100, 100);
  const data = imageData.data;

  let totalLuma = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    totalLuma += luma;
  }

  const avgLuma = totalLuma / (100 * 100);
  return { ok: avgLuma >= 50 && avgLuma <= 230, avgLuma };
};
```

### 5.2 WebP Format Conversion
Location: `lib/utils/imageConversion.ts`

**Problem**: Backend ML API doesn't support WebP format

**Solution**: Automatic browser-side conversion using Canvas API

```typescript
export async function ensureBackendCompatibleFormat(
  file: File
): Promise<{ file: File; converted: boolean; originalFormat?: string }> {
  // Detect WebP by MIME type or extension
  const isWebP = file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp');

  if (!isWebP) {
    return { file, converted: false };
  }

  // Convert WebP to PNG
  const convertedFile = await convertImageFormat(file, 'image/png', 1.0);

  toast.success('Converted WEBP to PNG for backend compatibility');

  return {
    file: convertedFile,
    converted: true,
    originalFormat: 'WEBP'
  };
}
```

**Conversion Process**:
1. Load WebP into `<img>` element via Object URL
2. Draw to `<canvas>` element
3. Convert canvas to PNG Blob via `canvas.toBlob()`
4. Create new File with `.png` extension
5. Display toast notification to user

**Performance**: 100-300ms typical conversion time

### 5.3 Mobile UX Enhancements
**Scroll Indicator** (`components/ui/scroll-indicator.tsx`):
- Auto-detects scrollable content below viewport
- Animated bounce with "Scroll down" text
- Hides after first scroll or when at bottom
- Mobile/tablet only (`md:hidden`)

**Touch Optimizations**:
- Large touch targets (min 44x44px)
- Active state scaling (`active:scale-[0.98]`)
- Swipe-friendly wizard navigation
- Sticky footer navigation buttons

### 5.4 Advanced ML Parameters
**Configurable Options**:
```typescript
interface VtonOptions {
  clothType: 'upper' | 'lower' | 'overall';
  numInferenceSteps: number;  // 20-100, affects quality/speed
  guidanceScale: number;      // 1.0-10.0, affects adherence to prompt
  seed: number;               // -1 to 999, -1 = random
}
```

**UI Integration**:
- Collapsed accordion on mobile (save space)
- Sliders with real-time value display
- Disabled during processing
- Default values optimized for balance

---

## Conclusion

This implementation provides a production-ready, multi-mode virtual try-on system with:
- **3 try-on paths** (NORMAL, FULL, REFERENCE) for different use cases
- **ML-powered classification** with confidence-based preselection
- **Client-side quality validation** before processing
- **Responsive 3-rail layout** optimized for desktop workflows
- **Mobile-first design** with touch optimizations and camera capture
- **Automatic format conversion** for backend compatibility
- **Real-time progress tracking** with animated feedback
- **Preflight validation** to ensure successful generation

The architecture separates concerns cleanly across API, state, and UI layers, making it maintainable and extensible for future enhancements.
