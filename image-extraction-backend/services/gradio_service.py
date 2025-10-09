"""
Gradio API client service for virtual try-on.
"""
import asyncio
import logging
from typing import Optional, Any

from fastapi import HTTPException
from gradio_client import Client, handle_file
from starlette.concurrency import run_in_threadpool

from config import GRADIO_SPACE, HF_TOKEN, MAX_CONTENT_BYTES
from services.cloudinary_service import download_url_bytes

logger = logging.getLogger(__name__)

# Singleton Gradio client
gradio_client: Optional[Client] = None


async def get_gradio_client() -> Client:
    """Get or create Gradio client (singleton pattern)."""
    global gradio_client

    if gradio_client is None:
        try:
            logger.info(f"Connecting to Gradio Space: {GRADIO_SPACE}")
            gradio_client = await asyncio.to_thread(
                Client,
                GRADIO_SPACE,
                hf_token=HF_TOKEN
            )
            logger.info("Gradio client connected successfully")
        except Exception as e:
            logger.error(f"Gradio client connection failed: {e}")
            raise HTTPException(
                status_code=503,
                detail=f"Unable to connect to AI service: {str(e)}"
            )

    return gradio_client


async def _download_gradio_result(result_data: Any) -> bytes:
    """Download result image from Gradio API response."""
    # Gradio returns dict with 'path' or 'url'
    if isinstance(result_data, dict):
        image_url = result_data.get('url') or result_data.get('path')
    else:
        # Sometimes returns just the path/url string
        image_url = str(result_data)

    if not image_url:
        raise ValueError("No image URL in Gradio response")

    # Download image
    return await run_in_threadpool(download_url_bytes, image_url, MAX_CONTENT_BYTES)


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

            # Download result image
            result_bytes = await _download_gradio_result(result)
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
