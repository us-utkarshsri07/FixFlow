from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routes import github, analysis, fixes

app = FastAPI(
    title="FixFlow API",
    version="1.0.0",
)

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(github.router)
app.include_router(analysis.router)
app.include_router(fixes.router)


@app.get("/health", tags=["meta"])
async def health() -> dict:
    return {"status": "ok"}
