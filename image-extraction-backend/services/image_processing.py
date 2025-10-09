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
    Convert any image format to PNG with RGB mode (no alpha channel).

    This function ensures that images sent to Gradio are always in PNG format
    with RGB mode, which eliminates "cannot write mode RGBA as JPEG" errors.
    Gradio's ImageEditor internally converts to JPEG, which doesn't support
    transparency, so we force RGB mode here.

    Args:
        image_bytes: Raw image bytes in any format (JPEG, PNG, WebP, etc.)

    Returns:
        PNG-formatted image bytes in RGB mode

    Raises:
        ValueError: If image_bytes cannot be opened as a valid image
    """
    try:
        # Open image from bytes
        img = Image.open(io.BytesIO(image_bytes))

        # Log original format and mode for debugging
        original_format = img.format or 'UNKNOWN'
        original_mode = img.mode
        logger.debug(f"Converting image: format={original_format}, mode={original_mode} → PNG (RGB)")

        # Convert to RGB mode (remove alpha channel if present)
        if img.mode in ('RGBA', 'LA', 'PA'):
            # Create white background for transparency
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'RGBA':
                # Use alpha channel as mask
                background.paste(img, mask=img.split()[3])
            elif img.mode == 'LA':
                # Luminance + Alpha
                background.paste(img, mask=img.split()[1])
            else:
                # PA (Palette + Alpha)
                img = img.convert('RGBA')
                background.paste(img, mask=img.split()[3])
            img = background
        elif img.mode == 'P':
            # Palette mode - convert to RGB
            img = img.convert('RGB')
        elif img.mode not in ('RGB', 'L'):
            # Other modes (CMYK, YCbCr, etc.)
            img = img.convert('RGB')

        # Ensure RGB mode (convert grayscale to RGB for consistency)
        if img.mode == 'L':
            img = img.convert('RGB')

        # Save as PNG in RGB mode
        buf = io.BytesIO()
        img.save(buf, format='PNG', optimize=True)

        png_bytes = buf.getvalue()
        logger.debug(f"Conversion successful: {original_mode} → RGB, {len(image_bytes)} bytes → {len(png_bytes)} bytes")

        return png_bytes

    except Exception as e:
        logger.error(f"Failed to convert image to PNG: {e}")
        raise ValueError(f"Invalid image data: {e}") from e
