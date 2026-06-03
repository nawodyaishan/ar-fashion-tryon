# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the ML backend for an AR Fashion Try-On system built with FastAPI and PyTorch. It provides REST API endpoints for real-time garment detection, human pose estimation, and virtual try-on processing using computer vision and deep learning models.

## Development Commands

### Environment Setup
```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env
```

### Running the Server
```bash
# Development with auto-reload
python main.py
# OR
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Testing
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test
pytest tests/test_api.py::test_health_check
```

### Code Quality
```bash
# Format code
black app/

# Sort imports
isort app/

# Lint code
flake8 app/
```

## Architecture

### Core Components

1. **ModelManager** (`app/models/ml_models.py`): Centralized model loading and caching for YOLO (garment detection) and MediaPipe (pose estimation)

2. **Service Layer** (`app/services/`):
   - `garment_service.py`: Business logic for garment detection
   - `pose_service.py`: Business logic for pose estimation

3. **API Endpoints** (`app/api/endpoints/`):
   - `/api/v1/garment/detect`: Garment detection with features extraction
   - `/api/v1/pose/detect`: Human pose estimation with 33 keypoints
   - `/api/v1/tryon/process`: Virtual try-on processing (placeholder)

4. **Data Models** (`app/models/schemas.py`): Pydantic models for request/response validation

### Configuration System

Settings are managed through `app/config.py` using Pydantic BaseSettings. Key configurations:
- Model paths and confidence thresholds
- GPU/CPU device selection
- Image processing parameters
- CORS origins for frontend integration

### Model Architecture

- **YOLO v8**: Garment segmentation and classification (shirt, pants, dress, skirt, jacket)
- **MediaPipe Pose**: 33-point human pose estimation with 3D coordinates
- **Custom ColorDetector**: Dominant color extraction and naming
- **Device Management**: Automatic GPU/CPU selection based on availability

## Key Files and Their Purpose

- `main.py`: FastAPI application entry point with lifespan management
- `app/config.py`: Centralized configuration using environment variables
- `app/models/ml_models.py`: ML model classes (ModelManager, GarmentDetector, PoseEstimator)
- `app/models/schemas.py`: Pydantic data models for API contracts
- `app/api/endpoints/`: API route handlers organized by functionality

## Development Notes

### Model Loading Strategy
Models are loaded once at startup through the lifespan manager and cached in memory. GPU support is automatically detected and used when available.

### Image Processing Pipeline
1. Image validation and format checking
2. Resize to max_image_size for consistent processing
3. Model inference with confidence thresholding
4. Feature extraction (colors, patterns, measurements)
5. Response formatting with normalized coordinates

### Error Handling
All endpoints use try-catch blocks with structured error responses. Model loading errors are logged but don't crash the application.

### Testing Strategy
- Unit tests for core functionality using pytest
- Integration tests for API endpoints using FastAPI TestClient
- Mock external dependencies (models) for faster test execution

## Environment Variables

Key environment variables (see `.env.example`):
- `ENABLE_GPU`: Enable CUDA acceleration
- `MODELS_DIR`: Directory containing model files
- `MAX_IMAGE_SIZE`: Maximum image dimension for processing
- `*_CONFIDENCE_THRESHOLD`: Model confidence thresholds
- `CORS_ORIGINS`: Allowed frontend origins

## Model Files Location

Models are stored in `./models/` directory:
- `yolov8n-seg.pt`: YOLO segmentation model (auto-downloaded on first run)
- Additional models can be added as needed

## API Documentation

Interactive API documentation is available at `/docs` when the server is running. The FastAPI automatic documentation includes request/response schemas and testing interface.