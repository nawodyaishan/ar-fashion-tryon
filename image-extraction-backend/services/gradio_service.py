"""
Gradio API client service for virtual try-on.
"""
import asyncio
import logging
from pathlib import Path
from typing import Optional, Any

from fastapi import HTTPException
from gradio_client import Client, handle_file
from starlette.concurrency import run_in_threadpool

from config import GRADIO_SPACE, HF_TOKEN, MAX_CONTENT_BYTES
from services.cloudinary_service import download_url_bytes
from services.image_processing import convert_to_rgb_png

logger = logging.getLogger(__name__)

# Singleton Gradio client
gradio_client: Optional[Client] = None


async def get_gradio_client() -> Client:
    """Get or create Gradio client (singleton pattern)."""
    global gradio_client

    if gradio_client is None:
        try:
            logger.info(f"Connecting to Gradio Space: {GRADIO_SPACE}")
            # Create client with specific version compatibility
            gradio_client = await asyncio.to_thread(
                Client,
                GRADIO_SPACE,
                hf_token=HF_TOKEN if HF_TOKEN else None
            )
            logger.info("✅ Gradio client connected successfully")
        except Exception as e:
            logger.error(f"❌ Gradio client connection failed: {e}")
            # Don't set gradio_client = None, let it retry next time
            raise HTTPException(
                status_code=503,
                detail=f"Unable to connect to AI service: {str(e)}"
            )

    return gradio_client


async def _download_gradio_result(result_data: Any, base_url: str) -> bytes:
    """
    Download result image from Gradio API response.

    Args:
        result_data: Gradio result (dict, list, tuple, or string with file path/url)
        base_url: Gradio Space base URL

    Returns:
        Image bytes
    """
    # Log full result structure for debugging
    logger.info(f"Gradio result type: {type(result_data)}")
    logger.debug(f"Gradio result data: {result_data}")

    # Extract file path from result
    file_path = None

    # Handle different result types
    if isinstance(result_data, dict):
        # Dict: look for 'url', 'path', or 'name' keys
        file_path = result_data.get('url') or result_data.get('path') or result_data.get('name')
        logger.debug(f"Extracted from dict: {file_path}")

    elif isinstance(result_data, (list, tuple)):
        # List/Tuple: Gradio might return [intermediate, final] - take the LAST one
        if len(result_data) > 0:
            last_item = result_data[-1]
            logger.info(f"Result is list/tuple with {len(result_data)} items, using last item")

            if isinstance(last_item, dict):
                file_path = last_item.get('url') or last_item.get('path') or last_item.get('name')
            else:
                file_path = str(last_item)

            logger.debug(f"Extracted from list/tuple: {file_path}")

    elif isinstance(result_data, str):
        # String: direct file path or URL
        file_path = result_data
        logger.debug(f"Result is string: {file_path}")

    else:
        # Unknown type - try to convert to string
        file_path = str(result_data)
        logger.warning(f"Unknown result type {type(result_data)}, converted to string: {file_path}")

    # Validate file path
    if not file_path or file_path == 'None':
        raise ValueError(f"No valid file path in Gradio response. Result data: {result_data}")

    logger.info(f"Final extracted file path: {file_path}")

    # Download or read the image bytes
    image_bytes = None

    # Check if file_path is a local file that gradio_client already downloaded
    if file_path.startswith('/') and Path(file_path).exists():
        # Gradio client already downloaded the file locally
        logger.info(f"Reading locally downloaded file: {file_path}")
        try:
            def read_local_file(path: str) -> bytes:
                with open(path, 'rb') as f:
                    return f.read()

            image_bytes = await run_in_threadpool(read_local_file, file_path)
            logger.info(f"Successfully read {len(image_bytes)} bytes from local file")
        except Exception as e:
            logger.warning(f"Failed to read local file {file_path}: {e}, will try URL download")
            # Fall through to URL download

    # If local read failed or file doesn't exist, download from URL
    if image_bytes is None:
        # Construct download URL
        if file_path.startswith('/'):
            # Local file path → construct Gradio file URL
            image_url = f"{base_url}/gradio_api/file={file_path}"
            logger.info(f"Constructed URL from local path: {image_url}")
        elif file_path.startswith('http'):
            # Already a full URL
            image_url = file_path
            logger.info(f"Using full URL: {image_url}")
        else:
            # Relative path → construct full URL
            image_url = f"{base_url}/{file_path}"
            logger.info(f"Constructed URL from relative path: {image_url}")

        # Download image from URL
        logger.info(f"Downloading from URL: {image_url}")
        image_bytes = await run_in_threadpool(download_url_bytes, image_url, MAX_CONTENT_BYTES)
        logger.info(f"Successfully downloaded {len(image_bytes)} bytes")

    # Convert WebP/any format to RGB PNG for consistency and Cloudinary compatibility
    logger.info("Converting result image to RGB PNG format")
    png_bytes = await run_in_threadpool(convert_to_rgb_png, image_bytes)

    return png_bytes


async def call_gradio_api(
    person_img_path: str,
    cloth_img_path: str,
    cloth_type: str,
    num_inference_steps: int,
    guidance_scale: float,
    seed: int,
    show_type: str,
    max_retries: int = 3
) -> bytes:
    """
    Call Gradio API with retry logic.

    Args:
        person_img_path: Path to person image
        cloth_img_path: Path to cloth image
        cloth_type: Type of clothing (upper, lower, overall)
        num_inference_steps: Number of diffusion steps
        guidance_scale: Guidance scale for diffusion
        seed: Random seed
        show_type: Output display type
        max_retries: Maximum retry attempts

    Returns:
        Result image as bytes

    Raises:
        HTTPException: If all retries fail
    """
    client = await get_gradio_client()

    for attempt in range(max_retries):
        try:
            logger.info(
                f"Gradio API attempt {attempt + 1}/{max_retries}: "
                f"type={cloth_type}, steps={num_inference_steps}, guidance={guidance_scale}, seed={seed}"
            )

            # Call Gradio API
            result = await asyncio.to_thread(
                client.predict,
                person_image={"background": handle_file(person_img_path), "layers": [], "composite": None},
                cloth_image=handle_file(cloth_img_path),
                cloth_type=cloth_type,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
                seed=seed,
                show_type=show_type,
                api_name="/submit_function"
            )

            logger.info("Gradio API call successful")

            # Construct base URL for Gradio Space
            base_url = f"https://{GRADIO_SPACE.replace('/', '-')}.hf.space"

            # Download result image
            result_bytes = await _download_gradio_result(result, base_url)
            return result_bytes

        except Exception as e:
            logger.error(f"Gradio API attempt {attempt + 1} failed: {e}")

            if attempt == max_retries - 1:
                raise HTTPException(
                    status_code=500,
                    detail=f"Virtual try-on failed after {max_retries} attempts: {str(e)}"
                )

            # Exponential backoff
            wait_time = 2 ** attempt
            logger.info(f"Retrying in {wait_time} seconds...")
            await asyncio.sleep(wait_time)
