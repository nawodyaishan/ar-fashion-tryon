"""
Image processing service for background removal and format conversion.
"""
import io
import logging
from pathlib import Path
from typing import Dict, Tuple, Optional

import numpy as np
from PIL import Image
from rembg import remove
import cv2

logger = logging.getLogger(__name__)

# Type alias for normalized coordinates (0..1)
Vec2 = Tuple[float, float]

# -------- Defaults for anchors (normalized) --------
DEFAULTS = {
    "shirt":  {
        "collar_left":  (0.31, 0.13),
        "collar_right": (0.69, 0.13),
        "neck_apex":    (0.50, 0.19),
    },
    "tshirt": {
        "collar_left":  (0.32, 0.12),
        "collar_right": (0.68, 0.12),
        "neck_apex":    (0.50, 0.16),
    },
}
BODY_OFFSETS = {"neck_drop_ratio": 0.06, "torso_length_ratio": 1.05}


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


# ==================== AR-Ready Garment Processing ====================

def _ensure_rgba(im: Image.Image) -> Image.Image:
    """Ensure image is in RGBA mode."""
    return im.convert("RGBA") if im.mode != "RGBA" else im


def remove_background_rgba(image_bytes: bytes) -> Image.Image:
    """
    Remove background from image and return RGBA image.

    Args:
        image_bytes: Raw image bytes

    Returns:
        RGBA Image with transparent background
    """
    im = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    cutout = remove(im)  # rembg returns RGBA image

    # Ensure RGBA mode
    if isinstance(cutout, bytes):
        im_rgba = Image.open(io.BytesIO(cutout)).convert("RGBA")
    else:
        im_rgba = cutout.convert("RGBA")

    return im_rgba


def pil_to_cv_rgba(im: Image.Image) -> np.ndarray:
    """
    Convert PIL Image to OpenCV BGRA format.

    Args:
        im: PIL Image

    Returns:
        OpenCV BGRA numpy array
    """
    im = _ensure_rgba(im)
    arr = np.array(im)  # RGBA
    # PIL RGBA -> OpenCV BGRA
    return cv2.cvtColor(arr, cv2.COLOR_RGBA2BGRA)


def cv_to_pil_rgba(arr_bgra: np.ndarray) -> Image.Image:
    """
    Convert OpenCV BGRA array to PIL RGBA Image.

    Args:
        arr_bgra: OpenCV BGRA numpy array

    Returns:
        PIL RGBA Image
    """
    arr_rgba = cv2.cvtColor(arr_bgra, cv2.COLOR_BGRA2RGBA)
    return Image.fromarray(arr_rgba, mode="RGBA")


def estimate_neck_apex_from_mask(
    alpha: np.ndarray, px_L: Tuple[int, int], px_R: Tuple[int, int]
) -> Tuple[int, int]:
    """
    Estimate neck apex point from alpha mask using heuristics.

    Scans near the horizontal midpoint between collar tips and picks the
    deepest visible point of the 'opening' (lowest y with low alpha above).

    Args:
        alpha: Alpha channel as uint8 (0..255) numpy array
        px_L: Left collar point (x, y)
        px_R: Right collar point (x, y)

    Returns:
        Estimated neck apex point (x, y)
    """
    h, w = alpha.shape
    xL, _ = px_L
    xR, _ = px_R
    x_mid = int((xL + xR) / 2)

    # Search a small horizontal band around mid (±6% of width)
    band = max(4, int(0.06 * w))
    xs = range(max(0, x_mid - band), min(w - 1, x_mid + band))

    best_y = int(0.18 * h)  # reasonable fallback
    best_sum = -1

    for x in xs:
        # find first opaque pixel *from top* (collar or garment)
        col = alpha[:, x]
        ys = np.where(col > 16)[0]  # first opaque row
        if ys.size == 0:
            continue
        y_first = ys[0]

        # look for a local "dip": count zeros above y_first
        score = y_first
        if score > best_sum:
            best_sum = score
            best_y = y_first

    return (x_mid, int(best_y))


def cut_back_neck_with_bezier(
    bgra: np.ndarray,
    px_L: Tuple[int, int],
    px_R: Tuple[int, int],
    px_A: Optional[Tuple[int, int]] = None,
) -> np.ndarray:
    """
    Cut the back neck region using a quadratic Bezier curve.

    Subtracts alpha above a quadratic Bezier from L->A->R to remove
    the back collar region.

    Args:
        bgra: OpenCV BGRA image
        px_L: Left collar point (x, y)
        px_R: Right collar point (x, y)
        px_A: Neck apex point (x, y), estimated if None

    Returns:
        Modified BGRA image with neck region removed
    """
    h, w = bgra.shape[:2]
    b, g, r, a = cv2.split(bgra)

    if px_A is None:
        px_A = estimate_neck_apex_from_mask(a, px_L, px_R)

    L = np.array(px_L, dtype=np.float32)
    R = np.array(px_R, dtype=np.float32)
    A = np.array(px_A, dtype=np.float32)

    # Generate Bezier curve points
    t = np.linspace(0.0, 1.0, 220, dtype=np.float32)[:, None]
    curve = ((1 - t) ** 2) * L + 2 * (1 - t) * t * A + (t ** 2) * R
    curve = np.round(curve).astype(np.int32)

    # Polygon: top-left -> top-right -> reversed curve
    poly = np.vstack([
        np.array([[0, 0], [w - 1, 0]], dtype=np.int32),
        curve[::-1]
    ]).astype(np.int32)

    # Create mask for region above curve
    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.fillPoly(mask, [poly], 255)

    # Subtract: anything above curve => set alpha to 0
    a_cut = cv2.subtract(a, mask)

    # Small feather to anti-alias
    a_cut = cv2.GaussianBlur(a_cut, (3, 3), 0)

    out = cv2.merge([b, g, r, a_cut])
    return out


