# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start Development

This is a full-stack AR Fashion Try-On system with multiple microservices. Use the master development script:

```bash
./scripts/start-dev.sh
```

This starts all services:
- ML Backend: http://localhost:8000 (FastAPI)  
- Web Backend: http://localhost:3001 (NestJS)
- Frontend: http://localhost:3000 (Next.js)
- PostgreSQL: localhost:5432 (Docker)
- Redis: localhost:6379 (Docker)

## Service-Specific Commands

### Frontend (Next.js)
- **Package Manager**: pnpm (specified in packageManager field)
- **Development**: `cd web-frontend && pnpm dev` (uses Turbopack)
- **Build**: `pnpm build`
- **Lint**: `pnpm lint` or `pnpm lint:fix`
- **Format**: `pnpm format`

### Backend (NestJS)
- **Package Manager**: yarn (preferred) or npm
- **Development**: `cd web-backend && npm run start:dev` (watch mode)
- **Build**: `npm run build`
- **Test**: `npm run test` or `npm run test:e2e`
- **Lint**: `npm run lint` (auto-fixes)
- **Format**: `npm run format`

### ML Backend (FastAPI Python)
- **Environment**: Python virtual environment required
- **Setup**: `cd ml-backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt`
- **Development**: `python main.py` (auto-reload enabled)
- **Test**: `pytest` or `pytest --cov=app tests/`

### AR Module (TypeScript)
- **Package Manager**: yarn
- **Build**: `cd ar-module && yarn build`
- **Development**: `yarn dev` (watch mode with nodemon)
- **Test**: `yarn test`
- **Lint**: `yarn lint`

## Architecture Overview

This is a sophisticated multi-tier AR fashion system built around computer vision and real-time 3D rendering:

### High-Level Data Flow
1. **Frontend** uploads garment/user images via REST API
2. **Web Backend** validates requests and forwards to ML Backend  
3. **ML Backend** runs YOLO + MediaPipe for garment/pose detection
4. **AR Module** renders the try-on using Three.js with pose-driven placement
5. **Frontend** displays real-time AR preview to user

### Key Architectural Patterns

**Microservices with Shared Types**: All services communicate via REST APIs with TypeScript types in `/shared-types/` ensuring type safety across the stack.

**ML Pipeline Architecture**: The ML backend uses a sophisticated pipeline pattern (`ml-backend/app/core/pipeline.py`) with standardized stages: Input Validation → Preprocessing → Model Inference → Postprocessing → Output Formatting. This allows for flexible model swapping and monitoring.

**AR Rendering Pipeline**: The AR module (`ar-module/src/core/ARTryOn.ts`) combines MediaPipe pose detection with Three.js rendering, using a scene graph approach with separate pose detection and garment rendering components.

### Technology Integration Points

**Computer Vision Stack**:
- YOLO v8 segmentation for garment detection/features
- MediaPipe Pose for 33-point human pose estimation  
- OpenCV for image preprocessing and warping
- Custom color detection and pattern analysis

**3D Rendering Stack**:
- Three.js for WebGL-based AR visualization
- Custom shaders in `ar-module/src/shaders/` for realistic garment rendering
- Real-time pose-driven garment positioning and physics simulation

**State Management**: 
- Frontend uses Zustand for client state with localStorage persistence
- Settings control lighting effects, theme, and AR parameters
- Real-time synchronization between pose detection and 3D rendering

### Development Workflow Patterns

**Branch Strategy**: Feature branch workflow (`git checkout -b feature/your-feature`)

**Testing Strategy**:
- Frontend: No specific test setup detected, recommend adding Jest/React Testing Library
- Backend: Jest with supertest for integration tests
- ML Backend: pytest with coverage reporting and FastAPI TestClient
- AR Module: Jest configuration present

**Deployment**: Docker Compose for local development, scripts suggest cloud deployment readiness (AWS/GCP references in ROADMAP.md)

## Project Context & Roadmap

This appears to be a prototype implementation (Phase 1 of 2) targeting:
- Single garment type (upper body/shirts) 
- Static image input processing
- 2D pose estimation and overlay
- Local execution with basic UI

The roadmap shows progression toward production system with:
- Real-time webcam processing
- Multiple garment types
- 3D body mesh estimation (SMPL-X)
- Advanced ML models (Detectron2, Cloth-VTON++)
- Cloud infrastructure with user accounts

## Critical Implementation Notes

**MediaPipe Integration**: Both frontend and AR module use MediaPipe for pose detection. Frontend uses `@mediapipe/pose` while AR module has native integration.

**CORS Configuration**: ML backend has CORS configuration in `app/config.py` - ensure frontend origins are properly configured for API communication.

**GPU Support**: ML backend auto-detects CUDA availability and falls back to CPU processing, configured via environment variables.

**Model Loading**: ML models are loaded once at startup via lifespan manager and cached in memory for performance.

**Error Handling**: All services implement structured error responses with detailed logging and request tracking via unique request IDs.