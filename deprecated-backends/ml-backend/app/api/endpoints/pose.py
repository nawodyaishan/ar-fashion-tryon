from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import Optional

from app.services.pose_service import PoseService
from app.models.schemas import PoseDetectionResult

router = APIRouter(prefix="/pose", tags=["pose"])
pose_service = PoseService()

@router.post("/detect", response_model=Optional[PoseDetectionResult])
async def detect_pose(file: UploadFile = File(...)):
    """Detect human pose from uploaded image"""

    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Read file content
    content = await file.read()

    # Detect pose
    result = await pose_service.detect_pose(content)

    if not result:
        raise HTTPException(status_code=404, detail="No pose detected in image")

    return result