from fastapi import APIRouter, HTTPException, status

from app.models.schemas import RepositoryRequest, RepositoryResponse
from app.services import github_service

router = APIRouter(prefix="/api/github", tags=["github"])


@router.post("/repository", response_model=RepositoryResponse)
async def get_repository(body: RepositoryRequest) -> RepositoryResponse:
    try:
        return await github_service.fetch_repository(body.github_url)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except PermissionError as exc:
        msg = str(exc)
        code = status.HTTP_429_TOO_MANY_REQUESTS if "rate limit" in msg.lower() else status.HTTP_401_UNAUTHORIZED
        raise HTTPException(status_code=code, detail=msg) from exc
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ConnectionAbortedError as exc:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to fetch repository: {exc}") from exc
