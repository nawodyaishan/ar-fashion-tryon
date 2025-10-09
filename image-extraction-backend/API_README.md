# Garment Extraction & Virtual Try-On API

> AI-powered garment classification, background removal, outfit construction, and virtual try-on API

[![FastAPI](https://img.shields.io/badge/FastAPI-2.0.0-009688.svg)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🚀 Quick Start

### Base URL
```
Production: https://ar-fashion-tryon-production.up.railway.app
Local: http://localhost:5000
```

### Health Check
```bash
curl https://ar-fashion-tryon-production.up.railway.app/health
```

### Classify a Garment
```bash
curl -X POST "https://ar-fashion-tryon-production.up.railway.app/classify_garment" \
  -F "garment=@shirt.jpg"
```

---

## 📚 Documentation

- **[Full API Documentation](./API_DOCUMENTATION.md)** - Complete API reference with examples
- **[OpenAPI Spec](./openapi.yaml)** - OpenAPI 3.0 specification for Swagger/Postman
- **[Interactive Docs](https://ar-fashion-tryon-production.up.railway.app/docs)** - FastAPI auto-generated docs

---

## 🎯 Endpoints Overview

| Endpoint | Method | Description | Response Time |
|----------|--------|-------------|---------------|
| `/health` | GET | Health check | < 10ms |
| `/classify_garment` | POST | Classify + remove background | 2-5s |
| `/classify_garment_by_url` | POST | Classify from URL | 2-5s |
| `/detect_garment_type` | POST | Quick classification only | 100-500ms |
| `/construct_outfit` | POST | Merge upper + lower garments | 3-7s |
| `/virtual_tryon` | POST | AI virtual try-on | 20-60s |

---

## 💡 Use Cases

### 1. E-commerce Product Processing
```python
# Automatically remove backgrounds from product photos
files = {"garment": open("product.jpg", "rb")}
response = requests.post(f"{BASE_URL}/classify_garment", files=files)
cutout_url = response.json()["cutout_url"]
```

### 2. Fashion Recommendation
```python
# Quick garment type detection for categorization
files = {"garment": open("item.jpg", "rb")}
response = requests.post(f"{BASE_URL}/detect_garment_type", files=files)
garment_type = response.json()["label"]
```

### 3. Outfit Visualization
```python
# Create complete outfit from separates
files = {
    "upper_garment": open("shirt.jpg", "rb"),
    "lower_garment": open("pants.jpg", "rb")
}
response = requests.post(f"{BASE_URL}/construct_outfit", files=files)
outfit_url = response.json()["outfit"]["url"]
```

### 4. Virtual Try-On
```python
# Show how garments look on models
files = {
    "person_image": open("model.jpg", "rb"),
    "garment_image": open("dress.jpg", "rb")
}
data = {"cloth_type": "overall", "num_inference_steps": 50}
response = requests.post(f"{BASE_URL}/virtual_tryon", files=files, data=data)
result_url = response.json()["result_url"]
```

---

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.10+
- Cloudinary account
- HuggingFace account (for virtual try-on)

### Local Development

```bash
# Clone repository
git clone https://github.com/your-repo/ar-fashion-tryon.git
cd ar-fashion-tryon/image-extraction-backend

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export CLOUDINARY_CLOUD_NAME=your-cloud-name
export CLOUDINARY_API_KEY=your-api-key
export CLOUDINARY_API_SECRET=your-api-secret
export HF_TOKEN=hf_your_token  # Optional

# Run server
uvicorn app:app --reload --host 0.0.0.0 --port 5000
```

### Environment Variables

**Required:**
- `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Your Cloudinary API key
- `CLOUDINARY_API_SECRET` - Your Cloudinary API secret

**Optional:**
- `HF_TOKEN` - HuggingFace token (for private Gradio spaces)
- `MAX_CONTENT_MB` - Max upload size in MB (default: 16)
- `CORS_ALLOW_ORIGINS` - Allowed CORS origins (default: *)

---

## 📖 API Examples

### Python

```python
import requests

BASE_URL = "https://ar-fashion-tryon-production.up.railway.app"

# Classify garment
with open("shirt.jpg", "rb") as f:
    response = requests.post(
        f"{BASE_URL}/classify_garment",
        files={"garment": f}
    )
    data = response.json()
    print(f"Type: {data['label']}, Confidence: {data['confidence']}")
    print(f"Cutout: {data['cutout_url']}")

# Construct outfit
with open("shirt.jpg", "rb") as upper, open("pants.jpg", "rb") as lower:
    response = requests.post(
        f"{BASE_URL}/construct_outfit",
        files={
            "upper_garment": upper,
            "lower_garment": lower
        }
    )
    outfit_url = response.json()["outfit"]["url"]
    print(f"Outfit: {outfit_url}")
```

### JavaScript

```javascript
// Browser/React
async function classifyGarment(file) {
  const formData = new FormData();
  formData.append('garment', file);

  const response = await fetch(
    'https://ar-fashion-tryon-production.up.railway.app/classify_garment',
    { method: 'POST', body: formData }
  );

  const data = await response.json();
  return data;
}

// Node.js
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function detectGarmentType(imagePath) {
  const form = new FormData();
  form.append('garment', fs.createReadStream(imagePath));

  const response = await axios.post(
    'https://ar-fashion-tryon-production.up.railway.app/detect_garment_type',
    form,
    { headers: form.getHeaders() }
  );

  return response.data;
}
```

### cURL

```bash
# Classify garment
curl -X POST "https://ar-fashion-tryon-production.up.railway.app/classify_garment" \
  -F "garment=@shirt.jpg"

# Detect type only
curl -X POST "https://ar-fashion-tryon-production.up.railway.app/detect_garment_type" \
  -F "garment=@shirt.jpg"

# Construct outfit
curl -X POST "https://ar-fashion-tryon-production.up.railway.app/construct_outfit" \
  -F "upper_garment=@shirt.jpg" \
  -F "lower_garment=@pants.jpg"

# Virtual try-on
curl -X POST "https://ar-fashion-tryon-production.up.railway.app/virtual_tryon" \
  -F "person_image=@model.jpg" \
  -F "garment_image=@shirt.jpg" \
  -F "cloth_type=upper" \
  -F "num_inference_steps=50"
```

---

## ⚡ Performance

### File Limits
- **Max file size:** 16MB (configurable)
- **Supported formats:** PNG, JPG, JPEG
- **Recommended resolution:** 512x512 to 2048x2048

### Processing Times
- **Detection:** 100-500ms
- **Classification:** 2-5 seconds
- **Outfit construction:** 3-7 seconds
- **Virtual try-on:** 20-60 seconds (depends on quality settings)

---

## 🔒 Security & Best Practices

### Input Validation
- All uploaded files are validated (extension, MIME type, PIL)
- File size limits enforced
- Image corruption detection

### Rate Limiting (Recommended)
```python
# Implement rate limiting for production
# Example: 100 requests per minute per IP
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@app.post("/classify_garment")
@limiter.limit("100/minute")
async def classify_garment(...):
    ...
```

### Authentication (Recommended)
```python
# Add API key authentication for production
from fastapi import Security, HTTPException
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key")

async def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key != os.getenv("API_KEY"):
        raise HTTPException(status_code=403, detail="Invalid API key")
```

---

## 🐛 Error Handling

All endpoints return errors in consistent format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

Common status codes:
- `400` - Bad request (invalid file, wrong format)
- `413` - File too large (>16MB)
- `500` - Server error (classification failed, upload failed)
- `503` - Service unavailable (Gradio/external service down)

---

## 📊 Monitoring & Logging

All requests are logged with unique request IDs:

```
2025-10-09 10:35:12 | INFO | [abc123] classify_garment request started
2025-10-09 10:35:14 | INFO | [abc123] Classification result: tshirt (95.34%)
2025-10-09 10:35:15 | INFO | [abc123] classify_garment completed
```

Request ID is returned in error responses for tracking:

```json
{
  "error": "Processing failed",
  "request_id": "abc123"
}
```

---

## 🚢 Deployment

### Railway (Current)

```bash
# Set environment variables in Railway dashboard
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# Deploy
git push origin main
```

### Docker

```bash
# Build
docker build -t garment-api .

# Run
docker run -p 8080:8080 \
  -e CLOUDINARY_CLOUD_NAME=xxx \
  -e CLOUDINARY_API_KEY=xxx \
  -e CLOUDINARY_API_SECRET=xxx \
  garment-api
```

### Heroku

```bash
heroku create your-app-name
heroku config:set CLOUDINARY_CLOUD_NAME=xxx
heroku config:set CLOUDINARY_API_KEY=xxx
heroku config:set CLOUDINARY_API_SECRET=xxx
git push heroku main
```

---

## 🧪 Testing

### Test Endpoints

```bash
# Test health
curl https://ar-fashion-tryon-production.up.railway.app/health

# Test with sample image
curl -X POST "https://ar-fashion-tryon-production.up.railway.app/detect_garment_type" \
  -F "garment=@test-images/shirt.jpg"
```

### Load Testing

```bash
# Using Apache Bench
ab -n 100 -c 10 -T 'multipart/form-data' \
  https://ar-fashion-tryon-production.up.railway.app/health

# Using vegeta
echo "POST https://ar-fashion-tryon-production.up.railway.app/health" | \
  vegeta attack -duration=30s -rate=50 | vegeta report
```

---

## 📞 Support

- **Documentation:** [Full API Docs](./API_DOCUMENTATION.md)
- **Issues:** [GitHub Issues](https://github.com/your-repo/issues)
- **Email:** support@example.com

---

## 📄 License

MIT License - see [LICENSE](../LICENSE) file for details

---

## 🙏 Acknowledgments

- **FastAPI** - Modern web framework
- **TensorFlow** - Machine learning
- **rembg** - Background removal
- **Cloudinary** - Image storage
- **Gradio** - Virtual try-on integration

---

**Last Updated:** 2025-10-09
**API Version:** 2.0.0
