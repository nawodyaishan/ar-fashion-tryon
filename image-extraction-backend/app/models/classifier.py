"""
Garment Classifier Model

Wrapper for TensorFlow CNN model for garment classification.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Tuple, Optional
import numpy as np
from PIL import Image
from tensorflow.keras.models import load_model

from ..config import Settings
from .schemas import GarmentType

logger = logging.getLogger(__name__)


class GarmentClassifier:
    """TensorFlow CNN-based garment classifier"""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.model = None
        self.model_name: Optional[str] = None
        self.class_indices: Dict[str, int] = {}
        self.idx2label: Dict[int, str] = {}
        self.head_type: str = "softmax"
        self.tau: float = settings.default_tau

        self._load_model()
        self._load_config()

    def _load_model(self) -> None:
        """Load the TensorFlow model"""
        for model_name in self.settings.model_names:
            model_path = self.settings.models_dir / model_name
            if model_path.exists():
                try:
                    logger.info(f"Loading model from {model_path}")
                    self.model = load_model(str(model_path))
                    self.model_name = model_name
                    logger.info(f"Successfully loaded model: {model_name}")
                    return
                except Exception as e:
                    logger.error(f"Failed to load model {model_name}: {e}")
                    continue

        raise RuntimeError(
            f"No model file found in {self.settings.models_dir}. "
            f"Expected one of: {self.settings.model_names}"
        )

    def _load_config(self) -> None:
        """Load model configuration files"""
        # Load class labels
        class_labels_path = self.settings.models_dir / self.settings.class_labels_file
        try:
            with open(class_labels_path, 'r') as f:
                self.class_indices = json.load(f)
            self.idx2label = {v: k for k, v in self.class_indices.items()}
            logger.info(f"Loaded class labels: {self.class_indices}")
        except Exception as e:
            logger.error(f"Failed to load class labels: {e}")
            raise

        # Load model config (head type)
        model_config_path = self.settings.models_dir / self.settings.model_config_file
        if model_config_path.exists():
            try:
                with open(model_config_path, 'r') as f:
                    config = json.load(f)
                self.head_type = config.get('head_type', 'softmax')
                logger.info(f"Model head type: {self.head_type}")
            except Exception as e:
                logger.warning(f"Failed to load model config: {e}")

        # Load rejection threshold
        threshold_path = self.settings.models_dir / self.settings.rejection_threshold_file
        if threshold_path.exists():
            try:
                with open(threshold_path, 'r') as f:
                    threshold_data = json.load(f)
                self.tau = float(threshold_data.get('tau', self.tau))
                logger.info(f"Rejection threshold (tau): {self.tau}")
            except Exception as e:
                logger.warning(f"Failed to load rejection threshold: {e}")

    def preprocess(self, image: Image.Image) -> np.ndarray:
        """
        Preprocess image for model input

        Args:
            image: PIL Image in RGB format

        Returns:
            Preprocessed numpy array ready for model inference
        """
        # Resize to model input size
        resized = image.resize(self.settings.img_size, Image.LANCZOS)

        # Convert to array and normalize
        arr = np.asarray(resized).astype(np.float32) / 255.0

        # Add batch dimension
        return np.expand_dims(arr, axis=0)

    def _decide_label(self, probs: np.ndarray) -> Tuple[GarmentType, float, Dict]:
        """
        Decide the label based on model probabilities and head type

        Args:
            probs: Model output probabilities

        Returns:
            Tuple of (label, confidence, metadata)
        """
        p = probs.reshape(-1)

        if self.head_type == 'softmax':
            idx = int(np.argmax(p))
            conf = float(p[idx])

            if conf < self.tau:
                return GarmentType.UNKNOWN, conf, {"reason": "below_threshold"}

            label_str = self.idx2label.get(idx, "unknown")
            label = GarmentType(label_str) if label_str in [e.value for e in GarmentType] else GarmentType.UNKNOWN

            return label, conf, {"method": "softmax"}

        else:  # sigmoid_ovr
            if len(p) != 2:
                logger.error(f"sigmoid_ovr expects 2 outputs, got {len(p)}")
                return GarmentType.UNKNOWN, 0.0, {"error": "invalid_output_size"}

            p0, p1 = float(p[0]), float(p[1])

            # Get class names sorted by index
            class_names = [k for k, _ in sorted(self.class_indices.items(), key=lambda kv: kv[1])]
            label0, label1 = class_names[0], class_names[1]

            # One-vs-rest logic
            cond0 = (p0 >= self.tau) and (p1 < self.tau)
            cond1 = (p1 >= self.tau) and (p0 < self.tau)

            if cond0:
                label = GarmentType(label0) if label0 in [e.value for e in GarmentType] else GarmentType.UNKNOWN
                return label, p0, {"method": "sigmoid_ovr"}
            if cond1:
                label = GarmentType(label1) if label1 in [e.value for e in GarmentType] else GarmentType.UNKNOWN
                return label, p1, {"method": "sigmoid_ovr"}

            return GarmentType.UNKNOWN, max(p0, p1), {"reason": "ambiguous", "method": "sigmoid_ovr"}

    async def classify(self, image: Image.Image) -> Tuple[GarmentType, float, Dict]:
        """
        Classify a garment image

        Args:
            image: PIL Image in RGB format

        Returns:
            Tuple of (label, confidence, metadata)
        """
        try:
            # Preprocess
            x = self.preprocess(image)

            # Inference
            probs = self.model.predict(x, verbose=0)[0]

            # Decide label
            return self._decide_label(probs)

        except Exception as e:
            logger.error(f"Classification error: {e}")
            raise

    def is_valid_garment(self, label: GarmentType) -> bool:
        """Check if the classified label is a valid garment type"""
        return label in [GarmentType.TSHIRT, GarmentType.TROUSERS]
