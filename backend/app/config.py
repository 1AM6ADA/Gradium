from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=False,
    )

    DATABASE_URL: str = "sqlite:///./edutest.db"
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days

    # Which LLM backs question generation: "gemini" (reads PDFs visually),
    # "deepseek" (text-only, OpenAI-compatible), or "gigachat" (Sber, text-only
    # — slides are converted to extracted text first).
    AI_PROVIDER: str = "deepseek"

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_MODEL: str = "deepseek-chat"
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com"

    # GigaChat (Sber). GIGACHAT_AUTH_KEY is the base64 "Authorization key"
    # (client_id:client_secret) from the Sber developer console — it is
    # exchanged for a short-lived OAuth access token automatically.
    # Scope is GIGACHAT_API_PERS (personal), GIGACHAT_API_B2B or
    # GIGACHAT_API_CORP. verify_ssl is off by default because Sber serves the
    # API behind the Russian Ministry of Digital Development root CA, which is
    # usually not in the system trust store.
    GIGACHAT_AUTH_KEY: str = ""
    GIGACHAT_SCOPE: str = "GIGACHAT_API_PERS"
    GIGACHAT_MODEL: str = "GigaChat-2"
    # GigaChat's server-side default is ~1024 output tokens, which truncates
    # larger question batches mid-JSON. Raise it explicitly.
    GIGACHAT_MAX_TOKENS: int = 4096
    GIGACHAT_OAUTH_URL: str = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth"
    GIGACHAT_BASE_URL: str = "https://gigachat.devices.sberbank.ru/api/v1"
    GIGACHAT_VERIFY_SSL: bool = False

    UPLOAD_DIR: str = "uploads"
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
