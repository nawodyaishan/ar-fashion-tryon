"""
Image processing service for background removal and format conversion.
"""
import io
import logging
from pathlib import Path
from typing import Optional

from PIL import Image
from rembg import remove

logger = logging.getLogger(__name__)


def remove_background(img_path: Path) -> Image.Image:
    """
    Remove background from image using rembg.

    Args:
        img_path: Path to input image

    Returns:
        RGBA Image with transparent background
    """
    with Image.open(img_path).convert("RGBA") as im:
        cutout = remove(im)  # rembg (downloads model on first call)
    return cutout


def image_to_png_bytes(im: Image.Image) -> bytes:
    """
    Convert PIL Image to PNG bytes.

    Args:
        im: PIL Image object

    Returns:
        PNG image as bytes
    """
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    return buf.getvalue()


def ensure_png_format(image_bytes: bytes) -> bytes:
    """
    Convert any image format to PNG.

    This function ensures that images sent to Gradio are always in PNG format,
    which eliminates "cannot write mode RGBA as JPEG" errors. PNG supports all
    color modes (RGB, RGBA, L, LA, P, etc.) without conversion issues.

    Args:
        image_bytes: Raw image bytes in any format (JPEG, PNG, WebP, etc.)

    Returns:
        PNG-formatted image bytes

    Raises:
        ValueError: If image_bytes cannot be opened as a valid image
    """
    try:
        # Open image from bytes
        img = Image.open(io.BytesIO(image_bytes))

        # Log original format and mode for debugging
        original_format = img.format or 'UNKNOWN'
        original_mode = img.mode
        logger.debug(f"Converting image: format={original_format}, mode={original_mode} → PNG")

        # Convert to PNG (preserves all color modes)
        buf = io.BytesIO()
        img.save(buf, format='PNG', optimize=True)

        png_bytes = buf.getvalue()
        logger.debug(f"Conversion successful: {len(image_bytes)} bytes → {len(png_bytes)} bytes")

        return png_bytes

    except Exception as e:
        logger.error(f"Failed to convert image to PNG: {e}")
        raise ValueError(f"Invalid image data: {e}") from e
