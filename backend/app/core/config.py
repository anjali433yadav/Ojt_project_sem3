
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

backend_env = Path(__file__).resolve().parent.parent.parent / ".env"

class Settings(BaseSettings):
    DATABASE_URL: str

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.5-flash"

    model_config = SettingsConfigDict(
        env_file=[str(backend_env), ".env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
