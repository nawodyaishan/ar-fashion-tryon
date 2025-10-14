# Garment Processing Integration Guide

## Overview

The AR Try-On frontend now integrates with the backend `/process/garment/top` endpoint to automatically process uploaded garments for AR use. This provides background removal, anchor point detection, neck cutting, and AR-ready metadata.

---

## 🎯 Features

### 1. **Two-Step Processing Pipeline**
1. **Extraction** - Background removal + garment classification
2. **AR Processing** - Anchor detection + neck cut + metadata generation

### 2. **Automatic Anchor Point Detection**
- **collar_left** - Left shoulder point of collar
- **collar_right** - Right shoulder point of collar
- **neck_apex** - Highest point of neckline

### 3. **AR-Ready Output**
- Transparent PNG with neck region cut
- Normalized anchor coordinates (0-1 range)
- Body offset heuristics for alignment
- Cloudinary-hosted processed image

### 4. **Graceful Fallback**
- If AR processing fails, uses extracted version
- If extraction fails, shows clear error message
- Metadata defaults for non-AR garments

---

## 📁 Files Created/Modified

### Created (1 file)
```
lib/services/
└── garmentProcessingApi.ts  # NEW: API service for /process/garment/top
```

### Modified (2 files)
```
components/tryon/
└── ARPanel.tsx              # Integrated AR processing into upload flow

lib/services/
└── metadata.ts              # Added saveLocalMetadata function
```

---

## 🔧 API Integration

### Service: `garmentProcessingApi.ts`

#### Main Functions

**1. processGarment()**
```typescript
const result = await processGarment(file, {
  category: 'shirt' | 'tshirt',
  upload: true,              // Upload to Cloudinary
  useDefaults: true,         // Use default anchors
  anchors: {...}             // Optional custom anchors
});
```

**Returns:**
```typescript
{
  status: 'ok' | 'error',
  meta: {
    version: 1,
    category: 'shirt' | 'tshirt',
    w: 746,                  // Width in pixels
    h: 1012,                 // Height in pixels
    anchors: {
      collar_left: [0.312, 0.128],
      collar_right: [0.688, 0.128],
      neck_apex: [0.500, 0.184]
    },
    body_offsets: {
      neck_drop_ratio: 0.06,
      torso_length_ratio: 1.05
    }
  },
  urls: {
    processed_png: "https://res.cloudinary.com/.../processed/abc.png",
    public_id: "garments/processed/abc"
  }
}
```

**2. validateGarmentFile()**
```typescript
const validation = validateGarmentFile(file);
if (!validation.valid) {
  toast.error(validation.error);
  return;
}
```

Validates:
- File type (JPEG, PNG, WebP)
- File size (10KB - 10MB)

**3. convertToFrontendMetadata()**
```typescript
const metadata = convertToFrontendMetadata(
  garmentId,
  displayName,
  backendMeta
);
saveLocalMetadata(metadata);
```

Converts backend metadata format to frontend `GarmentMetadata` type.

---

## 🔄 Upload Flow

### Complete Process

```
1. User selects image
   ↓
2. File validation (size, type)
   ↓
3. STEP 1: Extract garment
   - Background removal
   - Garment classification
   - Cloudinary upload
   ↓
4. STEP 2: AR processing
   - Anchor point detection
   - Neck region cutting
   - Auto-crop to bounds
   - Re-normalize anchors
   - Cloudinary upload (processed PNG)
   ↓
5. Create garment object
   - Use processed PNG as src
   - Store dimensions from metadata
   - Mark as processed: true
   ↓
6. Save metadata to localStorage
   - Anchor points
   - Body offsets
   - Dimensions
   ↓
7. Add to garment store
   ↓
8. Select garment for AR use
```

### Code Flow in ARPanel

```typescript
// Step 1: Extract garment
const { result, extractedFile } = await extractGarmentSmart(file);

// Step 2: Process for AR
const category = result.classification?.label === 'tshirt' ? 'tshirt' : 'shirt';
const processedResult = await processGarment(extractedFile, {
  category,
  upload: true,
  useDefaults: true
});

// Step 3: Use processed PNG
const processedSrc = processedResult.urls.processed_png;

// Step 4: Save metadata
const metadata = convertToFrontendMetadata(
  garmentId,
  garmentName,
  processedResult.meta
);
saveLocalMetadata(metadata);

// Step 5: Add garment
addGarment({
  id: garmentId,
  src: processedSrc,  // AR-processed PNG
  processed: true,    // Mark as AR-ready
  ...
});
```

