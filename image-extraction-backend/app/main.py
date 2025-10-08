"""
FastAPI Garment Extraction API

Main application entry point.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from .config import get_settings
from .api.endpoints import router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events
    """
    # Startup
    settings = get_settings()
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Models directory: {settings.models_dir}")
    logger.info(f"Static directory: {settings.static_dir}")

    # Ensure directories exist
    settings.ensure_directories()

    # Pre-load model (done via dependency injection on first request)
    logger.info("Application startup complete")

    yield

    # Shutdown
    logger.info("Application shutdown")


# Create FastAPI app
app = FastAPI(
    title="Garment Extraction API",
    description="""
    FastAPI service for garment classification and extraction.

    ## Features
    - **Garment Classification**: Classify garments as T-shirt or Trousers using CNN
    - **Background Removal**: Extract garments by removing backgrounds using rembg
    - **High-Quality Processing**: LANCZOS resampling, proper normalization

    ## Supported Garment Types
    - T-shirts
    - Trousers

    ## Processing Pipeline
    1. Upload garment image
    2. Classify garment type (TensorFlow CNN)
    3. Remove background (rembg/u2net)
    4. Return processed image with metadata
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount(
    "/static",
    StaticFiles(directory=str(settings.static_dir)),
    name="static"
)

# Include API routes
app.include_router(router, prefix="/api")


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Handle unexpected exceptions"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "error_code": "INTERNAL_ERROR"
        }
    )


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )
