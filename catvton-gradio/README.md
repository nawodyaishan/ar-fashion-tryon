---
title: AR Fashion Try-On
emoji: 🦀
colorFrom: blue
colorTo: indigo
sdk: gradio
sdk_version: 5.49.0
app_file: app.py
pinned: false
license: cc-by-nc-4.0
---

# AR Fashion Try-On

An AI-powered virtual try-on application that uses advanced computer vision and diffusion models to realistically place clothing onto person images.

## Features

- **Virtual Try-On**: Upload a person photo and garment image to see realistic try-on results
- **Multiple Garment Types**: Support for upper body (shirts, tops), lower body (pants, skirts), and full outfits (dresses, jumpsuits)
- **Automatic Masking**: AI-powered body detection and clothing segmentation
- **High Quality**: Uses state-of-the-art CatVTON model with Stable Diffusion inpainting
- **Interactive UI**: Built with Gradio for easy web-based interaction

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run the application
python app.py
```

The application will:
1. Download required AI models (~10GB, first run only)
2. Initialize the pipeline
3. Launch Gradio interface on http://localhost:7860

## Requirements

- Python 3.8+
- CUDA-capable NVIDIA GPU (8GB+ VRAM recommended)
- CUDA 11.0+
- ~10GB disk space for models

## How It Works

1. **DensePose** detects body parts and pose from the person image
2. **SCHP** (Self Correction Human Parsing) segments clothing regions
3. **AutoMasker** generates a mask indicating where the garment should be placed
4. **CatVTON Pipeline** uses Stable Diffusion to transfer the garment onto the person:
   - VAE encodes images to latent space
   - UNet performs diffusion-based garment transfer
   - VAE decodes back to final image

## Usage Tips

For best results:
- Use plain, contrasting backgrounds
- Ensure the entire body is visible in the frame
- Upload high-quality images
- Select the correct garment type (upper/lower/overall)
- Face the camera directly

## Model Architecture

- **Base Model**: Stable Diffusion Inpainting (`booksforcharlie/stable-diffusion-inpainting`)
- **Try-On Model**: CatVTON (`zhengchong/CatVTON`)
- **Body Detection**: DensePose (Facebook Research)
- **Clothing Segmentation**: SCHP (Self Correction Human Parsing)

## Configuration

Key parameters in `app.py`:
- `--width` / `--height`: Image resolution (default: 768x1024)
- `--mixed_precision`: Precision mode (default: bf16)
- `--allow_tf32`: Enable TF32 for faster matrix operations
- `num_inference_steps`: Diffusion steps (10-100, default: 50)
- `guidance_scale`: Garment adherence (0-7.5, default: 2.5)

## Project Structure

```
├── app.py                      # Main Gradio application
├── utils.py                    # Image processing utilities
├── model/
│   ├── pipeline.py            # CatVTON inference pipeline
│   ├── cloth_masker.py        # Automatic mask generation
│   ├── attn_processor.py      # Custom attention mechanism
│   └── utils.py               # Model utilities
├── densepose/                  # DensePose library
├── detectron2/                 # Detectron2 framework
└── resource/demo/example/      # Example images
```

## Documentation

### Getting Started
- `BEGINNER_GUIDE.md`: Comprehensive guide for beginners

## License

CC-BY-NC-4.0 - Non-commercial use only

## Deployment

This application is designed for Hugging Face Spaces. The configuration is defined in the YAML frontmatter of this README.

For more information, visit the [Hugging Face Spaces documentation](https://huggingface.co/docs/hub/spaces).
