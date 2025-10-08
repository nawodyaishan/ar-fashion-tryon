# Garment Extraction API - Complete Documentation

**Version:** 1.0.0
**Base URL:** `http://localhost:5000`
**API Prefix:** `/api`

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Authentication](#authentication)
4. [API Endpoints](#api-endpoints)
5. [Data Models](#data-models)
6. [Error Handling](#error-handling)
7. [Frontend Integration Guide](#frontend-integration-guide)
8. [Rate Limiting](#rate-limiting)
9. [Best Practices](#best-practices)
10. [Examples](#examples)

---

## Overview

The Garment Extraction API provides machine learning-powered garment classification and background removal services. It accepts images of clothing items and returns:

- **Classification**: Whether the garment is a T-shirt or Trousers
- **Confidence Score**: How confident the model is in its prediction
- **Extracted Image**: The garment with background removed (transparent PNG)
- **Processing Time**: How long the operation took

### Key Features

- 🤖 **CNN-based Classification**: TensorFlow model trained on fashion datasets
- ✂️ **Background Removal**: State-of-the-art u2net model via rembg
- 🚀 **Fast Processing**: Optimized pipeline with async operations
- 📊 **Detailed Metrics**: Confidence scores and processing times
- 📝 **Type Safety**: Fully typed API with Pydantic schemas
- 📖 **Auto Documentation**: Interactive docs at `/docs`

### Supported Garment Types

- `tshirt` - T-shirts, shirts, tops
- `trousers` - Pants, trousers, jeans

---

## Getting Started

### Prerequisites

- API server running on `http://localhost:5000` (or your deployment URL)
- Valid image file (JPEG, PNG, WEBP)
- HTTP client (browser, curl, fetch, axios, etc.)

### Quick Test

```bash
curl -X POST "http://localhost:5000/api/process" \
  -F "file=@/path/to/garment.jpg"
```

### Interactive Documentation

Visit `http://localhost:5000/docs` for interactive API documentation where you can test endpoints directly in your browser.

---

## Authentication

**Current Version:** No authentication required.

The API is currently open for development. In production, you may need to add authentication headers:

```http
Authorization: Bearer YOUR_API_KEY
```

---

## API Endpoints

### 1. Process Garment

Process a garment image to classify and extract it.

**Endpoint:** `POST /api/process`

**Request:**

```http
POST /api/process HTTP/1.1
Host: localhost:5000
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="garment.jpg"
Content-Type: image/jpeg

[binary image data]
------WebKitFormBoundary--
```

**Request Parameters:**

| Parameter | Type   | Required | Description                    |
|-----------|--------|----------|--------------------------------|
| `file`    | File   | Yes      | Image file (max 10MB)          |

**Supported Formats:**
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WEBP (.webp)

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Garment processed successfully",
  "classification": {
    "label": "tshirt",
    "confidence": 0.9234
  },
  "extraction": {
    "cutout_url": "/static/outputs/cutout_tshirt_a1b2c3d4.png",
    "cutout_path": "outputs/cutout_tshirt_a1b2c3d4.png",
    "original_url": "/static/uploads/garment_a1b2c3d4.png"
  },
  "processing_time_ms": 1234.56
}
```

**Response (Invalid Garment - 200):**

```json
{
  "success": false,
  "message": "Garment must be a T-shirt or Trousers. Detected: unknown",
  "classification": {
    "label": "unknown",
    "confidence": 0.4521
  },
  "extraction": null,
  "processing_time_ms": 856.32
}
```

**Error Responses:**

| Status Code | Description                           |
|-------------|---------------------------------------|
| 400         | Invalid file type or empty file       |
| 413         | File too large (max 10MB)             |
| 500         | Server error during processing        |

---

### 2. Health Check

Check if the API is running and the model is loaded.

**Endpoint:** `GET /api/health`

**Request:**

```http
GET /api/health HTTP/1.1
Host: localhost:5000
```

**Response (200):**

```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_name": "best_clothing_model.h5",
  "version": "1.0.0"
}
```

---

### 3. API Information

Get basic API information.

**Endpoint:** `GET /api/`

**Request:**

```http
GET /api/ HTTP/1.1
Host: localhost:5000
```

**Response (200):**

```json
{
  "name": "Garment Extraction API",
  "version": "1.0.0",
  "status": "running",
  "docs": "/docs",
  "endpoints": {
    "process": "/api/process",
    "health": "/api/health"
  }
}
```

---

## Data Models

### GarmentProcessResponse

Main response model for garment processing.

```typescript
interface GarmentProcessResponse {
  success: boolean;
  message: string;
  classification: ClassificationResult | null;
  extraction: ExtractionResult | null;
  processing_time_ms: number | null;
}
```

### ClassificationResult

```typescript
interface ClassificationResult {
  label: "tshirt" | "trousers" | "unknown";
  confidence: number; // 0.0 to 1.0
}
```

### ExtractionResult

```typescript
interface ExtractionResult {
  cutout_url: string;      // Full URL path to extracted image
  cutout_path: string;     // Relative path for download
  original_url: string;    // URL to original uploaded image
}
```

### ErrorResponse

```typescript
interface ErrorResponse {
  success: false;
  message: string;
  error_code?: string;
  details?: Record<string, any>;
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning                  | Description                                    |
|------|--------------------------|------------------------------------------------|
| 200  | OK                       | Request successful (check `success` field)     |
| 400  | Bad Request              | Invalid input (wrong file type, empty file)    |
| 413  | Payload Too Large        | File exceeds 10MB limit                        |
| 500  | Internal Server Error    | Server-side processing error                   |

### Error Response Format

All errors follow this structure:

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common Error Messages

#### 400 Bad Request

```json
{
  "detail": "Invalid file type. Must be an image (JPEG, PNG, WEBP)."
}
```

```json
{
  "detail": "Empty file uploaded"
}
```

#### 413 Payload Too Large

```json
{
  "detail": "File too large. Maximum size is 10.0MB"
}
```

#### 500 Internal Server Error

```json
{
  "detail": "Internal server error: [error description]"
}
```

### Handling Invalid Garments

When a garment doesn't match T-shirt or Trousers, the API returns **200 OK** with `success: false`:

```json
{
  "success": false,
  "message": "Garment must be a T-shirt or Trousers. Detected: unknown",
  "classification": {
    "label": "unknown",
    "confidence": 0.45
  },
  "extraction": null,
  "processing_time_ms": 856.32
}
```

**Important:** Always check the `success` field, not just the HTTP status code!

---

## Frontend Integration Guide

### Quick Start Checklist

✅ **Before You Start:**
- [ ] API server is running at `http://localhost:5000`
- [ ] You have test garment images (T-shirt or Trousers)
- [ ] Your environment supports `fetch` or you have axios installed

### Basic Integration Flow

```
User selects image → Upload to /api/process → Display results
                                          ↓
                              Check success field
                                          ↓
                        ┌─────────────────┴─────────────────┐
                        ↓                                   ↓
              success: true                         success: false
                        ↓                                   ↓
              Show extracted image                Display error message
              Show classification                 (invalid garment type)
              Show confidence
```

### 1. Vanilla JavaScript / HTML

#### HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Garment Extraction</title>
  <style>
    .preview-image {
      max-width: 400px;
      border: 2px solid #ddd;
      border-radius: 8px;
      margin: 10px 0;
    }
    .error { color: red; }
    .success { color: green; }
    .loading { color: blue; }
  </style>
</head>
<body>
  <h1>Garment Extraction Demo</h1>

  <div>
    <input type="file" id="fileInput" accept="image/*">
    <button onclick="processGarment()">Process Garment</button>
  </div>

  <div id="status"></div>

  <div id="results" style="display: none;">
    <h2>Results</h2>
    <p><strong>Type:</strong> <span id="garmentType"></span></p>
    <p><strong>Confidence:</strong> <span id="confidence"></span></p>
    <p><strong>Processing Time:</strong> <span id="processingTime"></span></p>

    <h3>Original Image</h3>
    <img id="originalImage" class="preview-image" alt="Original">

    <h3>Extracted Garment</h3>
    <img id="extractedImage" class="preview-image" alt="Extracted">
  </div>

  <script src="app.js"></script>
</body>
</html>
```

#### JavaScript Implementation

```javascript
// app.js
const API_BASE_URL = 'http://localhost:5000';

async function processGarment() {
  const fileInput = document.getElementById('fileInput');
  const statusDiv = document.getElementById('status');
  const resultsDiv = document.getElementById('results');

  // Validation
  if (!fileInput.files.length) {
    statusDiv.innerHTML = '<p class="error">Please select a file</p>';
    return;
  }

  const file = fileInput.files[0];

  // Validate file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    statusDiv.innerHTML = '<p class="error">File too large. Maximum size is 10MB</p>';
    return;
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    statusDiv.innerHTML = '<p class="error">Please select an image file</p>';
    return;
  }

  // Show loading
  statusDiv.innerHTML = '<p class="loading">Processing garment...</p>';
  resultsDiv.style.display = 'none';

  try {
    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // Make API request
    const response = await fetch(`${API_BASE_URL}/api/process`, {
      method: 'POST',
      body: formData
    });

    // Handle HTTP errors
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Request failed');
    }

    // Parse response
    const data = await response.json();

    // Check if processing was successful
    if (data.success) {
      displayResults(data);
      statusDiv.innerHTML = '<p class="success">✓ Garment processed successfully!</p>';
    } else {
      statusDiv.innerHTML = `<p class="error">✗ ${data.message}</p>`;
      resultsDiv.style.display = 'none';
    }

  } catch (error) {
    console.error('Error:', error);
    statusDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    resultsDiv.style.display = 'none';
  }
}

function displayResults(data) {
  const resultsDiv = document.getElementById('results');

  // Display classification results
  document.getElementById('garmentType').textContent =
    data.classification.label.toUpperCase();

  document.getElementById('confidence').textContent =
    `${(data.classification.confidence * 100).toFixed(2)}%`;

  document.getElementById('processingTime').textContent =
    `${data.processing_time_ms.toFixed(2)} ms`;

  // Display images
  document.getElementById('originalImage').src =
    `${API_BASE_URL}${data.extraction.original_url}`;

  document.getElementById('extractedImage').src =
    `${API_BASE_URL}${data.extraction.cutout_url}`;

  resultsDiv.style.display = 'block';
}

// Drag and drop support (optional)
function setupDragAndDrop() {
  const fileInput = document.getElementById('fileInput');
  const dropZone = document.body;

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.backgroundColor = '#f0f0f0';
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.style.backgroundColor = '';
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.backgroundColor = '';

    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      processGarment();
    }
  });
}

// Initialize drag and drop when page loads
window.addEventListener('load', setupDragAndDrop);
```

---

### 2. React / Next.js Integration

#### React Hook (with TypeScript)

```typescript
// useGarmentProcessor.ts
import { useState } from 'react';

interface ClassificationResult {
  label: 'tshirt' | 'trousers' | 'unknown';
  confidence: number;
}

interface ExtractionResult {
  cutout_url: string;
  cutout_path: string;
  original_url: string;
}

interface GarmentProcessResponse {
  success: boolean;
  message: string;
  classification: ClassificationResult | null;
  extraction: ExtractionResult | null;
  processing_time_ms: number | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export function useGarmentProcessor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GarmentProcessResponse | null>(null);

  const processGarment = async (file: File) => {
    // Reset state
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File too large. Maximum size is 10MB');
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Invalid file type. Please select an image');
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Make API request
      const response = await fetch(`${API_BASE_URL}/api/process`, {
        method: 'POST',
        body: formData,
      });

      // Handle HTTP errors
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Request failed');
      }

      // Parse response
      const data: GarmentProcessResponse = await response.json();
      setResult(data);

      // Check if processing was successful
      if (!data.success) {
        setError(data.message);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error processing garment:', err);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setError(null);
    setResult(null);
  };

  return {
    processGarment,
    loading,
    error,
    result,
    reset,
  };
}
```

#### React Component

```tsx
// GarmentProcessor.tsx
import React, { useRef, useState } from 'react';
import { useGarmentProcessor } from './useGarmentProcessor';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function GarmentProcessor() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { processGarment, loading, error, result, reset } = useGarmentProcessor();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Process garment
    await processGarment(file);
  };

  const handleReset = () => {
    reset();
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="garment-processor">
      <h1>Garment Extraction</h1>

      {/* File Input */}
      <div className="upload-section">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={loading}
        />
        {result && (
          <button onClick={handleReset}>Process Another</button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="status loading">
          <p>Processing garment...</p>
          <div className="spinner" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="status error">
          <p>✗ {error}</p>
        </div>
      )}

      {/* Success State */}
      {result && result.success && (
        <div className="results">
          <div className="status success">
            <p>✓ Garment processed successfully!</p>
          </div>

          <div className="classification">
            <h2>Classification Results</h2>
            <div className="info-grid">
              <div>
                <strong>Type:</strong> {result.classification!.label.toUpperCase()}
              </div>
              <div>
                <strong>Confidence:</strong>{' '}
                {(result.classification!.confidence * 100).toFixed(2)}%
              </div>
              <div>
                <strong>Processing Time:</strong>{' '}
                {result.processing_time_ms!.toFixed(2)} ms
              </div>
            </div>
          </div>

          <div className="images">
            <div className="image-container">
              <h3>Original Image</h3>
              <img
                src={`${API_BASE_URL}${result.extraction!.original_url}`}
                alt="Original garment"
              />
            </div>

            <div className="image-container">
              <h3>Extracted Garment</h3>
              <img
                src={`${API_BASE_URL}${result.extraction!.cutout_url}`}
                alt="Extracted garment"
              />
              <a
                href={`${API_BASE_URL}${result.extraction!.cutout_url}`}
                download={`garment-${result.classification!.label}.png`}
              >
                Download PNG
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Failed Processing (Invalid Garment) */}
      {result && !result.success && (
        <div className="results">
          <div className="info">
            <p>Classification: {result.classification?.label || 'unknown'}</p>
            <p>Confidence: {((result.classification?.confidence || 0) * 100).toFixed(2)}%</p>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### Styles (CSS Module or Tailwind)

```css
/* GarmentProcessor.module.css */
.garment-processor {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.upload-section {
  margin: 20px 0;
  display: flex;
  gap: 10px;
}

.status {
  padding: 12px;
  border-radius: 8px;
  margin: 20px 0;
}

.status.loading {
  background-color: #e3f2fd;
  color: #1976d2;
}

.status.error {
  background-color: #ffebee;
  color: #c62828;
}

.status.success {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.results {
  margin-top: 30px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.images {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  margin-top: 30px;
}

.image-container img {
  max-width: 100%;
  border: 2px solid #ddd;
  border-radius: 8px;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 20px auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

---

### 3. Vue.js Integration

```vue
<!-- GarmentProcessor.vue -->
<template>
  <div class="garment-processor">
    <h1>Garment Extraction</h1>

    <!-- File Upload -->
    <div class="upload-section">
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        @change="handleFileChange"
        :disabled="loading"
      />
      <button v-if="result" @click="reset">Process Another</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="status loading">
      <p>Processing garment...</p>
    </div>

    <!-- Error -->
    <div v-if="error" class="status error">
      <p>✗ {{ error }}</p>
    </div>

    <!-- Results -->
    <div v-if="result && result.success" class="results">
      <div class="status success">
        <p>✓ Garment processed successfully!</p>
      </div>

      <div class="classification">
        <h2>Classification Results</h2>
        <div class="info-grid">
          <div>
            <strong>Type:</strong> {{ result.classification.label.toUpperCase() }}
          </div>
          <div>
            <strong>Confidence:</strong>
            {{ (result.classification.confidence * 100).toFixed(2) }}%
          </div>
          <div>
            <strong>Processing Time:</strong>
            {{ result.processing_time_ms.toFixed(2) }} ms
          </div>
        </div>
      </div>

      <div class="images">
        <div class="image-container">
          <h3>Original Image</h3>
          <img
            :src="`${apiBaseUrl}${result.extraction.original_url}`"
            alt="Original garment"
          />
        </div>

        <div class="image-container">
          <h3>Extracted Garment</h3>
          <img
            :src="`${apiBaseUrl}${result.extraction.cutout_url}`"
            alt="Extracted garment"
          />
          <a
            :href="`${apiBaseUrl}${result.extraction.cutout_url}`"
            :download="`garment-${result.classification.label}.png`"
          >
            Download PNG
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface ClassificationResult {
  label: 'tshirt' | 'trousers' | 'unknown';
  confidence: number;
}

interface ExtractionResult {
  cutout_url: string;
  cutout_path: string;
  original_url: string;
}

interface GarmentProcessResponse {
  success: boolean;
  message: string;
  classification: ClassificationResult;
  extraction: ExtractionResult;
  processing_time_ms: number;
}

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const fileInput = ref<HTMLInputElement | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const result = ref<GarmentProcessResponse | null>(null);

const handleFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  loading.value = true;
  error.value = null;
  result.value = null;

  try {
    // Validate file
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File too large. Maximum size is 10MB');
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('Invalid file type. Please select an image');
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // Make API request
    const response = await fetch(`${apiBaseUrl}/api/process`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Request failed');
    }

    const data = await response.json();
    result.value = data;

    if (!data.success) {
      error.value = data.message;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error processing garment:', err);
  } finally {
    loading.value = false;
  }
};

const reset = () => {
  loading.value = false;
  error.value = null;
  result.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};
</script>

<style scoped>
/* Add the same CSS as the React example */
</style>
```

---

### 4. Python (Backend-to-Backend)

```python
# garment_client.py
import requests
from typing import Optional, Dict, Any
from pathlib import Path

class GarmentAPIClient:
    """Client for Garment Extraction API"""

    def __init__(self, base_url: str = "http://localhost:5000"):
        self.base_url = base_url
        self.session = requests.Session()

    def process_garment(
        self,
        file_path: str | Path,
        timeout: int = 30
    ) -> Dict[str, Any]:
        """
        Process a garment image

        Args:
            file_path: Path to image file
            timeout: Request timeout in seconds

        Returns:
            API response dictionary

        Raises:
            requests.exceptions.RequestException: On request failure
        """
        file_path = Path(file_path)

        # Validate file exists
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        # Validate file size (10MB)
        if file_path.stat().st_size > 10 * 1024 * 1024:
            raise ValueError("File too large. Maximum size is 10MB")

        # Open and send file
        with open(file_path, 'rb') as f:
            files = {'file': (file_path.name, f, self._get_content_type(file_path))}

            response = self.session.post(
                f"{self.base_url}/api/process",
                files=files,
                timeout=timeout
            )

        # Raise for HTTP errors
        response.raise_for_status()

        return response.json()

    def health_check(self) -> Dict[str, Any]:
        """Check API health"""
        response = self.session.get(f"{self.base_url}/api/health")
        response.raise_for_status()
        return response.json()

    def download_extracted_image(
        self,
        cutout_url: str,
        output_path: str | Path
    ) -> Path:
        """
        Download extracted garment image

        Args:
            cutout_url: URL from API response (e.g., "/static/outputs/...")
            output_path: Where to save the image

        Returns:
            Path to saved image
        """
        output_path = Path(output_path)

        response = self.session.get(
            f"{self.base_url}{cutout_url}",
            stream=True
        )
        response.raise_for_status()

        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        return output_path

    @staticmethod
    def _get_content_type(file_path: Path) -> str:
        """Get MIME type from file extension"""
        suffix = file_path.suffix.lower()
        mime_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp',
        }
        return mime_types.get(suffix, 'application/octet-stream')


# Example usage
if __name__ == "__main__":
    client = GarmentAPIClient()

    # Check health
    health = client.health_check()
    print(f"API Status: {health['status']}")
    print(f"Model Loaded: {health['model_loaded']}")

    # Process garment
    try:
        result = client.process_garment("path/to/tshirt.jpg")

        if result['success']:
            print(f"✓ Classification: {result['classification']['label']}")
            print(f"  Confidence: {result['classification']['confidence']:.2%}")
            print(f"  Processing time: {result['processing_time_ms']:.2f}ms")

            # Download extracted image
            output = client.download_extracted_image(
                result['extraction']['cutout_url'],
                "output/extracted_garment.png"
            )
            print(f"  Saved to: {output}")
        else:
            print(f"✗ {result['message']}")

    except Exception as e:
        print(f"Error: {e}")
```

---

## Rate Limiting

**Current Version:** No rate limiting implemented.

For production deployments, consider implementing:
- **Per-IP limits**: 100 requests per minute
- **Per-user limits**: 1000 requests per hour (if using authentication)

---

## Best Practices

### 1. File Validation (Client-Side)

Always validate files before uploading:

```javascript
function validateFile(file) {
  // Check file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Use JPEG, PNG, or WEBP');
  }

  // Check file size (10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 10MB');
  }

  return true;
}
```

### 2. Error Handling

Always handle both HTTP errors and application errors:

```javascript
try {
  const response = await fetch(url, options);

  // Check HTTP status
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail);
  }

  const data = await response.json();

  // Check application success
  if (!data.success) {
    // Handle invalid garment gracefully
    showWarning(data.message);
    return;
  }

  // Process successful result
  displayResults(data);

} catch (error) {
  // Handle network errors, parsing errors, etc.
  showError(error.message);
}
```

### 3. Loading States

Always show loading indicators during API calls:

```jsx
{loading && <Spinner />}
{!loading && error && <ErrorMessage message={error} />}
{!loading && !error && result && <Results data={result} />}
```

### 4. Image Optimization

For better UX, create local previews before uploading:

```javascript
function createPreview(file) {
  const objectUrl = URL.createObjectURL(file);
  imageElement.src = objectUrl;

  // Clean up when done
  imageElement.onload = () => URL.revokeObjectURL(objectUrl);
}
```

### 5. Caching Results

Cache results to avoid re-processing the same image:

```javascript
const cache = new Map();

