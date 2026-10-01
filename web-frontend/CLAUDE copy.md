# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This project uses **pnpm** as the package manager (version 10.13.1 specified in packageManager field).

- **Development server**: `pnpm dev` (uses Turbopack, runs on http://localhost:3000)
- **Build**: `pnpm build`
- **Start production**: `pnpm start`
- **Lint**: `pnpm lint` (ESLint with TypeScript support)
- **Lint with fix**: `pnpm lint:fix` (auto-fixes issues)
- **Format**: `pnpm format` (Prettier formatting)
- **Install dependencies**: `pnpm install`

## Project Architecture

This is an AR Fashion Try-On web application built with Next.js 15, featuring a futuristic neon aesthetic and glassmorphic design. The project implements a **dual-mode virtual try-on system** with live AR preview and ML-powered photo processing.

### Key Technologies

- **Package Manager**: pnpm (specified in package.json)
- **Framework**: Next.js 15.4.2 with App Router
- **Styling**: Tailwind CSS v4 with custom glassmorphic effects
- **UI Components**: shadcn/ui with Radix UI primitives
- **State Management**: Zustand with persistence (dual stores for AR/Photo modes)
- **3D/AR Libraries**: Three.js, React Three Fiber, MediaPipe (Pose detection), react-rnd (draggable/resizable)
- **HTTP Client**: Axios for ML backend API communication
- **Fonts**: Geist Sans and Geist Mono
- **Theme System**: next-themes with dark/light mode support

### ML Backend Integration

The frontend connects to a FastAPI ML backend (CatVTON model) with multiple endpoints:

**Virtual Try-On API** (`/process_images/`):
- **Base URL**: `http://127.0.0.1:8000` (configurable via `NEXT_PUBLIC_VTON_API_BASE`)
- **Endpoint**: `POST /process_images/`
- **Request Format**: `multipart/form-data` with 6 fields:
  - `person_image` (File): Body photo - **PNG or JPEG only** (WebP auto-converted on frontend)
  - `cloth_image` (File): Garment photo - **PNG or JPEG only** (WebP auto-converted on frontend)
  - `cloth_type` (string): 'upper' | 'lower' | 'overall'
  - `num_inference_steps` (number): 20-100, default 50
  - `guidance_scale` (number): 1.0-10.0, default 2.5
  - `seed` (number): -1 to 999, default 42
- **Response**: Binary PNG image (Blob)
- **Timeout**: 60 seconds

**Garment Classification API** (`/classify-garment`):
- **Endpoint**: `POST /classify-garment`
- **Request**: Single garment image file
- **Response**: `{ label: string, confidence: number }`
- **Used for**: Auto-detecting garment types in NORMAL and FULL modes

**Outfit Construction API** (`/construct-outfit`):
- **Endpoint**: `POST /construct-outfit`
- **Request**: Upper and lower garment images
- **Response**: Combined outfit image URL, classifications for both garments
- **Used for**: FULL mode outfit preview

### Application Structure

#### Pages Structure

- `/` - Home page with card grid layout featuring Try On, Gallery, and About sections
- `/try-on` - **Dual-mode AR try-on system** (Live AR Preview + Photo Try-On HD)
- `/gallery` - Fashion gallery/catalog (currently placeholder)
- `/about` - Project information (currently placeholder)
- `/settings` - User settings with lighting effects toggle

#### Try-On System Architecture

The `/try-on` page implements two distinct modes managed by separate state stores:

**1. Live AR Preview Mode** (`activeMode: 'ar'`)
- Real-time webcam access via getUserMedia API
- Mirrored video feed for natural selfie view
- Draggable/resizable garment overlay using react-rnd
- Interactive transform controls (scale 30-300%, rotation ±45°, opacity 10-100%)
- Keyboard shortcuts (arrows for position, +/- for scale)
- Aspect ratio locking toggle
- Visual resize handles with corner indicators
- Camera error handling (permissions, not found, in use)
- State: `lib/tryon-store.ts` (AR UI state)

**2. Photo Try-On HD Mode** (`activeMode: 'photo'`)
- **Three Try-On Paths**: NORMAL (single garment), FULL (outfit construction), REFERENCE (style transfer)
- **Multi-step wizard**: PATH_SELECT → BODY → GARMENT/UPPER/LOWER → GENERATE → RESULT
- **Classification-Driven Preselection**: ML auto-detects garment types with confidence levels
  - LOCKED (≥85% confidence): Auto-selected with option to change
  - SUGGESTED (60-84% confidence): Recommended with confirm/change options
  - UNKNOWN (<60% confidence): Manual selection required
- **Client-Side Quality Validation**: Pre-upload image quality checks (resolution, brightness, aspect ratio)
- **WebP Format Conversion**: Automatic browser-side conversion of WebP images to PNG for backend compatibility
- **Camera Capture**: Upload via file or capture directly with device camera
- **Mobile UX**: Scroll indicator for small screens to ensure buttons are discoverable
- **Advanced settings**: inference steps, guidance scale, seed
- State: `lib/store/useVtonStore.ts` (Photo HD workflow state)

#### Directory Structure

```
web-frontend/
├── app/
│   ├── try-on/page.tsx         # Main try-on page with mode switching
│   ├── settings/page.tsx       # User settings
│   └── layout.tsx              # Root layout
├── components/
│   ├── tryon/                  # Try-on specific components
│   │   ├── ARStage.tsx         # Live camera preview container
│   │   ├── VideoPreview.tsx    # Webcam video feed with error handling
│   │   ├── GarmentOverlay.tsx  # Draggable/resizable garment overlay (react-rnd)
│   │   ├── ARPanel.tsx         # Garment picker + controls sidebar
│   │   ├── TransformControls.tsx # Scale/rotation/opacity sliders
│   │   ├── PhotoWizard.tsx     # Multi-path Photo HD wizard (NORMAL/FULL/REFERENCE)
│   │   ├── ClothTypeSelector.tsx # Smart cloth type selector with preselection UI
│   │   ├── ClassificationChip.tsx # Confidence indicator badges
│   │   ├── QualityTipsCard.tsx # Pre-upload guidance cards
│   │   ├── PreflightChecklist.tsx # Validation warnings before generation
│   │   ├── UploadCard.tsx      # Enhanced upload area component
│   │   ├── HelpModal.tsx       # Tabbed help content
│   │   ├── AboutModal.tsx      # Project info modal
│   │   └── GarmentGallery.tsx  # Categorized garment browser
│   ├── ui/                     # shadcn/ui components
│   │   ├── scroll-indicator.tsx # Mobile scroll-to-bottom indicator
│   │   └── tooltip.tsx         # Radix UI tooltip wrapper
│   ├── NavBar.tsx              # Navigation with try-on tabs
│   ├── ClientLayout.tsx        # Client-side wrapper with modals
│   └── StatusFooter.tsx        # FPS/status/privacy footer
├── lib/
│   ├── store/                  # Zustand state stores
│   │   └── useVtonStore.ts     # Photo HD mode state (3 paths, classification, quality)
│   ├── services/               # API layer
│   │   ├── http.ts             # Axios client config
│   │   ├── vtonApi.ts          # Virtual try-on API calls
│   │   └── garmentApi.ts       # Garment classification & outfit construction APIs
│   ├── utils/                  # Utility functions
│   │   ├── imageQuality.ts     # Client-side image quality analysis
│   │   └── imageConversion.ts  # WebP to PNG/JPEG conversion
│   ├── tryon-store.ts          # AR mode state (garments, transforms, modals)
│   ├── settings-store.ts       # Global settings (lighting effects)
│   ├── camera.ts               # Camera access utilities
│   ├── canvas.ts               # Screenshot composition
│   └── types.ts                # TypeScript type definitions
└── public/garments/            # Sample garment images
```

#### State Management Architecture

**Three separate Zustand stores** for different concerns:

1. **`lib/tryon-store.ts`** - AR Mode UI State
   ```typescript
   interface TryonState {
     activeMode: 'ar' | 'photo';        // Mode switcher
     garments: Garment[];               // Available garments
     selectedGarmentId: string | null;  // Current garment
     transform: Transform;              // Position/scale/rotation/opacity
     landmarksVisible: boolean;         // Debug overlay
     snapToShoulders: boolean;          // Auto-align feature
     poseConfidence: PoseConfidence;    // Low/Okay/Good
     status: Status;                    // FPS, processing state
     // Modal controls
     helpOpen: boolean;
     aboutOpen: boolean;
     galleryOpen: boolean;
   }
   ```

2. **`lib/store/useVtonStore.ts`** - Photo HD Workflow State
   ```typescript
   interface VtonState {
     tryOnPath: 'NORMAL' | 'FULL' | 'REFERENCE';  // Selected try-on mode
     step: 'PATH_SELECT' | 'BODY' | 'GARMENT' | 'UPPER' | 'LOWER' | 'PREVIEW' | 'GENERATE' | 'RESULT';
     body: ImageSelection;                         // Body photo + quality level
     garment: ImageSelection & {                   // Single garment (NORMAL/REFERENCE)
       id?: string;
       classification?: GarmentClassification;     // ML-detected type + confidence
     };
     upperGarment: ImageSelection & { classification?: GarmentClassification };  // FULL mode
     lowerGarment: ImageSelection & { classification?: GarmentClassification };  // FULL mode
     outfit: OutfitData;                           // Constructed outfit for FULL mode
     options: VtonOptions;                         // ML parameters
     preselectState: 'LOCKED' | 'SUGGESTED' | 'UNKNOWN';  // Cloth type preselection state
     preflight: PreflightChecks;                   // Validation checks
     status: 'idle' | 'valid' | 'uploading' | 'classifying' | 'constructing' | 'processing' | 'done' | 'error';
     resultUrl?: string;                           // Result image URL
     error?: string;

     // Actions
     setPath: (path: TryOnPath) => void;
     setBody: (file: File | undefined) => Promise<void>;  // With quality analysis
     setGarmentFile: (file: File | undefined, skipClassification?: boolean) => Promise<{ ok: boolean; message?: string }>;
     setUpperGarment: (file: File | undefined) => Promise<{ ok: boolean; message?: string }>;
     setLowerGarment: (file: File | undefined) => Promise<{ ok: boolean; message?: string }>;
     constructOutfitPreview: () => Promise<void>;   // Combine upper + lower
     tryOn: () => Promise<void>;                    // Execute ML backend API call

     // Helpers
     getAvailableClothTypes: () => ClothType[];     // Based on classification
     getDisabledClothTypes: () => { type: ClothType; reason: string }[];
     getPreselectState: () => PreselectState;       // Confidence-based state
     getPreflightChecks: () => PreflightChecks;     // Validation before generation
     canProceedToGenerate: () => boolean;
   }

   interface ImageSelection {
     file?: File;
     previewUrl?: string;
     quality?: 'GOOD' | 'OK' | 'POOR';  // Client-side quality assessment
   }

   interface GarmentClassification {
     label: string;                      // "T-Shirt", "Jeans", etc.
     confidence: number;                 // 0.0-1.0
     detectedType?: 'upper' | 'lower' | 'full';
   }
   ```

3. **`lib/settings-store.ts`** - Global User Settings
   - Lighting effects toggle
   - Persisted to localStorage

#### API Integration Pattern

**File**: `lib/services/vtonApi.ts`

```typescript
export async function processImages(
  payload: ProcessImagesPayload,
  signal?: AbortSignal,
): Promise<Blob> {
  const fd = new FormData();

  // Add person_image (body photo)
  fd.append('person_image', payload.bodyFile, payload.bodyFile.name);

  // Add cloth_image (garment photo)
  fd.append('cloth_image', payload.garmentFile, payload.garmentFile.name);

  // Add ML parameters
  fd.append('cloth_type', clothType);
  fd.append('num_inference_steps', numInferenceSteps.toString());
  fd.append('guidance_scale', guidanceScale.toString());
  fd.append('seed', seed.toString());

  // Log request (console logging pattern)
  console.log('🚀 VTON API Request:', { endpoint, person_image, cloth_image, ... });
  const startTime = Date.now();

  // POST to ML backend - returns binary image
  const { data } = await http.post<Blob>('/process_images/', fd, {
    signal,
    headers: { Accept: 'image/png, image/jpeg, image/*' },
    responseType: 'blob', // Critical: binary response
  });

  // Log success with timing
  const duration = Date.now() - startTime;
  console.log('✅ VTON API Success:', { duration: `${(duration / 1000).toFixed(2)}s`, size, type });

  return data; // Returns Blob, converted to Object URL in store
}
```

**Console Logging Pattern**: Simple, emoji-prefixed logs for debugging:
- 🚀 Request start with parameters
- ✅ Success with duration and file size
- ❌ Error with status codes
- 🔄 Reset/regenerate actions
- 🎬 Validation steps

#### Component Architecture

**Key Components**:

1. **`ARStage.tsx`** - AR preview container
   - Orchestrates VideoPreview and GarmentOverlay
   - Tracks container dimensions for responsive overlay
   - Displays camera/garment status in corner
   - Handles stream ready callback

2. **`VideoPreview.tsx`** - Webcam video feed
   - Requests camera access via `requestCameraAccess()`
   - Loading, error, and success states
   - Browser compatibility detection
   - Retry functionality for failed access
   - Mirrored video (scale-x-[-1]) for selfie view
   - "Camera Active" status indicator

3. **`GarmentOverlay.tsx`** - Draggable garment overlay
   - Uses react-rnd for drag and resize
   - Auto-calculates garment dimensions from aspect ratio
   - Keyboard shortcuts (arrows, +/-, Shift for 10x steps)
   - Visual corner handles and border feedback
   - Bounds constrained to parent container
   - Opacity conversion (0-100 → 0-1 for CSS)
   - Rotation transform with center origin

4. **`TransformControls.tsx`** - Transform sliders
   - Scale slider (30%-300%, step 0.05)
   - Rotation slider (-45° to +45°, step 1°)
   - Opacity slider (10%-100%, step 5%)
   - Aspect ratio lock toggle
   - Position display (x, y coordinates)
   - Reset button → calls `resetToBaseline()`
   - Disabled state when no garment selected

5. **`ARPanel.tsx`** - Right sidebar for AR mode
   - Garment picker (3x2 grid of thumbnails)
   - Integrates TransformControls component
   - File upload for custom PNG garments (max 5MB)
   - Remove custom garments (IDs starting with 'custom-')
   - Guides section (snap to shoulders, pose confidence)
   - Clear all button

6. **`PhotoWizard.tsx`** - Multi-path Photo HD flow
   - **Path Selection**: Choose NORMAL, FULL, or REFERENCE mode
   - **NORMAL Path**: Single garment try-on
     - Body photo upload with quality analysis
     - Garment upload with automatic ML classification
     - Smart cloth type preselection based on confidence
   - **FULL Path**: Complete outfit construction
     - Body photo upload
     - Upper garment upload with classification
     - Lower garment upload with classification
     - Outfit preview (combined upper + lower)
   - **REFERENCE Path**: Style transfer from reference photo
     - Body photo upload
     - Full-body reference photo upload (no classification)
   - **Camera Capture**: Upload via file picker or device camera
   - **Quality Tips**: Collapsible guidance cards before upload
   - **Advanced Settings**: Inference steps, guidance scale, seed
   - **Preflight Validation**: Warns about quality issues before generation
   - **Mobile Scroll Indicator**: "Scroll down" indicator for small screens
   - Result display with download (opens in new window) and regenerate options

7. **`ClothTypeSelector.tsx`** - Smart cloth type selector
   - Three states: LOCKED (high confidence), SUGGESTED (medium), UNKNOWN (low)
   - Visual indicators for preselected types (green check, amber suggestion, gray unknown)
   - Disabled cloth types with tooltip explanations
   - Confidence badge display for detected garments

8. **`ClassificationChip.tsx`** - Garment classification display
   - Color-coded confidence badges (green ≥85%, amber 60-84%, gray <60%)
   - Shows detected garment label and confidence percentage

9. **`QualityTipsCard.tsx`** - Pre-upload guidance
   - Collapsible tip cards for body and garment photos
   - Context-specific tips based on try-on path

10. **`PreflightChecklist.tsx`** - Validation warnings
    - Shows failed validation checks before generation
    - Resolution, brightness, required images, cloth type selection

11. **`ScrollIndicator.tsx`** - Mobile scroll helper
    - Auto-detects scrollable content below viewport
    - Animated bounce indicator with "Scroll down" text
    - Hides after scroll or when at bottom
    - Mobile-only (hidden on desktop)

12. **`NavBar.tsx`** - Navigation with conditional tabs
    - Normal nav menu on non-try-on pages
    - Tab switcher on `/try-on` page (AR | Photo)
    - Help and About buttons when on try-on page

13. **`ClientLayout.tsx`** - Client-side wrapper
    - Theme provider
    - Global modals (HelpModal, AboutModal, GarmentGallery)
    - StatusFooter component

14. **`StatusFooter.tsx`** - Fixed footer
    - FPS display (AR mode only)
    - Processing status (Photo mode)
    - Privacy badge (all processing local)

### WebP Conversion System

**Problem**: Backend ML API doesn't support WebP image format

**Solution**: Automatic browser-side conversion using Canvas API

**Implementation** (`lib/utils/imageConversion.ts`):
- **`ensureBackendCompatibleFormat(file)`** - Main function used in all upload methods
  - Detects WebP by MIME type (`image/webp`) or extension (`.webp`)
  - Converts WebP → PNG using Canvas API (100-300ms typical)
  - Passes through PNG/JPEG unchanged
  - Returns: `{ file: File, converted: boolean, originalFormat?: string }`
- **`convertImageFormat(file, targetFormat, quality)`** - Core conversion logic
  - Loads image into `<img>` element via Object URL
  - Draws to `<canvas>` element
  - Converts canvas to Blob (PNG or JPEG)
  - Creates new File with updated extension
- **User Feedback**: Toast notification "Converted WEBP to PNG for backend compatibility"
- **Console Logging**: Detailed metrics (original size, converted size, duration)

**Integration Points** (all in `lib/store/useVtonStore.ts`):
- `setBody()` - Body photo upload
- `setGarmentFile()` - Single garment upload (NORMAL/REFERENCE)
- `setUpperGarment()` - Upper garment (FULL mode)
- `setLowerGarment()` - Lower garment (FULL mode)

**Supported Formats**:
- ✅ PNG - Native support (no conversion)
- ✅ JPEG/JPG - Native support (no conversion)
- ✅ WebP - Auto-converted to PNG

**Documentation**: See `WEBP_CONVERSION.md` for detailed implementation guide

### Image Quality Validation System

**Client-Side Quality Analysis** (`lib/utils/imageQuality.ts`):

**`analyzeImageQuality(file, expectedAspect?, tolerance?)`** - Main analysis function
- **Resolution Check**:
  - ✅ GOOD: ≥1024px width/height
  - ⚠️ OK: 800-1024px
  - ❌ POOR: <800px
- **Brightness Check** (Luma analysis):
  - ✅ GOOD: Average luma 50-230
  - ❌ POOR: <50 (too dark) or >230 (overexposed)
- **Aspect Ratio Check**:
  - Validates against expected ratio (e.g., 3:4 for body photos)
  - Tolerance: ±30% by default
- **Returns**: `{ level: 'GOOD' | 'OK' | 'POOR', checks: {...}, suggestions: [...] }`

**Integration**:
- `setBody()` analyzes quality on upload
- Quality badge displayed on image preview
- Preflight validation warns if quality is POOR

**Quality Tips**:
- Body photos: Front-facing, shoulders visible, good lighting, plain background, ≥1024px
- Garment photos: Front view, flat or on hanger, plain background, centered, ≥1024px

### Mobile UX Enhancements

**Scroll Indicator** (`components/ui/scroll-indicator.tsx`):
- **Purpose**: Ensure buttons below fold are discoverable on small screens
- **Auto-Detection**: Checks if container has scrollable content
- **Visual Design**: Animated bounce, "Scroll down" text, ChevronDown icon
- **Behavior**:
  - Appears when content extends below viewport
  - Hides after first scroll
  - Hides when within 50px of bottom
  - Click to smooth scroll to bottom
- **Display**: Mobile/tablet only (hidden on desktop via `md:hidden`)
- **Styling**: Black semi-transparent with backdrop blur, matches app aesthetic

**Camera Capture Integration**:
- Upload via file picker OR capture with device camera
- Body photo: Front-facing camera (selfie mode)
- Garment photo: Rear-facing camera
- Video preview with capture button
- JPEG output at 95% quality

### Styling Patterns

- Glassmorphic design with `backdrop-blur` effects
- Dynamic background lighting controlled by settings
- Responsive grid layouts using Tailwind CSS
- Custom color blending backgrounds with conditional rendering
- Consistent card-based layouts with transparency effects
- Dark/light mode support via next-themes

### Environment Configuration

Create `.env.local` (see `.env.local.example`):

```bash
# ML Backend API URL
NEXT_PUBLIC_VTON_API_BASE=http://127.0.0.1:8000

# For production:
# NEXT_PUBLIC_VTON_API_BASE=https://ml-api.your-domain.com
```

### Development Notes

**Client/Server Boundary**:
- ClientLayout handles client-side logic (theme, modals)
- All pages use consistent glassmorphic styling
- Camera access requires client-side mounting checks (`useIsMounted`)

**State Management Best Practices**:
- AR mode and Photo mode use separate stores (clean separation)
- Settings are globally applied through settings store
- Photo mode store handles Blob URL lifecycle (revoke on reset)

**API Integration Best Practices**:
- Always check for trailing slash on endpoints (`/process_images/`)
- Handle binary responses with `responseType: 'blob'`
- Convert Blob to Object URL for display: `URL.createObjectURL(blob)`
- Revoke Object URLs on cleanup to prevent memory leaks
- Use AbortController for cancellable requests

**Type Safety**: TypeScript strict mode enabled with custom types in `lib/types.ts`

**Code Quality**: ESLint configured with Next.js, TypeScript, and Prettier plugins

**Import Aliases**: `@/*` maps to project root for clean imports

### AR Mode Implementation Details

**Camera Access** (`lib/camera.ts`):
- `requestCameraAccess()` - Requests webcam with ideal settings (1280x720, 30fps)
- `stopCameraStream(stream)` - Properly stops all media tracks
- `checkCameraSupport()` - Detects getUserMedia API support
- Error types: permission-denied, not-found, not-readable, overconstrained, unknown
- Console logging with emoji indicators (✅ granted, ❌ error, 🛑 stopped)

**Garment Overlay**:
- Default transform position: x=320, y=180 (upper chest area)
- Default scale: 1.0, opacity: 90%, rotation: 0°
- Aspect ratio calculated from loaded image dimensions
- Base width: 200px, height auto-calculated
- react-rnd bounds: "parent" (constrained to video container)
- Resize handles: topLeft, topRight, bottomLeft, bottomRight, right, bottom

**Keyboard Shortcuts** (GarmentOverlay component):
- Arrow keys: Move garment (1px step, 10px with Shift)
- `+` / `=`: Increase scale (+0.05, max 3.0)
- `-`: Decrease scale (-0.05, min 0.3)
- Shortcuts only active when garment is selected

**Sample Garments**:
- White T-Shirt (sample-1)
- Black Hoodie (sample-2)
- Denim Jacket (sample-3)
- All garments: 512x512px, stored in `public/garments/`
- Custom garments: User uploads with ID prefix 'custom-{timestamp}'

### MediaPipe Integration

The project includes MediaPipe dependencies for pose detection, indicating planned AR functionality:

- `@mediapipe/camera_utils`
- `@mediapipe/pose`

**Note**: Not yet fully integrated in AR mode components.

### Project Constants

The application uses centralized configuration in `lib/constants.ts`:
- **features**: Homepage feature cards with icons, routes, and gradients
- **highlights**: Key selling points displayed on homepage
- **navigationItems**: Navigation menu structure
- **performanceOptions** & **languageOptions**: Settings configurations

### Custom Hooks

- `useMount` (lib/hooks/useMount.ts): Client-side mount detection for hydration safety
- `useSettings` (lib/hooks/useSettings.ts): Wrapper for settings store access

### TypeScript Types

**Key type definitions in `lib/types.ts`**:

```typescript
export type ClothType = 'upper' | 'lower' | 'full';

export interface VtonOptions {
  removeBg?: boolean;
  clothType?: ClothType;
  numInferenceSteps?: number;  // 20-100, default 50
  guidanceScale?: number;      // 1.0-10.0, default 2.5
  seed?: number;               // -1 to 999, default 42 (-1 = random)
}

export interface Garment {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
  sizeKb: number;
  category?: 'tops' | 'jackets' | 'misc';
}

export interface Transform {
  x: number;          // Pixels from left
  y: number;          // Pixels from top
  scale: number;      // 0.3 to 3.0 (30% to 300%)
  rotation: number;   // -45 to 45 degrees
  opacity: number;    // 0 to 100 (percentage)
  lockAspect: boolean;
}

export interface VtonProcessResponse {
  result_image?: string;       // base64 encoded image
  processed_image?: string;    // alternative field name
  image?: string;              // alternative field name
  success?: boolean;
  message?: string;
  error?: string;
}
```

### Key Dependencies

**AR/Camera**:
- `react-rnd`: ^10.5.2 - Draggable and resizable component
- `@mediapipe/camera_utils`: Camera utilities (planned integration)
- `@mediapipe/pose`: Pose detection (planned integration)

**UI Framework**:
- `next`: 15.4.2 - React framework with App Router
- `react`: ^19 - UI library
- `@radix-ui/*`: Accessible UI primitives (includes tooltip, accordion, dialog, etc.)
  - `@radix-ui/react-tooltip`: ^1.2.8 - Tooltip component for disabled option explanations
- `tailwindcss`: ^4 - Utility-first CSS
- `next-themes`: Dark/light mode theming

**State & Data**:
- `zustand`: ^5.0.2 - Lightweight state management
- `axios`: HTTP client for API calls

**Utilities**:
- `lucide-react`: Icon library
- `sonner`: Toast notifications
- `class-variance-authority`: Component variants
- `clsx` + `tailwind-merge`: Conditional styling

### Documentation

The project includes comprehensive documentation for recent features:

1. **`WEBP_CONVERSION.md`** - WebP to PNG conversion system
   - Complete implementation guide (550+ lines)
   - Technical details, testing procedures, performance characteristics
   - Browser compatibility notes and future enhancements

2. **`SEO_IMPROVEMENTS.md`** - SEO and metadata optimization
   - Complete SEO implementation documentation
   - Open Graph, Twitter Cards, structured data, sitemap
   - Testing tools and verification steps
   - Asset requirements and design specifications

3. **This file** (`CLAUDE.md`) - Development guide
   - Architecture overview, component documentation
   - State management patterns, API integration
   - Recent feature implementations and best practices

### Testing Notes

**Current Setup**:
- No automated test setup currently configured
- Manual testing for Photo HD wizard and WebP conversion

**Recommended Testing Stack**:
- **Unit Tests**: Jest + React Testing Library for component tests
- **E2E Tests**: Playwright for multi-step Photo wizard flow
- **Visual Regression**: Chromatic or Percy for UI consistency
- **AR Mode Testing**: Requires camera permissions (use virtual camera in CI)

**Testing Scenarios to Cover**:
1. WebP conversion: Upload WebP → Verify conversion toast → Verify try-on works
2. Quality validation: Upload low-res image → Verify quality badge and warnings
3. Classification: Upload garment → Verify ML classification → Verify preselection
4. Multi-path flows: Test NORMAL, FULL, and REFERENCE paths end-to-end
5. Mobile scroll indicator: Verify appearance and dismissal on small screens
6. Camera capture: Test body and garment photo capture with device cameras

### Performance Considerations

- **Camera stream** requires proper cleanup to avoid memory leaks
  - `stopCameraStream()` called on component unmount
  - Animation frames cancelled via `cancelAnimationFrame()`
- **Object URLs** from Blobs must be revoked when no longer needed
- **ML backend requests** have 60s timeout (can be slow on CPU)
- **Image uploads** are sent as File objects (no base64 encoding overhead)
- **WebP conversion** adds 100-300ms overhead but necessary for backend compatibility
  - Conversion runs asynchronously to avoid blocking UI
  - Progress shown via toast notifications
- **Image quality analysis** runs on upload (minimal overhead, ~50-100ms)
- **react-rnd** drag/resize operations use RAF for smooth 60fps updates
- **Container dimension tracking** uses ResizeObserver pattern via useEffect
- **Garment images** preloaded to avoid layout shift during drag
- **Scroll indicator** uses passive event listeners for optimal scroll performance

### Browser Compatibility

- **Camera access** requires HTTPS in production (or localhost)
- **MediaStream API** support required for AR mode (getUserMedia)
- **Canvas API** required for WebP conversion (supported in all modern browsers)
- **ES2020+** support required for modern JavaScript features
- **FormData and Blob APIs** required for ML backend integration
- **CSS transforms** (scale, rotate) for garment overlay
- **ResizeObserver** for responsive container tracking
- **Event handling**: keyboard events, pointer events (drag/resize), scroll events
- **Recommended browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### Known Limitations

1. **Backend doesn't support WebP**: Frontend automatically converts (users may not notice)
2. **AR mode MediaPipe**: Pose detection dependencies included but not yet fully integrated
3. **No automated tests**: Manual testing required for now
4. **Camera capture**: Requires HTTPS in production (works on localhost for development)
5. **Mobile performance**: WebP conversion may be slower on lower-end devices (100-500ms)
