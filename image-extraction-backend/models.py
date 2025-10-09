"""
Pydantic models for request/response schemas.
"""
from pydantic import BaseModel


class HealthOut(BaseModel):
    status: str = "ok"


class UrlIn(BaseModel):
    source_url: str


class VirtualTryonRequest(BaseModel):
    cloth_type: str = "upper"  # upper, lower, overall
    num_inference_steps: int = 50
    guidance_scale: float = 2.5
    seed: int = 42
    show_type: str = "result only"  # result only, input & result, input & mask & result