async function processWithCache(file) {
  const fileHash = await hashFile(file);

  if (cache.has(fileHash)) {
    return cache.get(fileHash);
  }

  const result = await processGarment(file);
  cache.set(fileHash, result);

  return result;
}
```

### 6. Progressive Enhancement

Provide fallback UI for browsers without JavaScript:

```html
<noscript>
  <p>This application requires JavaScript to function.</p>
  <p>Please enable JavaScript or use the API directly.</p>
</noscript>
```

### 7. CORS Handling

If calling from a different domain, ensure CORS is configured:

```javascript
const response = await fetch(url, {
  method: 'POST',
  body: formData,
  // No need to set Content-Type for FormData
  // Browser will set it automatically with boundary
});
```

### 8. Timeout Handling

Set reasonable timeouts for slow networks:

```javascript
async function fetchWithTimeout(url, options, timeout = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}
```

---

## Examples

### Complete Working Examples

#### 1. Simple HTML + JavaScript

See the [Vanilla JavaScript section](#1-vanilla-javascript--html) above for a complete working example.

#### 2. React with TypeScript

See the [React / Next.js section](#2-react--nextjs-integration) above for a complete working example with hooks.

#### 3. cURL Examples

**Process a garment:**
```bash
curl -X POST "http://localhost:5000/api/process" \
  -F "file=@tshirt.jpg" \
  -H "Accept: application/json"
