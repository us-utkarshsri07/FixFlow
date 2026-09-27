from fastapi import APIRouter, HTTPException, status

from app.models.schemas import FixRequest, FixResponse
from app.services import ai_service

router = APIRouter(prefix="/api/fixes", tags=["fixes"])


@router.post("", response_model=FixResponse)
async def generate_fix(body: FixRequest) -> FixResponse:
    try:
        return await ai_service.generate_fix(
            bug_id=body.bug_id,
            repository_url=body.repository_url,
            affected_file=body.affected_file,
            root_cause=body.root_cause,
            recommended_fix=body.recommended_fix,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Fix generation failed: {exc}") from exc
