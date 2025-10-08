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

The frontend connects to a FastAPI ML backend (CatVTON model) running on port 8000:

- **Base URL**: `http://127.0.0.1:8000` (configurable via `NEXT_PUBLIC_VTON_API_BASE`)
- **Endpoint**: `POST /process_images/`
- **Request Format**: `multipart/form-data` with 6 fields:
  - `person_image` (File): Body photo
  - `cloth_image` (File): Garment photo
  - `cloth_type` (string): 'upper' | 'lower' | 'full'
  - `num_inference_steps` (number): 20-100, default 50
  - `guidance_scale` (number): 1.0-10.0, default 2.5
  - `seed` (number): -1 to 999, default 42
- **Response**: Binary PNG image (Blob)
- **Timeout**: 60 seconds

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
- 4-step wizard: BODY → GARMENT → GENERATE → RESULT
- Upload body photo and garment image
- ML backend processing with CatVTON model
- Advanced settings: inference steps, guidance scale, seed
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
│   │   ├── PhotoWizard.tsx     # 4-step Photo HD wizard
│   │   ├── HelpModal.tsx       # Tabbed help content
│   │   ├── AboutModal.tsx      # Project info modal
│   │   └── GarmentGallery.tsx  # Categorized garment browser
│   ├── ui/                     # shadcn/ui components
│   ├── NavBar.tsx              # Navigation with try-on tabs
│   ├── ClientLayout.tsx        # Client-side wrapper with modals
│   └── StatusFooter.tsx        # FPS/status/privacy footer
├── lib/
│   ├── store/                  # Zustand state stores
│   │   └── useVtonStore.ts     # Photo HD mode state (BODY→GARMENT→GENERATE→RESULT)
│   ├── services/               # API layer
│   │   ├── http.ts             # Axios client config
│   │   └── vtonApi.ts          # ML backend API calls
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
     step: 'BODY' | 'GARMENT' | 'GENERATE' | 'RESULT';
     body: ImageSelection;              // Body photo file + preview
     garment: ImageSelection & { id?: string };
     options: VtonOptions;              // ML parameters
     status: 'idle' | 'valid' | 'uploading' | 'processing' | 'done' | 'error';
     resultUrl?: string;                // Blob URL of result image
     error?: string;

     // Actions
     tryOn: () => Promise<void>;        // Execute ML backend API call
     regenerate: () => Promise<void>;   // Re-run with same inputs
     reset: () => void;                 // Clear all state
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

6. **`PhotoWizard.tsx`** - Multi-step Photo HD flow
   - Step 1: Upload body photo
   - Step 2: Upload/select garment
   - Step 3: Advanced settings accordion
     - Inference Steps (20-100, default 50)
     - Guidance Scale (1.0-10.0, default 2.5)
     - Seed (-1 to 999, default 42)
   - Generate button → calls `tryOn()` action
   - Step 4: Result display with download/regenerate options

7. **`NavBar.tsx`** - Navigation with conditional tabs
   - Normal nav menu on non-try-on pages
   - Tab switcher on `/try-on` page (AR | Photo)
   - Help and About buttons when on try-on page

8. **`ClientLayout.tsx`** - Client-side wrapper
   - Theme provider
   - Global modals (HelpModal, AboutModal, GarmentGallery)
   - StatusFooter component

9. **`StatusFooter.tsx`** - Fixed footer
   - FPS display (AR mode only)
   - Processing status (Photo mode)
   - Privacy badge (all processing local)

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
- `@radix-ui/*`: Accessible UI primitives
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

### Testing Notes

- No test setup currently configured
- Recommend adding Jest + React Testing Library for component tests
- Consider E2E tests with Playwright for multi-step Photo wizard flow
- AR mode testing requires camera permissions (use virtual camera in CI)

### Performance Considerations

- Camera stream requires proper cleanup to avoid memory leaks
  - `stopCameraStream()` called on component unmount
  - Animation frames cancelled via `cancelAnimationFrame()`
- Object URLs from Blobs must be revoked when no longer needed
- ML backend requests have 60s timeout (can be slow on CPU)
- Image uploads are sent as File objects (no base64 encoding overhead)
- react-rnd drag/resize operations use RAF for smooth 60fps updates
- Container dimension tracking uses ResizeObserver pattern via useEffect
- Garment images preloaded to avoid layout shift during drag

### Browser Compatibility

- Camera access requires HTTPS in production (or localhost)
- MediaStream API support required for AR mode (getUserMedia)
- Modern browser with ES2020+ support
- FormData and Blob APIs required for ML backend integration
- CSS transforms (scale, rotate) for garment overlay
- Event handling: keyboard events, pointer events (drag/resize)
- Recommended browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