---

## 📊 Metadata Format

### Backend Response
```json
{
  "meta": {
    "version": 1,
    "category": "shirt",
    "w": 746,
    "h": 1012,
    "anchors": {
      "collar_left": [0.312, 0.128],
      "collar_right": [0.688, 0.128],
      "neck_apex": [0.500, 0.184]
    },
    "body_offsets": {
      "neck_drop_ratio": 0.06,
      "torso_length_ratio": 1.05
    }
  }
}
```

### Frontend GarmentMetadata
```typescript
{
  id: "custom-1234567890",
  version: 1,
  displayName: "My Shirt",
  width: 746,
  height: 1012,
  anchors: {
    collar_left: [0.312, 0.128],
    collar_right: [0.688, 0.128],
    hem_center: [0.5, 0.88],      // Default
    neck_apex: [0.500, 0.184]     // From backend
  },
  body_offsets: {
    neck_drop_ratio: 0.06,
    torso_length_ratio: 1.05
  }
}
```

### LocalStorage Key
```
garment-metadata-custom-1234567890
```

---

## 🎨 UI Changes

### Button Label
**Before:** "Add Garment"
**After:** "Add AR Garment"

### Loading States
1. **"Extracting garment..."** - During background removal
2. **"Processing for AR..."** - During anchor detection
3. **"Processing..."** - Generic loading state (button)

### Toast Notifications

**Success:**
```
🌩️ AR-ready garment processed! TSHIRT detected with anchors
```

**Fallback (if AR processing fails):**
```
⚠️ AR processing failed, using extracted version
```

**Error:**
```
❌ Failed to process garment
```

---

## 🧪 Testing

### Test Cases

**1. Upload Shirt Image**
```
Steps:
1. Click "Add AR Garment"
2. Select a shirt/tshirt image
3. Wait for processing

Expected:
✅ Toast: "Extracting garment..."
✅ Toast: "Processing for AR..."
✅ Toast: "AR-ready garment processed! SHIRT detected with anchors"
✅ Garment appears in gallery
✅ Metadata saved to localStorage

Console Output:
🎨 Processing garment: {fileName, category: 'shirt', upload: true}
✅ Garment processing succeeded: {dimensions: '746x1012', anchors: {...}}
✅ Garment added with metadata: {garmentId, anchors}
💾 Saved local metadata for custom-XXX
```

**2. Upload T-Shirt Image**
```
Expected:
- Classification detects 'tshirt'
- Category set to 'tshirt'
- Processed with tshirt anchors
```

**3. Invalid File**
```
Steps:
1. Upload PDF or unsupported format

Expected:
❌ Toast: "Invalid file type. Please upload JPEG, PNG, or WebP image."
```

**4. File Too Large**
```
Steps:
1. Upload 15MB image

Expected:
❌ Toast: "File too large (15.00MB). Maximum size is 10MB."
```

**5. AR Processing Failure**
```
Scenario: Backend /process/garment/top returns error

Expected:
⚠️ Toast: "AR processing failed, using extracted version"
✅ Garment still added (using extraction output)
✅ No metadata saved
```

---

## 🔍 Console Logging

### Processing Flow

```javascript
// 1. Validation
🎨 Processing garment: {
  fileName: "blue-shirt.jpg",
  fileSize: "245.67 KB",
  category: "shirt",
  upload: true,
  useDefaults: true,
  hasCustomAnchors: false
}

// 2. Success
✅ Garment processing succeeded: {
  duration: "3.45s",
  category: "shirt",
  dimensions: "746x1012",
  anchors: {
    collar_left: [0.312, 0.128],
    collar_right: [0.688, 0.128],
    neck_apex: [0.500, 0.184]
  },
  uploaded: true
}

// 3. Metadata Saved
✅ Garment added with metadata: {
  garmentId: "custom-1234567890",
  dimensions: {width: 746, height: 1012},
  anchors: {...},
  category: "shirt"
}

💾 Saved local metadata for custom-1234567890: {...}
```

### Error Cases

```javascript
// Validation Error
❌ File validation failed: "File too large"

// API Error
❌ Garment processing failed: {
  duration: "2.10s",
  error: "Network error"
}

// Fallback Used
⚠️ AR processing returned error: "Invalid image format"
```

---

## ⚙️ Configuration

### Backend API URL

Set in `lib/services/http.ts`:
```typescript
const baseURL = process.env.NEXT_PUBLIC_VTON_API_BASE || 'http://127.0.0.1:8000';
```