def autocrop_rgba(bgra: np.ndarray, pad: int = 4) -> Tuple[np.ndarray, Tuple[int, int, int, int]]:
    """
    Auto-crop image to bounding box of non-transparent pixels.

    Args:
        bgra: OpenCV BGRA image
        pad: Padding to add around bounding box

    Returns:
        Tuple of (cropped BGRA image, bbox as (x0, y0, w, h))
    """
    h, w = bgra.shape[:2]
    alpha = bgra[:, :, 3]
    ys, xs = np.where(alpha > 0)

    if ys.size == 0:
        return bgra, (0, 0, w, h)

    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad, w - 1)
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad, h - 1)

    cropped = bgra[y0 : y1 + 1, x0 : x1 + 1, :]
    return cropped, (x0, y0, x1 - x0 + 1, y1 - y0 + 1)


def process_shirt_top_png(
    image_bytes: bytes,
    category: str = "shirt",
    anchors_norm: Optional[Dict[str, Vec2]] = None,
    use_defaults: bool = True,
) -> Tuple[bytes, Dict]:
    """
    Main pipeline for AR-ready garment processing.

    Steps:
      1) Background removal → RGBA
      2) Compute pixel anchors (use provided or defaults)
      3) Bezier 'neck cut' → remove back collar
      4) Auto-crop and re-normalize anchors
      5) Return PNG bytes + metadata

    Args:
        image_bytes: Raw image bytes
        category: "shirt" or "tshirt"
        anchors_norm: Optional custom anchor points (normalized 0..1)
        use_defaults: Whether to use default anchors for category

    Returns:
        Tuple of (PNG bytes, metadata dict)

    Raises:
        ValueError: If category is not supported
    """
    category = category.lower()
    if category not in ("shirt", "tshirt"):
        raise ValueError("Only 'shirt' or 'tshirt' categories are supported.")

    # (1) Remove background
    logger.info(f"Processing {category} for AR: removing background...")
    im_rgba = remove_background_rgba(image_bytes)
    bgra = pil_to_cv_rgba(im_rgba)
    h0, w0 = bgra.shape[:2]

    # (2) Anchors (normalized → pixels)
    anchors = {}
    if use_defaults:
        anchors.update(DEFAULTS[category])
    if anchors_norm:
        anchors.update(anchors_norm)  # override any default with user-provided

    def n2p(k: str) -> Tuple[int, int]:
        """Convert normalized anchor to pixel coordinates."""
        x, y = anchors[k]
        return int(round(x * w0)), int(round(y * h0))

    px_L = n2p("collar_left")
    px_R = n2p("collar_right")
    px_A = None
    if "neck_apex" in anchors:
        px_A = n2p("neck_apex")

    # (3) Cut the back neck region
    logger.info(f"Cutting back neck region with Bezier curve...")
    bgra_cut = cut_back_neck_with_bezier(bgra, px_L, px_R, px_A)

    # (4) Auto-crop + renormalize anchors
    logger.info(f"Auto-cropping to garment bounds...")
    cropped, (x0, y0, w, h) = autocrop_rgba(bgra_cut, pad=4)

    def renorm(px: Tuple[int, int]) -> Tuple[float, float]:
        """Re-normalize pixel coordinates to cropped image space."""
        x, y = px
        return ((x - x0) / max(w, 1), (y - y0) / max(h, 1))

    anchors_out = {
        "collar_left":  renorm(px_L),
        "collar_right": renorm(px_R),
    }

    # If we had an explicit apex or we estimated one during cut, compute it for output
    if px_A is None:
        px_A = estimate_neck_apex_from_mask(
            cropped[:, :, 3],
            (px_L[0] - x0, px_L[1] - y0),
            (px_R[0] - x0, px_R[1] - y0)
        )
        px_A = (px_A[0] + x0, px_A[1] + y0)
    anchors_out["neck_apex"] = renorm(px_A)

    meta = {
        "version": 1,
        "category": category,
        "w": int(w),
        "h": int(h),
        "anchors": anchors_out,
        "body_offsets": BODY_OFFSETS,
    }

    # (5) Encode PNG
    pil_out = cv_to_pil_rgba(cropped)
    buf = io.BytesIO()
    pil_out.save(buf, format="PNG")

    logger.info(f"AR-ready garment processed: {w}x{h} PNG, {len(buf.getvalue())} bytes")
    return buf.getvalue(), meta
