#!/usr/bin/env python3
"""
Test script to verify TensorFlow model loads correctly.
Run this before deploying to Railway to ensure the model file is valid.
"""
import sys
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

def test_model_loading():
    """Test model loading with the same code that runs on Railway."""
    print("="*60)
    print("Testing TensorFlow Model Loading")
    print("="*60)

    from services import classifier

    # Load the model
    print("\n1. Loading model...")
    classifier.load_model_and_config()

    # Check results
    print("\n2. Checking results...")
    if classifier.model is None:
        print(f"❌ FAILED: Model did not load")
        print(f"   Error: {classifier._tf_err}")
        return False

    print(f"✅ SUCCESS: Model loaded")
    print(f"   Classes: {len(classifier.class_labels)}")
    print(f"   Labels: {classifier.class_labels}")
    print(f"   Input shape: {classifier.model.input_shape}")
    print(f"   Output shape: {classifier.model.output_shape}")

    # Test prediction with a dummy image
    print("\n3. Testing prediction with dummy data...")
    try:
        import numpy as np
        import tensorflow as tf

        # Create dummy 224x224 RGB image
        dummy_input = np.random.rand(1, 224, 224, 3).astype('float32')
        predictions = classifier.model.predict(dummy_input, verbose=0)

        print(f"✅ Prediction successful")
        print(f"   Output shape: {predictions.shape}")
        print(f"   Predictions: {predictions[0]}")
        print(f"   Max probability: {np.max(predictions[0]):.4f}")
        print(f"   Predicted class: {np.argmax(predictions[0])}")

        return True
    except Exception as e:
        print(f"❌ Prediction failed: {e}")
        return False

if __name__ == "__main__":
    try:
        success = test_model_loading()
        print("\n" + "="*60)
        if success:
            print("✅ ALL TESTS PASSED - Model is ready for deployment")
            sys.exit(0)
        else:
            print("❌ TESTS FAILED - Fix issues before deploying")
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
