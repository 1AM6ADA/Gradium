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

    # "production" (default) hides the interactive API docs and enforces a
    # non-default SECRET_KEY at boot. Set ENVIRONMENT=development locally to get
    # /docs back.
    ENVIRONMENT: str = "production"

    # --- Abuse / DoS protection -------------------------------------------
    # The backend is reachable directly from browsers (the SPA calls it via
    # NEXT_PUBLIC_API_URL), so these limits are its first line of defence.
    RATE_LIMIT_ENABLED: bool = True
    # Requests allowed per client IP within RATE_LIMIT_WINDOW_SECONDS, by class.
    RATE_LIMIT_WINDOW_SECONDS: int = 60
    RATE_LIMIT_GENERAL: int = 120      # ordinary API calls
    RATE_LIMIT_AUTH: int = 8           # login / register / redeem (anti-bruteforce)
    RATE_LIMIT_AI: int = 6             # expensive LLM calls (generate/summarize/...)
    RATE_LIMIT_UPLOAD: int = 12        # multipart file uploads
    # Hard cap on request body size (bytes). Blocks memory-exhaustion via giant
    # uploads before the body is ever read into RAM. 30 MB covers slide decks.
    MAX_BODY_BYTES: int = 30 * 1024 * 1024
    # Only enable when the app sits behind a reverse proxy you control (nginx,
    # Caddy). When True the client IP is taken from X-Forwarded-For; when False
    # (direct exposure) it is taken from the socket, which cannot be spoofed.
    TRUST_PROXY: bool = False

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

    # Admin accounts (comma-separated emails). These users can open the admin
    # panel to mint promo codes and manage every subscription.
    ADMIN_EMAILS: str = "muhammadjonaslonov4@gmail.com"

    # Subscription tiers gate AI quiz/test generation by a quota that resets
    # each period. Everything else — creating quizzes, running live sessions,
    # publishing tests, manual questions — is available on every tier.
    #
    # Monthly reset matches how teachers actually work (bursty prep) and the AI
    # quiz-tool market (Quizgecko/Conker/MagicSchool all meter per month).
    # Set to "daily", "weekly", or "monthly".
    GENERATION_PERIOD: str = "monthly"
    FREE_GENERATIONS: int = 3
    PRO_GENERATIONS: int = 30
    MAX_GENERATIONS: int = 60

    _DEFAULT_SECRET = "change-this-secret-key-in-production"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.strip().lower() not in {"dev", "development", "local", "test"}

    @property
    def secret_key_is_default(self) -> bool:
        return self.SECRET_KEY.strip() == self._DEFAULT_SECRET

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def admin_emails_list(self) -> List[str]:
        return [e.strip().lower() for e in self.ADMIN_EMAILS.split(",") if e.strip()]


settings = Settings()
