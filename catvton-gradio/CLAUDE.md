# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Application

```bash
# Install dependencies
pip install -r requirements.txt

# Run the Gradio application
python app.py
```

On first run, the application will automatically download required AI models (~10GB) from Hugging Face.

The Gradio UI will launch on `http://localhost:7860` by default.

## System Requirements

- Python 3.8+
- CUDA 11.0+ (NVIDIA GPU required)
- 8-10GB GPU memory recommended
- ~10GB disk space for models

## Architecture Overview

This is a virtual try-on application built on Stable Diffusion inpainting. The architecture follows a multi-stage pipeline:

### Processing Flow

```
User Input (person photo + garment image)
    ↓
AutoMasker:
  - DensePose → body pose detection
  - SCHP → human parsing/segmentation
  - Generate mask for garment region
    ↓
CatVTONPipeline:
  - VAE Encoder → compress to latent space (4x downsampling)
  - UNet2D + SkipAttnProcessor → diffusion-based garment transfer
  - VAE Decoder → generate final image
    ↓
Output (person wearing selected garment)
```

### Key Components

**AutoMasker** (`model/cloth_masker.py`)
- Automatically generates masks indicating where garment should be placed
- Uses DensePose for body part detection and SCHP for clothing segmentation
- Supports three garment types: "upper", "lower", "overall"
- Body parts and garment regions are mapped using `DENSE_INDEX_MAP`, `ATR_MAPPING`, `LIP_MAPPING`
- Protected regions prevent unwanted modifications (e.g., face, legs when trying upper body)

**CatVTONPipeline** (`model/pipeline.py`)
- Main inference pipeline extending Stable Diffusion inpainting
- Components:
  - VAE: AutoencoderKL for image ↔ latent space conversion
  - UNet2DConditionModel: performs actual garment transfer in latent space
  - DDIMScheduler: fast diffusion sampling (50 steps default)
  - SkipAttnProcessor: custom attention mechanism for garment detail preservation
- Loads weights from `zhengchong/CatVTON` (HuggingFace model)

**SkipAttnProcessor** (`model/attn_processor.py`)
- Custom attention processor that improves garment texture and detail transfer
- Modifies cross-attention layers in the UNet to better preserve garment features
- Critical for maintaining garment appearance in final output

**Image Processing** (`utils.py`)
- `resize_and_crop()`: For person images - maintains aspect ratio, center crops
- `resize_and_padding()`: For garment images - adds white padding, no cropping
- `compute_vae_encodings()`: Converts PIL images to VAE latent tensors
- All images must have dimensions divisible by 8 (VAE requirement)

### Model Integration Points

The pipeline integrates multiple pre-trained models:

1. **Base model**: `booksforcharlie/stable-diffusion-inpainting` (Stable Diffusion)
2. **CatVTON weights**: `zhengchong/CatVTON` (specialized try-on weights)
3. **DensePose**: Bundled in CatVTON checkpoint under `DensePose/` subfolder
4. **SCHP**: Bundled in CatVTON checkpoint under `SCHP/` subfolder

All models are downloaded automatically via `huggingface_hub.snapshot_download()` on startup.

## Key Parameters

**Image Resolution** (`app.py:45-60`)
- Default: 768x1024 (3:4 aspect ratio)
- Must be divisible by 8
- Modifiable via `--width` and `--height` arguments

**Inference Parameters** (`app.py:356-377`)
- `num_inference_steps` (10-100): Diffusion sampling steps. Higher = better quality but slower.
- `guidance_scale` (0.0-7.5): Controls adherence to input garment. 2.5 is balanced.
- `seed`: Random seed for reproducibility (-1 for random)

**Performance Settings** (`app.py:68-86`)
- `mixed_precision`: "bf16" (default), "fp16", or "no"
- `allow_tf32`: True by default for NVIDIA Ampere GPUs
- TF32 and mixed precision significantly reduce memory usage and improve speed

## Important File Locations

**Main entry point**: `app.py`
- Line 106-116: Pipeline initialization
- Line 118-123: AutoMasker initialization
- Line 126-203: `submit_function()` - main processing logic
- Line 209-458: `app_gradio()` - Gradio UI definition

**Mask generation logic**: `model/cloth_masker.py`
- Lines 12-34: Body part index mappings (DensePose)
- Lines 36-80: Clothing segmentation mappings (SCHP ATR/LIP)
- Lines 52-80: Protected regions by garment type

**Pipeline implementation**: `model/pipeline.py`
- Lines 29-39: `__init__()` - model loading
- Main `__call__()` method: inference execution

## Garment Types

The system requires correct garment type selection:
- **upper**: Shirts, tops, jackets, t-shirts
- **lower**: Pants, skirts, shorts
- **overall**: Dresses, jumpsuits, full-body garments

Incorrect type selection will result in poor mask generation and bad results.

## Common Issues

**CUDA Out of Memory**
- Reduce image resolution (width/height)
- Lower `num_inference_steps`
- Ensure no other GPU processes running

**Poor Quality Results**
- Use plain backgrounds
- Ensure full body visible in frame
- High-quality input images
- Verify correct `cloth_type` selected

**Mask in Wrong Location**
- Person should face camera directly
- Avoid cluttered backgrounds
- Check garment type matches actual garment

## Development Notes

- Example images stored in `resource/demo/example/` (automatically loaded by Gradio)
- Output images saved to `resource/demo/output/` with timestamp organization
- The application uses HuggingFace Spaces GPU decorator `@spaces.GPU(duration=120)`
- Safety checker can be disabled via `skip_safety_check=True` in pipeline initialization
- VAE and safety checker have fallback mechanisms for dtype compatibility issues

## Configuration

The app is designed for Hugging Face Spaces deployment:
- SDK: Gradio 5.49.0
- License: CC-BY-NC-4.0
- CUDA environment variables set in `app.py:3-4`