Environment variable:
```bash
# .env.local
NEXT_PUBLIC_VTON_API_BASE=http://localhost:5000
```

### Processing Options

Default options in `handleFileUpload`:
```typescript
const processedResult = await processGarment(extractedFile, {
  category: 'shirt',       // or 'tshirt' from classification
  upload: true,            // Upload to Cloudinary
  useDefaults: true        // Use default anchors
});
```

---

## 🐛 Troubleshooting

### Issue: Metadata not loading

**Symptoms:**
- Garment appears but tracking is off
- No anchors detected

**Fix:**
```typescript
// Check localStorage
const metadata = loadLocalMetadata('custom-XXX');
console.log(metadata); // Should show anchor data

// If null, metadata wasn't saved
// Re-upload garment
```

### Issue: Processing takes too long

**Symptoms:**
- "Processing for AR..." takes > 60 seconds

**Causes:**
- Large image file
- Slow backend/Cloudinary
- Network issues

**Fix:**
- Reduce image size before upload
- Check backend logs
- Increase timeout in `garmentProcessingApi.ts`

### Issue: Processed PNG not displaying

**Symptoms:**
- Garment slot shows broken image

**Fix:**
```typescript
// Check if Cloudinary URL is valid
console.log(processedResult.urls.processed_png);

// If undefined, check for base64 fallback
console.log(processedResult.urls.processed_png_base64);

// If both undefined, AR processing failed
```

### Issue: Wrong anchors detected

**Symptoms:**
- Garment misaligned despite metadata

**Fix:**
- Custom anchors can be provided:
```typescript
const processedResult = await processGarment(file, {
  category: 'shirt',
  upload: true,
  useDefaults: false,
  anchors: {
    collar_left: [0.30, 0.12],
    collar_right: [0.70, 0.12],
    neck_apex: [0.50, 0.15]
  }
});
```

---

## 🚀 Future Enhancements

### Planned Features

1. **Batch Processing**
   - Upload multiple garments at once
   - Progress bar for each garment

2. **Manual Anchor Editing**
   - CalibrationWizard integration
   - Click to set collar/neck points

3. **Category Auto-Detection**
   - Improve classification accuracy
   - Support more categories (pants, dress, etc.)

4. **Preview Before Save**
   - Show processed PNG before adding to gallery
   - Allow re-processing with different settings

5. **Caching**
   - Cache processed garments
   - Skip re-processing if already done

6. **Error Recovery**
   - Retry failed processing
   - Resume interrupted uploads

---

## 📖 API Reference

### `processGarment(file, options)`

**Parameters:**
- `file: File` - Image file to process
- `options.category?: 'shirt' | 'tshirt'` - Garment category
- `options.upload?: boolean` - Upload to Cloudinary (default: true)
- `options.useDefaults?: boolean` - Use default anchors (default: true)
- `options.anchors?: {...}` - Custom anchor points

**Returns:** `Promise<ProcessGarmentResponse>`

**Throws:** Error if processing fails

---

### `validateGarmentFile(file)`

**Parameters:**
- `file: File` - File to validate

**Returns:**
```typescript
{
  valid: boolean,
  error?: string
}
```

---

### `convertToFrontendMetadata(id, name, backendMeta)`

**Parameters:**
- `id: string` - Garment ID
- `name: string` - Display name
- `backendMeta: GarmentMetadataResponse` - Backend metadata

**Returns:** `GarmentMetadata`

---

### `saveLocalMetadata(metadata)`

**Parameters:**
- `metadata: GarmentMetadata` - Metadata to save

**Side Effects:**
- Saves to localStorage under key `garment-metadata-{id}`

---

## ✅ Success Criteria

All features implemented and tested:

- ✅ API service created (`garmentProcessingApi.ts`)
- ✅ Upload flow integrated (ARPanel)
- ✅ Metadata storage working (localStorage)
- ✅ UI feedback (toast notifications, loading states)
- ✅ Error handling (validation, fallbacks)
- ✅ Type safety (TypeScript)
- ✅ Build successful (no errors)
- ✅ Console logging (debug-friendly)

---

## 📝 Summary

The AR Try-On system now automatically processes uploaded garments to be AR-ready:

1. **Background removed** - Clean transparent PNG
2. **Neck cut** - Realistic collar cutout
3. **Anchors detected** - Precise alignment points
4. **Metadata saved** - Body offsets and dimensions
5. **Cloudinary hosted** - Fast, reliable delivery

**Result:** Uploaded garments automatically snap to shoulders with pixel-perfect alignment! 🎯
