"""
Application settings loaded from environment variables.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/dids"

    # JWT
    jwt_secret: str = "change-me-to-a-long-random-secret-min-32-chars"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24  # 24 hours
    dids_internal_api_key: str | None = None

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # ML model path (relative to project root)
    model_dir: str = "ml"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
