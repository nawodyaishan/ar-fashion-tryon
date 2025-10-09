"""
Configuration and constants for the garment extraction API.
"""
import os
from pathlib import Path

# -------------------- Paths --------------------
BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"

# -------------------- File Upload --------------------
ALLOWED_EXTS = {"png", "jpg", "jpeg"}
MAX_CONTENT_MB = float(os.getenv("MAX_CONTENT_MB", "16"))
MAX_CONTENT_BYTES = int(MAX_CONTENT_MB * 1024 * 1024)

# -------------------- CORS --------------------
CORS_ALLOW_ORIGINS_RAW = os.getenv("CORS_ALLOW_ORIGINS", "*").strip()
if CORS_ALLOW_ORIGINS_RAW == "*":
    CORS_ALLOW_ORIGINS = ["*"]
    CORS_ALLOW_CREDENTIALS = False
else:
    CORS_ALLOW_ORIGINS = [o.strip() for o in CORS_ALLOW_ORIGINS_RAW.split(",") if o.strip()]
    CORS_ALLOW_CREDENTIALS = True

# -------------------- Cloudinary --------------------
CLOUDINARY_CONFIG = {
    "cloud_name": os.environ.get("CLOUDINARY_CLOUD_NAME"),
    "api_key": os.environ.get("CLOUDINARY_API_KEY"),
    "api_secret": os.environ.get("CLOUDINARY_API_SECRET"),
    "secure": True,
}

CLOUDINARY_FOLDER = os.getenv("CLOUDINARY_FOLDER", "garments")
FOLDER_ORIG = f"{CLOUDINARY_FOLDER}/originals"
FOLDER_CUT = f"{CLOUDINARY_FOLDER}/cutouts"
FOLDER_TRYON = f"{CLOUDINARY_FOLDER}/tryon_results"

# -------------------- Gradio --------------------
GRADIO_SPACE = "nawodyaishan/ar-fashion-tryon"
HF_TOKEN = os.getenv("HF_TOKEN")  # Optional, for private spaces

# -------------------- Model Paths --------------------
MODEL_PATH = MODELS_DIR / "best_clothing_model.h5"
LABELS_PATH = MODELS_DIR / "class_labels.json"
CONFIG_PATH = MODELS_DIR / "model_config.json"
REJECTION_PATH = MODELS_DIR / "rejection_threshold.json"
