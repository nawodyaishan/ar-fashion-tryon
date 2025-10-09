"""
TensorFlow model loading and classification service.
"""
import os
import json
import logging
from pathlib import Path
from typing import Tuple, Optional

import numpy as np
from PIL import Image

from config import MODEL_PATH, LABELS_PATH, CONFIG_PATH, REJECTION_PATH

logger = logging.getLogger(__name__)

# Global model state
model = None
class_labels = []
head_type = "softmax"
reject_threshold = 0.0
img_size = 224
_tf_err: Optional[Exception] = None


def _load_json(path: Path, default):
    """Load JSON file with error handling."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        logger.debug(f"Config file not found: {path}, using defaults")
        return default
    except Exception as e:
        logger.warning(f"Error loading {path}: {e}, using defaults")
        return default


def load_model_and_config():
    """Load TensorFlow model and configuration."""
    global model, class_labels, head_type, reject_threshold, img_size, _tf_err

    try:
        import tensorflow as tf
        os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Missing model file: {MODEL_PATH}")

        logger.info(f"Loading TensorFlow model from {MODEL_PATH}")
        model = tf.keras.models.load_model(str(MODEL_PATH))

        class_labels[:] = _load_json(LABELS_PATH, [])
        cfg = _load_json(CONFIG_PATH, {})
        head_type = str(cfg.get("head_type", "softmax")).lower()
        img_size = int(cfg.get("img_size", cfg.get("IMG_SIZE", 224)))
        reject_threshold = float(_load_json(REJECTION_PATH, {"threshold": 0.0}).get("threshold", 0.0))

        if not class_labels:
            class_labels[:] = [f"class_{i}" for i in range(model.output_shape[-1])]

        logger.info(f"Model loaded successfully: {len(class_labels)} classes, threshold={reject_threshold}")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        _tf_err = e


def _preprocess_for_model(im: Image.Image, size: int) -> np.ndarray:
    """Preprocess image for model inference."""
    im = im.convert("RGB").resize((size, size), Image.BILINEAR)
    x = np.asarray(im).astype("float32") / 255.0
    x = np.expand_dims(x, 0)
    return x


def classify_image(img_path: Path) -> Tuple[str, float]:
    """Classify garment image and return label and confidence."""
    if model is None:
        raise RuntimeError(f"Model not loaded: {_tf_err}")

    from tensorflow import keras  # ensure keras symbols available

    with Image.open(img_path) as im:
        x = _preprocess_for_model(im, img_size)

    preds = model.predict(x, verbose=0)[0]
    preds = np.array(preds).reshape(-1)
    idx = int(np.argmax(preds))
    conf = float(preds[idx])

    label = class_labels[idx] if 0 <= idx < len(class_labels) else f"class_{idx}"

    if conf < reject_threshold:
        return "UNKNOWN", conf

    return label, conf
