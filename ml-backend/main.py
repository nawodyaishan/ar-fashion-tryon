from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import logging
import sys
import traceback
import time
from datetime import datetime
import torch

from app.config import settings
from app.api.endpoints import garment, pose, tryon
from app.models.ml_models import ModelManager
from app.models.schemas import HealthResponse, ErrorResponse

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("logs/ml-backend.log", mode="a")
    ] if settings.log_to_file else [logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Global model manager
model_manager = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    global model_manager

    # Startup
    start_time = time.time()
    logger.info("Starting AR Fashion ML Backend...")
    logger.info(f"Python version: {sys.version}")
    logger.info(f"PyTorch version: {torch.__version__}")
    logger.info(f"CUDA available: {torch.cuda.is_available()}")
    
    try:
        model_manager = ModelManager(settings)
        startup_time = time.time() - start_time
        logger.info(f"Models loaded successfully in {startup_time:.2f}s")
    except Exception as e:
        logger.error(f"Failed to load models: {e}")
        logger.error(traceback.format_exc())
        raise

    yield

    # Shutdown
    logger.info("Shutting down ML Backend...")
    if model_manager:
        logger.info("Cleaning up models...")

# Create FastAPI app
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description=settings.api_description,
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None
)

# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning(f"HTTP {exc.status_code}: {exc.detail} - {request.url}")
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.detail,
            status_code=exc.status_code,
            timestamp=datetime.utcnow().isoformat(),
            path=str(request.url)
        ).dict()
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error: {exc} - {request.url}")
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(
            error="Validation error",
            status_code=422,
            timestamp=datetime.utcnow().isoformat(),
            path=str(request.url),
            details=exc.errors()
        ).dict()
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc} - {request.url}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="Internal server error",
            status_code=500,
            timestamp=datetime.utcnow().isoformat(),
            path=str(request.url)
        ).dict()
    )

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Log request
    logger.info(f"Request: {request.method} {request.url}")
    
    response = await call_next(request)
    
    # Log response
    process_time = time.time() - start_time
    logger.info(
        f"Response: {response.status_code} - "
        f"{process_time:.3f}s - {request.method} {request.url}"
    )
    
    return response

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    expose_headers=["*"]
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

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Comprehensive health check endpoint"""
    
    # Check model status
    models_status = {}
    if model_manager:
        try:
            # Test if models can be loaded
            yolo_loaded = hasattr(model_manager, 'models') and 'yolo' in model_manager.models
            pose_loaded = hasattr(model_manager, 'models') and 'pose' in model_manager.models
            models_status = {
                "yolo": "loaded" if yolo_loaded else "not_loaded",
                "pose": "loaded" if pose_loaded else "not_loaded"
            }
        except Exception as e:
            logger.error(f"Error checking model status: {e}")
            models_status = {"error": str(e)}
    
    # System info
    system_info = {
        "python_version": sys.version.split()[0],
        "pytorch_version": torch.__version__,
        "cuda_available": torch.cuda.is_available(),
        "cuda_version": torch.version.cuda if torch.cuda.is_available() else None,
        "device": model_manager.device if model_manager else "unknown"
    }
    
    return HealthResponse(
        status="healthy" if model_manager else "degraded",
        timestamp=datetime.utcnow().isoformat(),
        version=settings.api_version,
        models_loaded=model_manager is not None,
        models_status=models_status,
        system_info=system_info,
        endpoints={
            "garment_detection": "/api/v1/garment/detect",
            "pose_detection": "/api/v1/pose/detect",
            "virtual_tryon": "/api/v1/tryon/process",
            "documentation": "/docs"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )