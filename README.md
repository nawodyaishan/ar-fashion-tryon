# AR Fashion Try-On

Real-time augmented reality garment try-on system for e-commerce.

## Project Structure

- `web-backend/` - NestJS REST API server
- `web-frontend/` - Next.js web application
- `ml-backend/` - FastAPI ML inference server
- `ar-module/` - Three.js AR visualization module
- `shared-types/` - TypeScript type definitions
- `scripts/` - Development and deployment scripts
- `docs/` - Project documentation

## Quick Start

1. Install dependencies:
   ```bash
   # Web Backend
   cd web-backend && npm install
   
   # Web Frontend  
   cd ../web-frontend && npm install
   
   # ML Backend
   cd ../ml-backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. Start development environment:
   ```bash
   ./scripts/start-dev.sh
   ```

3. Access services:
    - Frontend: http://localhost:3000
    - API: http://localhost:3001
    - ML API: http://localhost:8000

## Development Workflow

1. Create feature branch: `git checkout -b feature/your-feature`
2. Work in respective folder
3. Test locally using docker-compose
4. Submit PR with tests