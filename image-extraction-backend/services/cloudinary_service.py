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

logger = logging.getLogger(__name__)

# Configure Cloudinary
cloudinary.config(**CLOUDINARY_CONFIG)


def upload_bytes(data: bytes, public_id: str, folder: str, fmt: Optional[str] = None) -> dict:
    """
    Upload bytes to Cloudinary.

    Args:
        data: Image bytes to upload
        public_id: Public ID for the image
        folder: Cloudinary folder path
        fmt: Optional format (e.g., "png", "jpg")

    Returns:
        Cloudinary upload response dict with 'secure_url'
    """
    kwargs = {
        "folder": folder,
        "public_id": public_id,
        "resource_type": "image",
        "overwrite": True,
    }
    if fmt:
        kwargs["format"] = fmt

    return cloudinary.uploader.upload(io.BytesIO(data), **kwargs)


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
