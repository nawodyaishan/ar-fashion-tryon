#!/bin/bash
set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration
MODELS_DIR="${MODELS_DIR:-/app/models}"
DOWNLOAD_DIR="${DOWNLOAD_DIR:-/tmp}"
FILE_ID="${GDRIVE_MODEL_FILE_ID:-1oZhdDnXcQs5Oy84z1AqxoGV9GxEVKUbH}"
MAX_DOWNLOAD_ATTEMPTS=3
TIMEOUT_SECONDS=300

# Expected files and their minimum sizes (in MB)
declare -A EXPECTED_FILES=(
    ["best_clothing_model.h5"]=100
    ["clothing_model_final.h5"]=100
    ["class_labels.json"]=0
    ["model_config.json"]=0
    ["rejection_threshold.json"]=0
)

cleanup() {
    log_info "Cleaning up temporary files..."
    rm -f "$DOWNLOAD_DIR/trained_models.zip"
}
trap cleanup EXIT

validate_environment() {
    log_info "Validating environment..."

    # Check required commands
    for cmd in python unzip curl; do
        if ! command -v $cmd &> /dev/null; then
            log_error "$cmd is not installed"
            exit 1
        fi
    done

    # Check Python version
    python_version=$(python --version 2>&1 | awk '{print $2}')
    log_info "Python version: $python_version"

    # Verify models directory exists
    mkdir -p "$MODELS_DIR"
    log_info "Models directory: $MODELS_DIR"
}

download_with_retry() {
    local attempt=1
    local zip_path="$DOWNLOAD_DIR/trained_models.zip"

    while [ $attempt -le $MAX_DOWNLOAD_ATTEMPTS ]; do
        log_info "Download attempt $attempt/$MAX_DOWNLOAD_ATTEMPTS..."

        # Install gdown if not available
        if ! python -c "import gdown" &> /dev/null; then
            log_info "Installing gdown..."
            pip install -q gdown || {
                log_error "Failed to install gdown"
                return 1
            }
        fi

        # Download with timeout
        if timeout $TIMEOUT_SECONDS python -m gdown "https://drive.google.com/uc?id=${FILE_ID}" -O "$zip_path"; then
            # Verify download
            if [ ! -f "$zip_path" ]; then
                log_error "Downloaded file not found"
                ((attempt++))
                continue
            fi

            file_size=$(stat -f%z "$zip_path" 2>/dev/null || stat -c%s "$zip_path" 2>/dev/null)
            file_size_mb=$((file_size / 1024 / 1024))

            if [ $file_size_mb -lt 200 ]; then
                log_error "Downloaded file too small (${file_size_mb}MB, expected >200MB)"
                rm -f "$zip_path"
                ((attempt++))
                continue
            fi

            log_info "Download successful (${file_size_mb}MB)"
            return 0
        else
            log_warn "Download failed"
            ((attempt++))
            sleep 2
        fi
    done

    log_error "Download failed after $MAX_DOWNLOAD_ATTEMPTS attempts"
    return 1
}

extract_models() {
    local zip_path="$DOWNLOAD_DIR/trained_models.zip"

    log_info "Extracting models to $MODELS_DIR..."

    # Test zip integrity first
    if ! unzip -t "$zip_path" &> /dev/null; then
        log_error "Zip file is corrupted"
        return 1
    fi

    # Extract to temporary directory first
    local temp_extract="$DOWNLOAD_DIR/models_temp"
    mkdir -p "$temp_extract"

    if ! unzip -o -q "$zip_path" -d "$temp_extract"; then
        log_error "Extraction failed"
        rm -rf "$temp_extract"
        return 1
    fi

    # Only copy .h5 model files (preserve JSON configs from git)
    log_info "Copying .h5 model files (preserving JSON configs from git)..."
    find "$temp_extract" -name "*.h5" -exec cp -v {} "$MODELS_DIR/" \;

    # Cleanup temp directory
    rm -rf "$temp_extract"

    log_info "Extraction complete"
    return 0
}

verify_models() {
    log_info "Verifying model files..."
    local all_valid=true

    for file in "${!EXPECTED_FILES[@]}"; do
        local filepath="$MODELS_DIR/$file"
        local min_size_mb=${EXPECTED_FILES[$file]}

        if [ ! -f "$filepath" ]; then
            log_error "Missing file: $file"
            all_valid=false
            continue
        fi

        local file_size=$(stat -f%z "$filepath" 2>/dev/null || stat -c%s "$filepath" 2>/dev/null)
        local file_size_mb=$((file_size / 1024 / 1024))

        if [ $file_size_mb -lt $min_size_mb ]; then
            log_error "$file is too small (${file_size_mb}MB, expected >${min_size_mb}MB)"
            all_valid=false
            continue
        fi

        log_info "✅ $file (${file_size_mb}MB)"
    done

    if [ "$all_valid" = false ]; then
        log_error "Model verification failed"
        return 1
    fi

    log_info "All models verified successfully"
    return 0
}

test_model_loading() {
    log_info "Testing TensorFlow model loading..."

    python - <<EOF
import sys
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # Suppress TF logs

try:
    import tensorflow as tf
    model_path = "$MODELS_DIR/best_clothing_model.h5"

    if not os.path.exists(model_path):
        print("ERROR: Model file not found")
        sys.exit(1)

    # Try loading model
    model = tf.keras.models.load_model(model_path, compile=False)

    # Verify model structure
    if model.input_shape != (None, 224, 224, 3):
        print(f"ERROR: Unexpected input shape: {model.input_shape}")
        sys.exit(1)

    if model.output_shape != (None, 3):
        print(f"ERROR: Unexpected output shape: {model.output_shape}")
        sys.exit(1)

    print("Model loaded and validated successfully")
    sys.exit(0)

except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
EOF

    if [ $? -eq 0 ]; then
        log_info "✅ Model loading test passed"
        return 0
    else
        log_error "❌ Model loading test failed"
        return 1
    fi
}

main() {
    echo "=================================================="
    echo "Railway Model Download & Validation Script v2.0"
    echo "=================================================="

    validate_environment || exit 1
    download_with_retry || exit 1
    extract_models || exit 1
    verify_models || exit 1
    test_model_loading || exit 1

    echo ""
    echo "=================================================="
    log_info "✅ All checks passed - Models ready for deployment"
    echo "=================================================="

    # Output summary for Railway logs
    echo ""
    echo "DEPLOYMENT_READY=true" >> "${GITHUB_ENV:-/dev/null}" 2>/dev/null || true
}

main "$@"