```

**Check health:**
```bash
curl -X GET "http://localhost:5000/api/health"
```

**Download extracted image:**
```bash
# First, get the cutout_url from the process response
# Then download it:
curl -X GET "http://localhost:5000/static/outputs/cutout_tshirt_abc123.png" \
  -o extracted_garment.png
```

#### 4. Postman Collection

Import this JSON into Postman:

```json
{
  "info": {
    "name": "Garment Extraction API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Process Garment",
      "request": {
        "method": "POST",
        "header": [],
        "body": {
          "mode": "formdata",
          "formdata": [
            {
              "key": "file",
              "type": "file",
              "src": []
            }
          ]
        },
        "url": {
          "raw": "{{baseUrl}}/api/process",
          "host": ["{{baseUrl}}"],
          "path": ["api", "process"]
        }
      }
    },
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/api/health",
          "host": ["{{baseUrl}}"],
          "path": ["api", "health"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:5000"
    }
  ]
}
```

---

## Support & Feedback

### Interactive Documentation

For interactive API testing, visit:
- **Swagger UI**: http://localhost:5000/docs
- **ReDoc**: http://localhost:5000/redoc

### Common Issues

**Issue**: CORS errors in browser
**Solution**: Ensure the API is configured to allow requests from your origin

**Issue**: "File too large" error
**Solution**: Resize images before upload or increase the limit in `app/config.py`

**Issue**: Slow processing times
**Solution**: Consider resizing large images on the client side before upload

**Issue**: "Model not loaded" error
**Solution**: Ensure model files exist in the `models/` directory

---

## Changelog

### Version 1.0.0 (Current)
- Initial release
- TensorFlow CNN classifier
- rembg background removal
- FastAPI with async support
- Interactive documentation
- TypeScript type definitions

---

## License

MIT License - See LICENSE file for details
