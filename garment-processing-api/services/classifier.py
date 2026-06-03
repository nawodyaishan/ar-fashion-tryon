"""
TensorFlow model loading and classification service.

Based on predict_clothing.py - tries loading models in order with proper
fallback handling and supports both softmax and sigmoid_ovr head types.
"""
import os
import json
import logging
from pathlib import Path
from typing import Tuple, Optional, Dict, Any

import numpy as np
import cv2
from PIL import Image

from config import MODELS_DIR, LABELS_PATH, CONFIG_PATH, REJECTION_PATH

logger = logging.getLogger(__name__)

# Global model state
model = None
model_name: Optional[str] = None
class_labels: Dict[int, str] = {}
class_names: list = []
head_type: str = "softmax"
tau: float = 0.75
img_size: int = 224
_tf_err: Optional[Exception] = None


def _load_json(path: Path, default: Any) -> Any:
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
    """
    Load TensorFlow model and configuration.

    Tries loading models in order:
    1. best_clothing_model.h5
    2. clothing_model_final.h5

    Uses the same logic as predict_clothing.py for maximum compatibility.
    """
    global model, model_name, class_labels, class_names, head_type, tau, img_size, _tf_err

    try:
        import tensorflow as tf
        os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

        logger.info("="*60)
        logger.info("Loading TensorFlow Model")
        logger.info("="*60)
        logger.info(f"TensorFlow version: {tf.__version__}")
        logger.info(f"Models directory: {MODELS_DIR}")

        # Try loading models in order (same as predict_clothing.py)
        model_files = ['best_clothing_model.h5', 'clothing_model_final.h5']

        for fname in model_files:
            model_path = MODELS_DIR / fname
            try:
                logger.info(f"Trying to load: {model_path}")
                if not model_path.exists():
                    logger.warning(f"  File not found: {model_path}")
                    continue

                model_size_mb = model_path.stat().st_size / (1024 * 1024)
                logger.info(f"  File size: {model_size_mb:.2f} MB")

                model = tf.keras.models.load_model(str(model_path), compile=False)
                model_name = fname
                logger.info(f"  ✅ Successfully loaded: {fname}")
                break
            except Exception as e:
                logger.warning(f"  Failed to load {fname}: {e}")
                continue

        if model is None:
            raise RuntimeError("No model file could be loaded")

        # Load class labels (format from training: {"trousers": 0, "tshirt": 1, "other": 2})
        class_indices = _load_json(LABELS_PATH, {})
        if class_indices:
            # Reverse mapping: index -> label
            class_labels = {v: k for k, v in class_indices.items()}
            # Sorted list of class names
            class_names = [k for k, _ in sorted(class_indices.items(), key=lambda kv: kv[1])]
            logger.info(f"  Class labels: {class_names}")
        else:
            # Fallback: use actual training class order matching class_labels.json
            # Model was trained with: {"trousers": 0, "tshirt": 1, "other": 2}
            # Index 0 = trousers (lower body), Index 1 = tshirt (upper body), Index 2 = other
            num_classes = model.output_shape[-1]
            default_labels = ['trousers', 'tshirt', 'other']  # CORRECT ORDER!

            if num_classes == len(default_labels):
                class_labels = {i: default_labels[i] for i in range(num_classes)}
                class_names = default_labels
                logger.warning(f"  No class_labels.json found, using training default: {class_names}")
            else:
                # If model has different number of classes, use generic labels
                class_labels = {i: f"class_{i}" for i in range(num_classes)}
                class_names = [f"class_{i}" for i in range(num_classes)]
                logger.warning(f"  Model has {num_classes} classes, expected 3. Using generic: {class_names}")

        # Load model config (head_type: softmax or sigmoid_ovr)
        cfg = _load_json(CONFIG_PATH, {})
        head_type = str(cfg.get('head_type', 'softmax')).lower()
        img_size = int(cfg.get('img_size', cfg.get('IMG_SIZE', 224)))
        logger.info(f"  Head type: {head_type}")
        logger.info(f"  Image size: {img_size}")

        # Load rejection threshold (uses 'tau' key, not 'threshold')
        tau_config = _load_json(REJECTION_PATH, {})
        tau = float(tau_config.get('tau', tau_config.get('threshold', 0.75)))
        logger.info(f"  Rejection threshold (tau): {tau:.4f}")

        logger.info(f"✅ Model loaded successfully!")
        logger.info(f"   Model: {model_name}")
        logger.info(f"   Classes: {len(class_names)}")
        logger.info(f"   Input shape: {model.input_shape}")
        logger.info(f"   Output shape: {model.output_shape}")
        logger.info("="*60)

    except Exception as e:
        logger.error("="*60)
        logger.error("❌ MODEL LOADING FAILED")
        logger.error("="*60)
        logger.error(f"Error: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback:\n{traceback.format_exc()}")
        logger.error("")
        logger.error("API will run in degraded mode:")
        logger.error("  - Classification will return 'UNKNOWN'")
        logger.error("  - Background removal will still work")
        logger.error("  - Virtual try-on will still work")
        logger.error("="*60)
        _tf_err = e


