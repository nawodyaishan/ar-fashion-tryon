# Model Configuration Files

## Important: Label Order

The trained model uses the following class index mapping:

```json
{
  "trousers": 0,  ← Model output index 0 = TROUSERS (lower body)
  "tshirt": 1,    ← Model output index 1 = TSHIRT (upper body)
  "other": 2      ← Model output index 2 = OTHER/UNKNOWN
}
```

**⚠️ WARNING:** Do NOT change this order! The model was trained with this specific mapping.

## Files

### class_labels.json
Defines the mapping between class names and model output indices.

**CRITICAL:** This file must be present and valid during deployment. If it's missing or corrupted, the system falls back to incorrect default labels and will swap trousers/tshirt classifications.

### model_config.json
Model architecture configuration:
- `head_type`: "softmax" (standard classification)
- `img_size`: 224 (input image size)

### rejection_threshold.json
Classification confidence threshold:
- `tau`: 0.8452 (minimum confidence to accept prediction)
- Predictions below this threshold return "UNKNOWN"

## Deployment Notes

During Railway deployment, the `download_models_railway_v2.sh` script:
1. Downloads `trained_models.zip` from Google Drive
2. **Extracts ONLY .h5 model files** (best_clothing_model.h5, clothing_model_final.h5)
3. **Preserves these JSON config files from git** (does NOT overwrite them)

This prevents the zip file from overwriting the correct configuration with potentially empty/corrupted files.

## Troubleshooting

If you see swapped classifications (t-shirts detected as trousers or vice versa):

1. **Check deployment logs** for JSON parsing errors:
   ```
   ERROR: Error loading /app/models/class_labels.json: Expecting value: line 1 column 1
   ```

2. **Verify JSON files exist** on deployed instance:
   ```bash
   ls -lh /app/models/*.json
   cat /app/models/class_labels.json
   ```

3. **Check fallback warnings** in logs:
   ```
   WARNING: No class_labels.json found, using training default: ['tshirt', 'trouser', 'other']
   ```
   This indicates the JSON file failed to load and the wrong label order is being used.

## Model Details

- **Model**: best_clothing_model.h5 (primary) or clothing_model_final.h5 (fallback)
- **Size**: ~152 MB
- **Input**: 224x224x3 RGB images
- **Output**: 3-class softmax probabilities [trousers, tshirt, other]
- **Training Framework**: TensorFlow 2.16.2
- **Preprocessing**: LANCZOS resize, normalize to [0, 1]
