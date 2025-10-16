"""
Cloudinary upload and management service.
"""
import io
import logging
from typing import Optional

import cloudinary
import cloudinary.uploader
import requests

from config import CLOUDINARY_CONFIG, MAX_CONTENT_BYTES
from services.image_processing import compress_image_for_upload

logger = logging.getLogger(__name__)

# Configure Cloudinary
cloudinary.config(**CLOUDINARY_CONFIG)


def upload_bytes(data: bytes, public_id: str, folder: str, fmt: Optional[str] = None) -> dict:
    """
    Upload bytes to Cloudinary with automatic compression.

    Compresses images to stay under Cloudinary's 10MB free tier limit.

    Args:
        data: Image bytes to upload
        public_id: Public ID for the image
        folder: Cloudinary folder path
        fmt: Optional format (e.g., "png", "jpg")

    Returns:
        Cloudinary upload response dict with 'secure_url'
    """
    # Compress image if needed (targets 9.5MB to stay under 10MB limit)
    logger.info(f"Preparing upload: {len(data)} bytes")
    compressed_data = compress_image_for_upload(data, max_size_mb=9.5)

    kwargs = {
        "folder": folder,
        "public_id": public_id,
        "resource_type": "image",
        "overwrite": True,
    }
    if fmt:
        kwargs["format"] = fmt

    logger.info(f"Uploading to Cloudinary: {len(compressed_data)} bytes → {folder}/{public_id}")
    result = cloudinary.uploader.upload(io.BytesIO(compressed_data), **kwargs)
    logger.info(f"Upload successful: {result.get('secure_url')}")

    return result


def download_url_bytes(url: str, max_bytes: int = MAX_CONTENT_BYTES) -> bytes:
    """
    Download image from URL with size limit.

    Args:
        url: Image URL to download
        max_bytes: Maximum allowed file size

    Returns:
        Downloaded image bytes

    Raises:
        ValueError: If file exceeds max_bytes
    """
    r = requests.get(url, stream=True, timeout=20)
    r.raise_for_status()

    total = 0
    chunks = []

    for chunk in r.iter_content(1024 * 64):  # 64KB chunks
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise ValueError("File too large")
        chunks.append(chunk)

    return b"".join(chunks)
