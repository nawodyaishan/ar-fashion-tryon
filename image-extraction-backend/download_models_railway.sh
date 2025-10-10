#!/bin/bash
set -e

echo "=================================================="
echo "Downloading models for Railway deployment"
echo "=================================================="

MODELS_DIR="/app/models"
mkdir -p "$MODELS_DIR"

# Google Drive file ID from your trained_models.zip
# https://drive.google.com/file/d/FILE_ID/view
FILE_ID="1oZhdDnXcQs5Oy84z1AqxoGV9GxEVKUbH"

# Download using gdown
echo "Installing gdown..."
pip install -q gdown

echo "Downloading trained_models.zip from Google Drive..."
gdown "https://drive.google.com/uc?id=${FILE_ID}" -O /tmp/trained_models.zip

echo "Extracting models..."
unzip -o -q /tmp/trained_models.zip -d "$MODELS_DIR"

echo "Verifying model files..."
for file in best_clothing_model.h5 clothing_model_final.h5 class_labels.json model_config.json rejection_threshold.json; do
    if [ -f "$MODELS_DIR/$file" ]; then
        size=$(du -h "$MODELS_DIR/$file" | cut -f1)
        echo "  ✅ $file ($size)"
    else
        echo "  ❌ $file (missing)"
    fi
done

echo "Cleaning up..."
rm -f /tmp/trained_models.zip

echo "=================================================="
echo "Model download complete!"
echo "=================================================="
