from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="APP_", env_file=".env", extra="ignore")

    env: str = "development"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])
    frontend_base_url: str = "http://localhost:5176"
    mongodb_uri: str | None = Field(default=None, alias="MONGODB_URI")
    mongodb_db: str = Field(default="cloistr", alias="MONGODB_DB")
    mail_from_address: str = "no-reply@cloistr.local"
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False
    smtp_timeout_seconds: int = 10

    google_client_id: str | None = None
    google_client_secret: str | None = None
    github_client_id: str | None = None
    github_client_secret: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
