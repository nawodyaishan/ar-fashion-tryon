# Garment Extraction & Virtual Try-On API Documentation

**Version:** 2.0.0
**Base URL:** `https://your-api-domain.com`
**Protocol:** HTTPS
**Format:** JSON

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL & Endpoints](#base-url--endpoints)
4. [Common Response Codes](#common-response-codes)
5. [Rate Limiting](#rate-limiting)
6. [Endpoints](#endpoints)
   - [Health Check](#1-health-check)
   - [Classify Garment](#2-classify-garment)
   - [Classify Garment by URL](#3-classify-garment-by-url)
   - [Detect Garment Type](#4-detect-garment-type)
   - [Construct Outfit](#5-construct-outfit)
   - [Virtual Try-On](#6-virtual-try-on)
7. [Error Handling](#error-handling)
8. [Code Examples](#code-examples)
9. [Deployment](#deployment)

---

## Overview

This API provides AI-powered garment classification, background removal, outfit construction, and virtual try-on capabilities. Built with FastAPI, it integrates TensorFlow for classification, rembg for background removal, Cloudinary for storage, and Gradio for virtual try-on.

**Key Features:**
- 🏷️ Garment type classification (shirt, pants, etc.)
- ✂️ Automatic background removal
- 🎨 Full outfit construction (merge upper + lower garments)
- 👕 AI-powered virtual try-on
- ☁️ Cloudinary integration for image storage
- 🚀 Fast, async processing

### Architecture

The API uses a **modular architecture** with clear separation of concerns:

```
image-extraction-backend/
├── app.py                    # Main FastAPI application (endpoints & routing)
├── config.py                 # Configuration & environment variables
├── models.py                 # Pydantic request/response models
├── middleware.py             # Request ID middleware
├── services/                 # Business logic services
│   ├── classifier.py         # TensorFlow model loading & classification
│   ├── cloudinary_service.py # Cloudinary upload/download
│   ├── gradio_service.py     # Gradio API client & virtual try-on
│   └── image_processing.py   # Background removal & image utilities
└── models/                   # ML model files
    ├── best_clothing_model.h5
    ├── class_labels.json
    ├── model_config.json
    └── rejection_threshold.json
```

**Key Components:**
- **app.py** (727 lines): FastAPI endpoints with request validation and error handling
- **services/classifier.py**: TensorFlow model loading with graceful degradation
- **services/gradio_service.py**: Singleton Gradio client with retry logic
- **services/cloudinary_service.py**: Cloudinary upload/download utilities
- **services/image_processing.py**: Background removal (rembg) and format conversion

**Design Principles:**
- **Graceful Degradation**: API continues working even if model loading fails
- **Async Processing**: All I/O operations use async/await for better performance
- **Request Tracking**: Each request gets a unique ID for debugging
- **Lazy Initialization**: Gradio client connects on first use (not at startup)

---

## Authentication

**Current Version:** No authentication required (open API)

For production deployment, consider implementing:
- API keys via headers (`X-API-Key`)
- JWT tokens for user-specific operations
- OAuth 2.0 for third-party integrations

---

## Base URL & Endpoints

**Production:** `https://ar-fashion-tryon-production.up.railway.app`
**Local Development:** `http://localhost:5000`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/classify_garment` | POST | Classify garment + remove background |
| `/classify_garment_by_url` | POST | Classify garment from URL |
| `/detect_garment_type` | POST | Lightweight garment classification |
| `/construct_outfit` | POST | Merge upper + lower garments |
| `/virtual_tryon` | POST | Virtual try-on with AI |

---

## Common Response Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid input (wrong format, corrupt file, etc.) |
| 413 | Payload Too Large | File exceeds 16MB limit |
| 500 | Internal Server Error | Server-side processing error |
| 503 | Service Unavailable | External service (Gradio) unavailable |

---

## Rate Limiting

**Current:** No rate limiting

**Recommended for Production:**
- 100 requests per minute per IP
- 1000 requests per hour per API key

---

## Endpoints

### 1. Health Check

**Endpoint:** `GET /health`

Basic health check endpoint that returns API version and service information.

**Note:** Current implementation returns default values. Future versions will implement comprehensive service health checks.

#### Request

```bash
curl -X GET "https://your-api-domain.com/health"
```

#### Response

**Status:** 200 OK

```json
{
  "status": "ok",
  "version": "2.0.0",
  "model_loaded": false,
  "model_name": null,
  "gradio_connected": false,
  "services": null
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Overall API status (always "ok") |
| `version` | string | API version number |
| `model_loaded` | boolean | Whether TensorFlow model is loaded (always false in current implementation) |
| `model_name` | string | Loaded model filename (always null in current implementation) |
| `gradio_connected` | boolean | Whether Gradio client is connected (always false in current implementation) |
| `services` | object | Service status information (always null in current implementation) |

**Use Cases:**
- Basic uptime monitoring
- Load balancer health checks
- Deployment validation

**Implementation Note:**
The current health endpoint returns static default values. The API functions normally regardless of these values. To verify actual service availability:
- **Classification**: Call `/detect_garment_type` with a test image
- **Background Removal**: Call `/classify_garment` with a test image
- **Virtual Try-On**: Call `/virtual_tryon` with test images

**Graceful Degradation:**
Even if the TensorFlow model fails to load at startup, the API continues to operate:
- Classification endpoints return `"UNKNOWN"` as the label with 0.0 confidence
- Background removal and virtual try-on continue to work normally

---

### 2. Classify Garment

**Endpoint:** `POST /classify_garment`

Upload a garment image to classify its type and remove the background. Returns Cloudinary URLs for both original and cutout images.

#### Request

**Content-Type:** `multipart/form-data`

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `garment` | File | Yes | Garment image (PNG, JPG, JPEG, max 16MB) |

**Example:**

```bash
curl -X POST "https://your-api-domain.com/classify_garment" \
  -F "garment=@shirt.jpg"
```

#### Response

**Status:** 200 OK

```json
{
  "label": "tshirt",
  "confidence": 0.9234,
  "garment_url": "https://res.cloudinary.com/demo/image/upload/v1234/garments/originals/garment_a1b2c3d4.jpg",
  "cutout_url": "https://res.cloudinary.com/demo/image/upload/v1234/garments/cutouts/cutout_a1b2c3d4.png",
  "cutout_path": "garments/cutouts/cutout_a1b2c3d4.png",
  "garment_public_id": "garments/originals/garment_a1b2c3d4",
  "cutout_public_id": "garments/cutouts/cutout_a1b2c3d4"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `label` | string | Classified garment type: `"tshirt"`, `"trousers"`, `"unknown"`, or `"UNKNOWN"` (see Label Values below) |
| `confidence` | float | Classification confidence (0.0 - 1.0) |
| `garment_url` | string | Cloudinary URL of original garment |
| `cutout_url` | string | Cloudinary URL of background-removed garment |
| `cutout_path` | string | Relative path to cutout |
| `garment_public_id` | string | Cloudinary public ID of original |
| `cutout_public_id` | string | Cloudinary public ID of cutout |

**Label Values:**
- `"tshirt"` - T-shirts, shirts, tops, upper body garments
- `"trousers"` - Pants, trousers, lower body garments
- `"unknown"` - Other garment types not in training set (confidence below threshold)
- `"UNKNOWN"` - Classification failed or model not loaded

**Note:** The model automatically maps internal labels to frontend-compatible labels:
- Internal `"trouser"` → Returns `"trousers"` (plural)
- Internal `"other"` → Returns `"unknown"` (lowercase)

#### Error Responses

```json
// 400 - Invalid file type
{
  "detail": "Invalid file type. Allowed: jpg, jpeg, png"
}

// 400 - Invalid image
{
  "detail": "Invalid image file"
}

// 413 - File too large
{
  "detail": "File too large (>16MB)"
}

// 500 - Processing failed
{
  "detail": "Processing failed: <error details>"
}
```

---

### 3. Classify Garment by URL

**Endpoint:** `POST /classify_garment_by_url`

Same as `/classify_garment` but accepts an image URL instead of file upload.

#### Request

**Content-Type:** `application/json`

**Body:**

```json
{
  "source_url": "https://example.com/garment-image.jpg"
}
```

**Example:**

```bash
curl -X POST "https://your-api-domain.com/classify_garment_by_url" \
  -H "Content-Type: application/json" \
  -d '{"source_url": "https://example.com/shirt.jpg"}'
```

#### Response

Same as `/classify_garment`

#### Error Responses

```json
// 400 - Invalid URL
{
  "detail": "Invalid URL"
}

// 400 - Failed to fetch
{
  "detail": "Failed to fetch image: <error details>"
}
```

---

### 4. Detect Garment Type

**Endpoint:** `POST /detect_garment_type`

Lightweight endpoint for garment type detection only. No background removal or Cloudinary uploads.

#### Request

**Content-Type:** `multipart/form-data`

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `garment` | File | Yes | Garment image (PNG, JPG, JPEG, max 16MB) |

**Example:**

```bash
curl -X POST "https://your-api-domain.com/detect_garment_type" \
  -F "garment=@shirt.jpg"
```

#### Response

**Status:** 200 OK

```json
{
  "label": "tshirt",
  "confidence": 0.9234,
  "filename": "garment_a1b2c3d4.jpg",
  "file_size_bytes": 245678,
  "content_type": "image/jpeg"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `label` | string | Classified garment type: `"tshirt"`, `"trousers"`, `"unknown"`, or `"UNKNOWN"` |
| `confidence` | float | Classification confidence (0.0 - 1.0) |
| `filename` | string | Secure tokenized filename |
| `file_size_bytes` | integer | File size in bytes |
| `content_type` | string | MIME type of uploaded file |

**Label Values:**
- `"tshirt"` - T-shirts, shirts, tops, upper body garments
- `"trousers"` - Pants, trousers, lower body garments
- `"unknown"` - Other garment types (confidence below threshold)
- `"UNKNOWN"` - Classification failed or model not loaded

**Use Cases:**
- Quick garment type detection
- Frontend validation before full processing
- Mobile apps needing lightweight classification

---

### 5. Construct Outfit

**Endpoint:** `POST /construct_outfit`

Merge upper garment (shirt) and lower garment (pants) into a full outfit image. Classifies both garments and constructs a vertically stacked outfit visualization.

#### Request

**Content-Type:** `multipart/form-data`

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `upper_garment` | File | Yes | Upper garment image (shirt, t-shirt, top, jacket) |
| `lower_garment` | File | Yes | Lower garment image (pants, trousers, skirt, shorts) |

**Example:**

```bash
curl -X POST "https://your-api-domain.com/construct_outfit" \
  -F "upper_garment=@shirt.jpg" \
  -F "lower_garment=@pants.jpg"
```

#### Response

**Status:** 200 OK

```json
{
  "success": true,
  "upper_garment": {
    "label": "tshirt",
    "confidence": 0.9534,
    "url": "https://res.cloudinary.com/demo/image/upload/v1234/garments/originals/upper_a1b2c3d4.jpg",
    "public_id": "garments/originals/upper_a1b2c3d4"
  },
  "lower_garment": {
    "label": "trousers",
    "confidence": 0.8821,
    "url": "https://res.cloudinary.com/demo/image/upload/v1234/garments/originals/lower_a1b2c3d4.jpg",
    "public_id": "garments/originals/lower_a1b2c3d4"
  },
  "outfit": {
    "url": "https://res.cloudinary.com/demo/image/upload/v1234/garments/originals/outfit_a1b2c3d4.png",
    "public_id": "garments/originals/outfit_a1b2c3d4",
    "format": "png"
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Operation success status |
| `upper_garment.label` | string | Upper garment classification |
| `upper_garment.confidence` | float | Upper garment confidence |
| `upper_garment.url` | string | Cloudinary URL of upper garment |
| `lower_garment.label` | string | Lower garment classification |
| `lower_garment.confidence` | float | Lower garment confidence |
| `lower_garment.url` | string | Cloudinary URL of lower garment |
| `outfit.url` | string | Cloudinary URL of constructed outfit |
| `outfit.format` | string | Output format (always "png") |

**Expected Classifications:**
- **Upper:** tshirt, shirt, top, jacket, upper
- **Lower:** trousers, pants, pant, skirt, shorts, lower

**Note:** API warns but doesn't fail if unexpected labels are returned (for custom model compatibility).

#### Error Responses

```json
// 400 - Invalid upper garment
{
  "detail": "Upper garment file type not allowed. Allowed: jpg, jpeg, png"
}

// 500 - Classification failed
{
  "detail": "Upper garment classification failed: <error details>"
}
```

---

### 6. Virtual Try-On

**Endpoint:** `POST /virtual_tryon`

AI-powered virtual try-on using Gradio Space integration. Upload a person image and garment image to generate a realistic try-on result.

#### Request

**Content-Type:** `multipart/form-data`

**Parameters:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `person_image` | File | Yes | - | Person/model image |
| `garment_image` | File | Yes | - | Garment to try on |
| `cloth_type` | string | No | "upper" | Garment type: "upper", "lower", "overall" |
| `num_inference_steps` | integer | No | 50 | Diffusion steps (10-100, higher = better quality) |
| `guidance_scale` | float | No | 2.5 | Guidance scale (0.0-7.5) |
| `seed` | integer | No | 42 | Random seed (-1 for random) |
| `show_type` | string | No | "result only" | Display: "result only", "input & result", "input & mask & result" |
| `process_garment` | boolean | No | true | Classify + remove background from garment |

**Example:**

```bash
curl -X POST "https://your-api-domain.com/virtual_tryon" \
  -F "person_image=@model.jpg" \
  -F "garment_image=@shirt.jpg" \
  -F "cloth_type=upper" \
  -F "num_inference_steps=50" \
  -F "guidance_scale=2.5" \
  -F "seed=42" \
  -F "show_type=result only" \
  -F "process_garment=true"
```

#### Response

**Status:** 200 OK

```json
{
  "success": true,
  "person_url": "https://res.cloudinary.com/demo/image/upload/v1234/garments/originals/person_a1b2c3d4.jpg",
  "garment_url": "https://res.cloudinary.com/demo/image/upload/v1234/garments/originals/garment_a1b2c3d4.jpg",
  "cutout_url": "https://res.cloudinary.com/demo/image/upload/v1234/garments/cutouts/cutout_a1b2c3d4.png",
  "result_url": "https://res.cloudinary.com/demo/image/upload/v1234/garments/tryon_results/tryon_a1b2c3d4.png",
  "result_public_id": "garments/tryon_results/tryon_a1b2c3d4",
  "cloth_type": "upper",
  "parameters": {
    "num_inference_steps": 50,
    "guidance_scale": 2.5,
    "seed": 42,
    "show_type": "result only"
  },
  "garment_classification": {
    "label": "tshirt",
    "confidence": 0.9234
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Operation success status |
| `person_url` | string | Cloudinary URL of person image |
| `garment_url` | string | Cloudinary URL of garment |
| `cutout_url` | string | Cloudinary URL of garment cutout (if `process_garment=true`) |
| `result_url` | string | Cloudinary URL of try-on result |
| `result_public_id` | string | Cloudinary public ID of result |
| `cloth_type` | string | Garment type used |
| `parameters` | object | Processing parameters |
| `garment_classification` | object | Garment classification (if `process_garment=true`) |

**Processing Time:** 20-60 seconds depending on `num_inference_steps`

#### Error Responses

```json
// 400 - Invalid person image
{
  "detail": "Invalid person image"
}

// 503 - Gradio unavailable
{
  "detail": "Unable to connect to AI service: <error details>"
}

// 500 - Try-on failed
{
  "detail": "Virtual try-on failed after 3 attempts: <error details>"
}
```

---

## Error Handling

All endpoints return errors in a consistent format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

For unhandled exceptions (500 errors), the global exception handler returns:

```json
{
  "error": "Error message",
  "request_id": "abc12345"
}
```

**Response Headers:**
All API responses include the following headers:
- `X-Request-ID`: Unique 8-character identifier for request tracking and debugging
- Example: `X-Request-ID: 7a3f9e2b`

**Note:** Request IDs are also logged server-side in the format `[request_id]` for correlation with client errors.

### Common Error Scenarios

| Scenario | Status Code | Response |
|----------|-------------|----------|
| Missing file field | 400 | `{"detail": "No file field 'garment' in form-data"}` |
| Empty filename | 400 | `{"detail": "Empty filename"}` |
| Wrong file type | 400 | `{"detail": "File type not allowed. Allowed: jpg, jpeg, png"}` |
| Corrupt image | 400 | `{"detail": "Uploaded file is not a valid image"}` |
| File too large | 413 | `{"detail": "File too large (>16MB)"}` |
| Classification failed | 500 | `{"detail": "Classification failed: Model not loaded"}` |
| Cloudinary upload failed | 500 | `{"detail": "Upload failed: <error>"}` |

---

## Code Examples

### Python

```python
import requests

# 1. Classify Garment
url = "https://your-api-domain.com/classify_garment"
files = {"garment": open("shirt.jpg", "rb")}
response = requests.post(url, files=files)
result = response.json()
print(f"Label: {result['label']}, Confidence: {result['confidence']}")
print(f"Cutout URL: {result['cutout_url']}")

# 2. Detect Garment Type
url = "https://your-api-domain.com/detect_garment_type"
files = {"garment": open("shirt.jpg", "rb")}
response = requests.post(url, files=files)
result = response.json()
print(f"Quick detection: {result['label']} ({result['confidence']:.2%})")

# 3. Construct Outfit
url = "https://your-api-domain.com/construct_outfit"
files = {
    "upper_garment": open("shirt.jpg", "rb"),
    "lower_garment": open("pants.jpg", "rb")
}
response = requests.post(url, files=files)
result = response.json()
print(f"Outfit URL: {result['outfit']['url']}")

# 4. Virtual Try-On
url = "https://your-api-domain.com/virtual_tryon"
files = {
    "person_image": open("model.jpg", "rb"),
    "garment_image": open("shirt.jpg", "rb")
}
data = {
    "cloth_type": "upper",
    "num_inference_steps": 50,
    "guidance_scale": 2.5,
    "seed": 42,
    "show_type": "result only",
    "process_garment": "true"
}
response = requests.post(url, files=files, data=data)
result = response.json()
print(f"Try-on result: {result['result_url']}")
```

### JavaScript (Node.js)

```javascript
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

// 1. Classify Garment
async function classifyGarment() {
  const form = new FormData();
  form.append('garment', fs.createReadStream('shirt.jpg'));

  const response = await axios.post(
    'https://your-api-domain.com/classify_garment',
    form,
    { headers: form.getHeaders() }
  );

  console.log('Label:', response.data.label);
  console.log('Cutout URL:', response.data.cutout_url);
}

// 2. Construct Outfit
async function constructOutfit() {
  const form = new FormData();
  form.append('upper_garment', fs.createReadStream('shirt.jpg'));
  form.append('lower_garment', fs.createReadStream('pants.jpg'));

  const response = await axios.post(
    'https://your-api-domain.com/construct_outfit',
    form,
    { headers: form.getHeaders() }
  );

  console.log('Outfit URL:', response.data.outfit.url);
}

// 3. Virtual Try-On
async function virtualTryOn() {
  const form = new FormData();
  form.append('person_image', fs.createReadStream('model.jpg'));
  form.append('garment_image', fs.createReadStream('shirt.jpg'));
  form.append('cloth_type', 'upper');
  form.append('num_inference_steps', '50');
  form.append('process_garment', 'true');

  const response = await axios.post(
    'https://your-api-domain.com/virtual_tryon',
    form,
    { headers: form.getHeaders() }
  );

  console.log('Result URL:', response.data.result_url);
}
```

### JavaScript (Browser/React)

```javascript
// Classify Garment
async function classifyGarment(file) {
  const formData = new FormData();
  formData.append('garment', file);

  const response = await fetch('https://your-api-domain.com/classify_garment', {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  console.log('Classified as:', data.label);
  return data;
}

// Construct Outfit
async function constructOutfit(upperFile, lowerFile) {
  const formData = new FormData();
  formData.append('upper_garment', upperFile);
  formData.append('lower_garment', lowerFile);

  const response = await fetch('https://your-api-domain.com/construct_outfit', {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  return data.outfit.url;
}

// Virtual Try-On
async function virtualTryOn(personFile, garmentFile, options = {}) {
  const formData = new FormData();
  formData.append('person_image', personFile);
  formData.append('garment_image', garmentFile);
  formData.append('cloth_type', options.cloth_type || 'upper');
  formData.append('num_inference_steps', options.steps || 50);
  formData.append('guidance_scale', options.guidance || 2.5);
  formData.append('seed', options.seed || 42);
  formData.append('show_type', options.showType || 'result only');
  formData.append('process_garment', options.processGarment || 'true');

  const response = await fetch('https://your-api-domain.com/virtual_tryon', {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  return data.result_url;
}

// React Component Example
function GarmentUpload() {
  const [result, setResult] = useState(null);

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    const data = await classifyGarment(file);
    setResult(data);
  };

  return (
    <div>
      <input type="file" onChange={handleUpload} accept="image/*" />
      {result && (
        <div>
          <p>Type: {result.label} ({(result.confidence * 100).toFixed(1)}%)</p>
          <img src={result.cutout_url} alt="Cutout" />
        </div>
      )}
    </div>
  );
}
```

### cURL

```bash
# Health Check
curl -X GET "https://your-api-domain.com/health"

# Classify Garment
curl -X POST "https://your-api-domain.com/classify_garment" \
  -F "garment=@shirt.jpg"

# Classify by URL
curl -X POST "https://your-api-domain.com/classify_garment_by_url" \
  -H "Content-Type: application/json" \
  -d '{"source_url": "https://example.com/shirt.jpg"}'

# Detect Garment Type
curl -X POST "https://your-api-domain.com/detect_garment_type" \
  -F "garment=@shirt.jpg"

# Construct Outfit
curl -X POST "https://your-api-domain.com/construct_outfit" \
  -F "upper_garment=@shirt.jpg" \
  -F "lower_garment=@pants.jpg"

# Virtual Try-On
curl -X POST "https://your-api-domain.com/virtual_tryon" \
  -F "person_image=@model.jpg" \
  -F "garment_image=@shirt.jpg" \
  -F "cloth_type=upper" \
  -F "num_inference_steps=50" \
  -F "guidance_scale=2.5" \
  -F "seed=42" \
  -F "show_type=result only" \
  -F "process_garment=true"
```

---

## Deployment

### Environment Variables

**Required:**

```bash
# Cloudinary (REQUIRED for all endpoints)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Cloudinary folder (OPTIONAL, default: "garments")
CLOUDINARY_FOLDER=garments
```

**Optional:**

```bash
# HuggingFace Token (OPTIONAL, only if Gradio Space is private)
HF_TOKEN=hf_your_token_here

# File upload limits (OPTIONAL)
MAX_CONTENT_MB=16

# CORS (OPTIONAL, default: *)
CORS_ALLOW_ORIGINS=https://yourfrontend.com,https://app.example.com
```

### Railway Deployment

1. **Connect Repository**
   ```bash
   # Railway auto-detects nixpacks.toml configuration
   ```

2. **Set Environment Variables**
   ```
   CLOUDINARY_CLOUD_NAME=xxx
   CLOUDINARY_API_KEY=xxx
   CLOUDINARY_API_SECRET=xxx
   GDRIVE_MODEL_FILE_ID=xxx  # Optional, for model download
   ```

3. **Deploy**
   ```bash
   git push origin main
   # Railway deploys automatically (5-8 minutes build time)
   ```

4. **Verify Deployment**
   ```bash
   # Check health endpoint
   curl https://your-app.railway.app/health | jq .

   # Verify model is loaded
   # Expected: "model_loaded": true
   ```

**Build Process:**
- ✅ Python venv creation
- ✅ Dependencies installation (~2 min)
- ✅ Model download from Google Drive (~1-2 min, 293 MB)
- ✅ Model validation with TensorFlow
- ✅ Application startup

**Troubleshooting:**
See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment guide and common issues.

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export CLOUDINARY_CLOUD_NAME=your-cloud-name
export CLOUDINARY_API_KEY=your-api-key
export CLOUDINARY_API_SECRET=your-api-secret

# Run server
uvicorn app:app --reload --host 0.0.0.0 --port 5000
```

### Docker Deployment

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "-w", "1", "-b", "0.0.0.0:8080", "app:app"]
```

---

## Performance & Limits

### File Size Limits
- **Maximum file size:** 16MB (configurable via `MAX_CONTENT_MB`)
- **Supported formats:** PNG, JPG, JPEG
- **Recommended resolution:** 512x512 to 2048x2048

### Processing Times (Approximate)

| Endpoint | Average Time |
|----------|--------------|
| `/health` | < 10ms |
| `/detect_garment_type` | 100-500ms |
| `/classify_garment` | 2-5 seconds |
| `/construct_outfit` | 3-7 seconds |
| `/virtual_tryon` | 20-60 seconds |

**Note:** Virtual try-on time depends on `num_inference_steps` parameter.

### Best Practices

1. **Image Quality**
   - Use high-quality images (> 512px)
   - Plain backgrounds work best
   - Good lighting conditions

2. **Virtual Try-On**
   - Full body visible in person image
   - Person facing camera directly
   - Clear view of garment area

3. **Error Handling**
   - Always check response status codes
   - Implement retry logic with exponential backoff
   - Handle timeout errors gracefully

4. **Optimization**
   - Compress images before upload (without quality loss)
   - Use `/detect_garment_type` for quick validation
   - Cache classification results when possible

---

## Support & Contact

**Issues:** https://github.com/your-repo/issues
**Email:** support@example.com
**Documentation:** https://docs.example.com

---

## Changelog

### Version 2.0.0 (2025-10-10 - Updated 2025-10-11)

**🚀 Major Features:**
- ✨ Added `/construct_outfit` endpoint - Merge upper + lower garments
- ✨ Added `/detect_garment_type` endpoint - Lightweight classification
- ✨ Enhanced `/health` endpoint - Comprehensive service monitoring
- 🤖 Retrained TensorFlow model (78.7% validation accuracy)
- 🔧 Fixed TensorFlow 2.15+ compatibility (no more batch_shape errors)

**🛠️ DevOps & Deployment:**
- 🐳 Added `nixpacks.toml` for Railway deployment
- 📦 Automated model download from Google Drive during build
- ✅ Build validation script with retry logic (`download_models_railway_v2.sh`)
- 📝 Comprehensive deployment documentation (DEPLOYMENT.md)
- 🔍 Health endpoint now reports model status and service health

**🐛 Bug Fixes:**
- 🔧 Fixed RGBA→JPEG errors in virtual try-on
- 🔧 Added WebP to PNG conversion for Gradio results
- 🔧 Fixed Git LFS model download issues on Railway
- 🔧 Fixed unzip overwrite prompts in build process
- 🔧 Fixed Python venv activation in nixpacks

**🏗️ Code Quality:**
- 📝 Improved logging with request ID tracking
- 🏗️ Refactored to modular architecture (services/, models.py, config.py)
- 🧪 Added test_model_load.py for local validation
- 📚 Updated API documentation with deployment guide

**📝 Documentation Updates (2025-10-11):**
- ✅ Corrected `/health` endpoint response to reflect actual implementation (returns default values)
- ✅ Added comprehensive architecture documentation with file structure
- ✅ Documented classification label mappings (`trouser` → `trousers`, `other` → `unknown`)
- ✅ Fixed default tau threshold value (0.75, configurable via `rejection_threshold.json`)
- ✅ Added label value documentation for all classification endpoints
- ✅ Clarified graceful degradation behavior when model fails to load

**📊 Model Updates:**
- 🎯 New model trained with TensorFlow 2.16.2
- 📈 3-class classification: trousers, tshirt, other
- 🎚️ Default rejection threshold (tau): 0.75 (configurable via `rejection_threshold.json`)
- 📐 Input: 224x224x3, Output: softmax (3 classes)
- 💾 Model size: ~152 MB (best_clothing_model.h5)

### Version 1.0.0 (2025-09-01)
- 🎉 Initial release
- ✨ Garment classification
- ✨ Background removal
- ✨ Virtual try-on integration

---

## License

**License:** MIT
**Copyright:** © 2025 Your Company Name

---

**Last Updated:** 2025-10-11
**API Version:** 2.0.0
