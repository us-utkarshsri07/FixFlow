
from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GITHUB_TOKEN: str = Field(default="")
    OPEN_AI_KEY: str = Field(default="")
    AI_MODEL: str = Field(default="gpt-4o-mini")
    BACKEND_HOST: str = Field(default="0.0.0.0")
    BACKEND_PORT: int = Field(default=8000)
    FRONTEND_ORIGIN: str = Field(default="http://localhost:5173")
    GITHUB_API_BASE: str = "https://api.github.com"
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

@lru_cache
def get_settings() -> Settings:
    return Settings()
