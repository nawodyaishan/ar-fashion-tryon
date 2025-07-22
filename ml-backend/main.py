from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.api.endpoints import garment, pose, tryon
from app.models.ml_models import ModelManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Global model manager
model_manager = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    global model_manager

    # Startup
    logger.info("Starting ML Backend...")
    model_manager = ModelManager(settings)
    logger.info("Models loaded successfully")

    yield

    # Shutdown
    logger.info("Shutting down ML Backend...")

# Create FastAPI app
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description=settings.api_description,
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(garment.router, prefix="/api/v1")
app.include_router(pose.router, prefix="/api/v1")
app.include_router(tryon.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "message": settings.api_title,
        "version": settings.api_version,
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "models_loaded": model_manager is not None,
        "gpu_available": settings.enable_gpu,
        "endpoints": {
            "garment_detection": "/api/v1/garment/detect",
            "pose_detection": "/api/v1/pose/detect",
            "virtual_tryon": "/api/v1/tryon/process"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )