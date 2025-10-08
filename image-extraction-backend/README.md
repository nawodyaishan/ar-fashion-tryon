# Garment Extraction API

FastAPI-based service for garment classification and background removal.

## Features

- **Garment Classification**: Classify garments as T-shirt or Trousers using TensorFlow CNN
- **Background Removal**: Extract garments by removing backgrounds using rembg (u2net)
- **RESTful API**: Clean FastAPI implementation with auto-generated documentation
- **Type Safety**: Full Pydantic schemas for request/response validation
- **Production Ready**: Async operations, dependency injection, proper error handling

## Quick Start

### Installation

```bash
# Install dependencies
pip install -r requirements.txt
```

### Running the Service

```bash
# Development mode with auto-reload
python -m app.main

# Or using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 5000
```

### Access the API

- **API Base URL**: http://localhost:5000
- **Interactive Docs**: http://localhost:5000/docs
- **ReDoc**: http://localhost:5000/redoc
- **Health Check**: http://localhost:5000/api/health

## API Endpoints

### `POST /api/process`

Process a garment image: classify and extract.

**Input:**
- `file`: Image file (JPG, PNG, WEBP)

**Output:**
```json
{
  "success": true,
  "message": "Garment processed successfully",
  "classification": {
    "label": "tshirt",
    "confidence": 0.92
  },
  "extraction": {
    "cutout_url": "/static/outputs/cutout_tshirt_a1b2c3d4.png",
    "cutout_path": "outputs/cutout_tshirt_a1b2c3d4.png",
    "original_url": "/static/uploads/garment_a1b2c3d4.png"
  },
  "processing_time_ms": 1234.56
}
```

### `GET /api/health`

Health check endpoint.

**Output:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_name": "best_clothing_model.h5",
  "version": "1.0.0"
}
```

## Example Usage

### Using cURL

```bash
curl -X POST "http://localhost:5000/api/process" \
  -F "file=@/path/to/garment.jpg"
```

### Using Python requests

```python
import requests

url = "http://localhost:5000/api/process"
files = {"file": open("garment.jpg", "rb")}
response = requests.post(url, files=files)
print(response.json())
```

### Using JavaScript fetch

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

fetch('http://localhost:5000/api/process', {
  method: 'POST',
  body: formData
})
  .then(res => res.json())
  .then(data => console.log(data));
```

## Configuration

Configuration is managed via `app/config.py`. You can override settings using environment variables with the `GARMENT_` prefix:

```bash
export GARMENT_PORT=8000
export GARMENT_DEBUG=false
export GARMENT_LOG_LEVEL=INFO
```

## Project Structure

```
app/
├── main.py              # FastAPI app entry point
├── config.py            # Configuration management
├── models/
│   ├── schemas.py       # Pydantic models
│   └── classifier.py    # TensorFlow CNN wrapper
├── services/
│   ├── classification.py # High-level garment service
│   └── extraction.py    # Background removal service
├── api/
│   └── endpoints.py     # API routes
└── core/
    └── dependencies.py  # Dependency injection
```

## Requirements

- Python 3.8+
- TensorFlow 2.15+
- FastAPI 0.109+
- rembg 2.0+
- Model files in `models/` directory:
  - `best_clothing_model.h5` or `clothing_model_final.h5`
  - `class_labels.json`
  - `model_config.json`
  - `rejection_threshold.json`

## Supported Garment Types

- T-shirts
- Trousers

## Technology Stack

- **Framework**: FastAPI
- **ML Model**: TensorFlow/Keras CNN
- **Background Removal**: rembg (u2net)
- **Image Processing**: Pillow, OpenCV
- **Server**: Uvicorn

## Development

See [CLAUDE.md](CLAUDE.md) for detailed development instructions and architecture documentation.

## License

MIT
