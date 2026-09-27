from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status

from app.models.schemas import AnalysisRequest, AnalysisResponse
from app.services import ai_service

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.post("", response_model=AnalysisResponse)
async def analyze_issue(body: AnalysisRequest) -> AnalysisResponse:
    try:
        bug = await ai_service.analyze_bug(
            repository_url=body.repository_url,
            title=body.title,
            severity=body.severity,
            description=body.description,
            environment=body.environment,
        )
        return AnalysisResponse(
            bug=bug,
            repository_url=body.repository_url,
            analyzed_at=datetime.now(timezone.utc).isoformat(),
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Analysis failed: {exc}") from exc
