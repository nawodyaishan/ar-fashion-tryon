"""
Pydantic models for request/response schemas.
"""
from typing import Optional, Dict
from pydantic import BaseModel


class HealthOut(BaseModel):
    status: str = "ok"
    version: str = "2.0.0"
    model_loaded: bool = False
    model_name: Optional[str] = None
    gradio_connected: bool = False
    services: Optional[Dict[str, str]] = None


class UrlIn(BaseModel):
    source_url: str


class VirtualTryonRequest(BaseModel):
    cloth_type: str = "upper"  # upper, lower, overall
    num_inference_steps: int = 50
    guidance_scale: float = 2.5
    seed: int = 42
    show_type: str = "result only"  # result only, input & result, input & mask & result


class FitRequest(BaseModel):
    """Request model for /fit/garment/top endpoint."""
    gsm_id: str
    pose: Dict[str, list]  # {"L_shoulder": [x, y, visibility], ...}
    prev_state: Optional[Dict] = None
    session_id: Optional[str] = "default"
