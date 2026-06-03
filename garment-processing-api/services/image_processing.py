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


def convert_to_rgb_png(image_bytes: bytes) -> bytes:
    """
    Convert any image format (WebP, JPEG, PNG, etc.) to RGB PNG.

    This function handles all image formats including WebP (returned by Gradio),
    converts to RGB mode (removes alpha channel), and saves as PNG.
    This ensures compatibility with Cloudinary and eliminates transparency issues.

    Args:
        image_bytes: Raw image bytes in any format (WebP, JPEG, PNG, etc.)

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
        logger.info(f"Converting image: format={original_format}, mode={original_mode} → PNG (RGB)")

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
        logger.info(f"Conversion successful: {original_format}/{original_mode} → PNG/RGB, {len(image_bytes)} bytes → {len(png_bytes)} bytes")

        return png_bytes

    except Exception as e:
        logger.error(f"Failed to convert image to PNG: {e}")
        raise ValueError(f"Invalid image data: {e}") from e


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
    # Use the shared conversion function
    return convert_to_rgb_png(image_bytes)


def compress_image_for_upload(image_bytes: bytes, max_size_mb: float = 9.5) -> bytes:
    """
    Compress image to stay under size limit for Cloudinary upload.

    Cloudinary free tier has a 10MB limit, so we target 9.5MB to leave margin.
    This function progressively reduces quality or dimensions if needed.

    Args:
        image_bytes: Original image bytes (any format)
        max_size_mb: Maximum target size in MB

    Returns:
        Compressed image bytes (PNG or JPEG depending on compression needed)
    """
    max_bytes = int(max_size_mb * 1024 * 1024)

    # If already under limit, return as-is
    if len(image_bytes) <= max_bytes:
        logger.info(f"Image already under {max_size_mb}MB limit: {len(image_bytes)} bytes")
        return image_bytes

    logger.info(f"Image too large ({len(image_bytes)} bytes), compressing to under {max_size_mb}MB...")

    try:
        img = Image.open(io.BytesIO(image_bytes))
        original_size = img.size
        original_mode = img.mode

        # Convert RGBA to RGB with white background for JPEG compatibility
        if img.mode in ('RGBA', 'LA', 'PA'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'RGBA':
                background.paste(img, mask=img.split()[3])
            else:
                img_rgba = img.convert('RGBA')
                background.paste(img_rgba, mask=img_rgba.split()[3])
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        # Try progressive JPEG compression with decreasing quality
        for quality in [95, 85, 75, 65, 55, 45]:
            buf = io.BytesIO()
            img.save(buf, format='JPEG', quality=quality, optimize=True)
            compressed = buf.getvalue()

            if len(compressed) <= max_bytes:
                logger.info(
                    f"Compressed: {len(image_bytes)} → {len(compressed)} bytes "
                    f"({original_mode} {original_size} → JPEG q{quality})"
                )
                return compressed

        # If still too large, resize image
        logger.warning(f"Image still too large after JPEG compression, resizing...")
        scale_factors = [0.9, 0.8, 0.7, 0.6, 0.5]

        for scale in scale_factors:
            new_size = (int(img.width * scale), int(img.height * scale))
            resized = img.resize(new_size, Image.LANCZOS)

            buf = io.BytesIO()
            resized.save(buf, format='JPEG', quality=85, optimize=True)
            compressed = buf.getvalue()

            if len(compressed) <= max_bytes:
                logger.info(
                    f"Compressed with resize: {len(image_bytes)} → {len(compressed)} bytes "
                    f"({original_size} → {new_size}, JPEG q85)"
                )
                return compressed

        # If all else fails, return the smallest we could achieve
        logger.warning(f"Could not compress below {max_size_mb}MB, returning best effort")
        return compressed

    except Exception as e:
        logger.error(f"Compression failed: {e}, returning original")
        return image_bytes


def construct_outfit_image(upper_bytes: bytes, lower_bytes: bytes) -> bytes:
    """
    Construct a full outfit image by vertically stacking upper and lower garments.

    Places the upper garment (shirt/top) on top and lower garment (pants/skirt)
    on the bottom, creating a complete outfit visualization.

    Args:
        upper_bytes: Image bytes of upper garment (shirt, t-shirt, jacket, etc.)
        lower_bytes: Image bytes of lower garment (pants, skirt, shorts, etc.)

    Returns:
        PNG-formatted image bytes of the constructed full outfit

    Raises:
        ValueError: If images cannot be opened or processed
    """
    try:
        # Open both images
        upper_img = Image.open(io.BytesIO(upper_bytes))
        lower_img = Image.open(io.BytesIO(lower_bytes))

        logger.info(f"Upper garment: {upper_img.size}, mode={upper_img.mode}")
        logger.info(f"Lower garment: {lower_img.size}, mode={lower_img.mode}")

        # Convert to RGBA for consistent handling
        upper_img = upper_img.convert('RGBA')
        lower_img = lower_img.convert('RGBA')

        # Calculate dimensions for the merged image
        # Use the maximum width and sum of heights
        max_width = max(upper_img.width, lower_img.width)
        total_height = upper_img.height + lower_img.height

        logger.info(f"Constructing outfit: {max_width}x{total_height}")

        # Resize images to same width if needed (maintain aspect ratio)
        if upper_img.width != max_width:
            aspect_ratio = upper_img.height / upper_img.width
            new_height = int(max_width * aspect_ratio)
            upper_img = upper_img.resize((max_width, new_height), Image.LANCZOS)
            logger.debug(f"Resized upper garment to: {upper_img.size}")

        if lower_img.width != max_width:
            aspect_ratio = lower_img.height / lower_img.width
            new_height = int(max_width * aspect_ratio)
            lower_img = lower_img.resize((max_width, new_height), Image.LANCZOS)
            logger.debug(f"Resized lower garment to: {lower_img.size}")

        # Recalculate total height after resizing
        total_height = upper_img.height + lower_img.height
        outfit_img = Image.new('RGB', (max_width, total_height), (255, 255, 255))

        # Paste upper garment at top
        # Center horizontally if needed
        upper_x = (max_width - upper_img.width) // 2
        outfit_img.paste(upper_img, (upper_x, 0), upper_img if upper_img.mode == 'RGBA' else None)

        # Paste lower garment below upper
        lower_x = (max_width - lower_img.width) // 2
        lower_y = upper_img.height
        outfit_img.paste(lower_img, (lower_x, lower_y), lower_img if lower_img.mode == 'RGBA' else None)

        # Convert to PNG bytes
        buf = io.BytesIO()
        outfit_img.save(buf, format='PNG', optimize=True)

        png_bytes = buf.getvalue()
        logger.info(f"Outfit constructed successfully: {len(png_bytes)} bytes")

        return png_bytes

    except Exception as e:
        logger.error(f"Failed to construct outfit image: {e}")
        raise ValueError(f"Outfit construction failed: {e}") from e
