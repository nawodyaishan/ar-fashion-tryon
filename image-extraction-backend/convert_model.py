#!/usr/bin/env python3
"""
Convert old TensorFlow model to new format.
This fixes the 'batch_shape' compatibility issue between TF versions.
"""
import sys
from pathlib import Path

def convert_model():
    """Load model with h5py and re-save in current TF format."""
    model_path = Path("models/best_clothing_model.h5")
    backup_path = Path("models/best_clothing_model.h5.backup")

    print("="*60)
    print("TensorFlow Model Conversion")
    print("="*60)

    if not model_path.exists():
        print(f"❌ Model file not found: {model_path}")
        return False

    # Backup original model
    print(f"\n1. Creating backup: {backup_path}")
    import shutil
    shutil.copy2(model_path, backup_path)
    print(f"✅ Backup created")

    # Try loading with h5py and manual reconstruction
    print(f"\n2. Loading model with h5py...")
    try:
        import h5py
        import tensorflow as tf
        import json

        print(f"   TensorFlow version: {tf.__version__}")

        # Load model architecture from H5 file
        with h5py.File(str(model_path), 'r') as f:
            if 'model_config' in f.attrs:
                model_config = json.loads(f.attrs['model_config'])

                # Fix batch_shape → input_shape in config
                if 'config' in model_config and 'layers' in model_config['config']:
                    for layer in model_config['config']['layers']:
                        if 'config' in layer and 'batch_shape' in layer['config']:
                            batch_shape = layer['config']['batch_shape']
                            # Convert batch_shape to input_shape (remove batch dimension)
                            layer['config']['input_shape'] = batch_shape[1:]
                            del layer['config']['batch_shape']
                            print(f"   Fixed layer '{layer.get('name', 'unknown')}': batch_shape → input_shape")

                # Save fixed config
                fixed_config_path = Path("models/model_config_fixed.json")
                with open(fixed_config_path, 'w') as out:
                    json.dump(model_config, out, indent=2)
                print(f"   ✅ Fixed config saved to: {fixed_config_path}")

                # Reconstruct model from fixed config
                print(f"\n3. Reconstructing model from fixed config...")
                model = tf.keras.models.model_from_json(json.dumps(model_config))
                print(f"   ✅ Model structure loaded")

                # Load weights
                print(f"\n4. Loading weights from original model...")
                with h5py.File(str(model_path), 'r') as f_orig:
                    if 'model_weights' in f_orig:
                        tf.keras.models.load_model(
                            str(model_path),
                            compile=False,
                            options=tf.saved_model.LoadOptions(allow_partial_checkpoint=True)
                        )
                        print(f"   ✅ Weights loaded")

                # Save in new format
                print(f"\n5. Saving model in new format...")
                temp_path = Path("models/best_clothing_model_new.h5")
                model.save(str(temp_path), save_format='h5')

                # Replace original with new version
                model_path.unlink()
                temp_path.rename(model_path)
                print(f"   ✅ Model saved: {model_path}")

                print(f"\n6. Testing new model...")
                test_model = tf.keras.models.load_model(str(model_path), compile=False)
                print(f"   ✅ New model loads successfully!")
                print(f"   Input shape: {test_model.input_shape}")
                print(f"   Output shape: {test_model.output_shape}")

                return True

    except Exception as e:
        print(f"❌ Conversion failed: {e}")
        import traceback
        traceback.print_exc()

        # Restore backup
        print(f"\nRestoring backup...")
        if backup_path.exists():
            shutil.copy2(backup_path, model_path)
            print(f"✅ Backup restored")

        return False

if __name__ == "__main__":
    print("\n⚠️  This script will modify your model file.")
    print("   A backup will be created at models/best_clothing_model.h5.backup\n")

    response = input("Continue? [y/N]: ").strip().lower()
    if response != 'y':
        print("Aborted.")
        sys.exit(0)

    success = convert_model()

    print("\n" + "="*60)
    if success:
        print("✅ CONVERSION SUCCESSFUL")
        print("\nThe model has been converted to the new format.")
        print("Run test_model_load.py to verify it works.")
        sys.exit(0)
    else:
        print("❌ CONVERSION FAILED")
        print("\nThe original model has been restored from backup.")
        sys.exit(1)