def _preprocess_for_model(img_path: Path) -> np.ndarray:
    """
    Preprocess image for model inference.

    Uses cv2 and LANCZOS resize to match predict_clothing.py exactly.

    Args:
        img_path: Path to image file

    Returns:
        Preprocessed numpy array ready for model.predict()
    """
    # Read with cv2
    img = cv2.imread(str(img_path))
    if img is None:
        raise ValueError(f"Cannot read image: {img_path}")

    # Convert BGR to RGB
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # Resize with LANCZOS (high-quality)
    pil = Image.fromarray(rgb).resize((img_size, img_size), Image.LANCZOS)

    # Normalize to [0, 1]
    arr = np.asarray(pil).astype(np.float32) / 255.0

    # Add batch dimension
    return np.expand_dims(arr, 0)


def _decide_label(probs: np.ndarray) -> Tuple[str, float]:
    """
    Decide label from model predictions.

    Supports both softmax and sigmoid_ovr head types.
    Maps internal labels to frontend-compatible labels:
    - 'trouser' -> 'trousers' (frontend expects plural)
    - 'other' -> 'unknown' (frontend expects unknown for unrecognized items)

    Args:
        probs: Raw model output probabilities

    Returns:
        Tuple of (label, confidence)
    """
    # Mapping from internal labels to frontend-compatible labels
    LABEL_MAP = {
        'trouser': 'trousers',   # Frontend expects plural
        'trousers': 'trousers',  # Already plural, keep as-is
        'other': 'unknown',      # Frontend expects 'unknown' for unrecognized items
        'tshirt': 'tshirt',      # Keep as-is
    }

    p = probs.reshape(-1)

    if head_type == 'softmax':
        # Standard softmax: pick argmax, check if above tau
        idx = int(np.argmax(p))
        conf = float(p[idx])

        if conf < tau:
            logger.debug(f"Confidence {conf:.4f} below tau {tau:.4f}, returning UNKNOWN")
            return 'UNKNOWN', conf

        raw_label = class_labels.get(idx, f"class_{idx}")
        # Map to frontend-compatible label
        label = LABEL_MAP.get(raw_label, raw_label)
        return label, conf

    else:  # sigmoid_ovr
        # Sigmoid one-vs-rest: check if exactly one class above tau
        assert len(p) == 2, "sigmoid_ovr expects 2 outputs"
        p_trou, p_tee = float(p[0]), float(p[1])

        cond_trou = p_trou >= tau and p_tee < tau
        cond_tee = p_tee >= tau and p_trou < tau

        if cond_trou:
            return 'trousers', p_trou  # Already using frontend-compatible 'trousers'
        if cond_tee:
            return 'tshirt', p_tee

        # Ambiguous or both below tau
        logger.debug(f"Sigmoid reject: p_trousers={p_trou:.4f}, p_tshirt={p_tee:.4f}, tau={tau:.4f}")
        return 'UNKNOWN', max(p_trou, p_tee)


def classify_image(img_path: Path) -> Tuple[str, float]:
    """
    Classify garment image and return label and confidence.

    Args:
        img_path: Path to image file

    Returns:
        Tuple of (label, confidence)

    Raises:
        RuntimeError: If model is not loaded
    """
    if model is None:
        raise RuntimeError(f"Model not loaded: {_tf_err}")

    # Preprocess image
    batch = _preprocess_for_model(img_path)

    # Run inference
    raw = model.predict(batch, verbose=0)[0]

    # Decide label
    label, conf = _decide_label(raw)

    logger.debug(f"Classification result: {label} ({conf:.4f})")

    return label, conf
