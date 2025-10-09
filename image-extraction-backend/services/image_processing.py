"""
Image processing service for background removal and format conversion.
"""
import io
from pathlib import Path

from PIL import Image
from rembg import remove


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


def prepare_image_for_format(image_bytes: bytes, target_format: str) -> bytes:
    """
    Prepare image bytes for a specific format (JPEG or PNG).
    Converts RGBA to RGB for JPEG format to avoid errors.

    Args:
        image_bytes: Raw image bytes
        target_format: Target format ('jpg', 'jpeg', or 'png')

    Returns:
        Properly formatted image bytes
    """
    img = Image.open(io.BytesIO(image_bytes))

    # For JPEG format, ensure RGB mode (no transparency)
    if target_format.lower() in ('jpg', 'jpeg'):
        if img.mode in ('RGBA', 'LA', 'P'):
            # Convert to RGB, handling transparency
            if img.mode == 'P':
                img = img.convert('RGBA')

            # Create white background
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'RGBA':
                background.paste(img, mask=img.split()[3])  # Use alpha channel as mask
            else:
                background.paste(img)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        # Save as JPEG
        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=95)
        return buf.getvalue()

    else:  # PNG format
        # PNG supports all modes, just save as-is
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        return buf.getvalue()
