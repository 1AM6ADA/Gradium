from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text, inspect
import logging
import os

from app.database import engine, Base
from app.config import settings
from app.security import (
    RateLimitMiddleware,
    MaxBodySizeMiddleware,
    SecurityHeadersMiddleware,
)
from app.api.routes import auth, quiz, student, websocket, teacher, test as test_routes, admin

logger = logging.getLogger("uvicorn.error")

import app.models  # noqa: F401 — ensure all models are registered before create_all


# Columns added after the original schema shipped. SQLite's create_all() does
# not ALTER existing tables, so we add any missing columns idempotently on boot
# (lightweight migration that preserves existing data).
_ADDED_COLUMNS = {
    "quizzes": [
        ("attendance_enabled", "BOOLEAN NOT NULL DEFAULT 0"),
        ("speed_bonus", "BOOLEAN NOT NULL DEFAULT 1"),
        ("streak_bonus", "BOOLEAN NOT NULL DEFAULT 0"),
        ("mode", "VARCHAR NOT NULL DEFAULT 'quiz'"),
        ("opens_at", "DATETIME"),
        ("closes_at", "DATETIME"),
        ("share_token", "VARCHAR"),
        ("source_pdf_path", "VARCHAR"),
        ("source_filename", "VARCHAR"),
    ],
    "questions": [
        ("points", "INTEGER NOT NULL DEFAULT 1000"),
        ("multiple", "BOOLEAN NOT NULL DEFAULT 0"),
        ("correct_answers", "JSON"),
        ("qtype", "VARCHAR NOT NULL DEFAULT 'multiple_choice'"),
        ("grading_mode", "VARCHAR NOT NULL DEFAULT 'auto'"),
        ("expected_answer", "TEXT"),
        ("source_label", "VARCHAR"),
    ],
    "participants": [
        ("email", "VARCHAR"),
        ("current_streak", "INTEGER NOT NULL DEFAULT 0"),
        ("join_token", "VARCHAR"),
    ],
    "answers": [
        ("selected", "JSON"),
    ],
    "users": [
        # Subscription tiers with a per-day AI-generation quota.
        ("tier", "VARCHAR NOT NULL DEFAULT 'free'"),
        ("generations_today", "INTEGER NOT NULL DEFAULT 0"),
        ("generation_day", "VARCHAR"),
    ],
}


def _run_lightweight_migrations() -> None:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        for table, columns in _ADDED_COLUMNS.items():
            if table not in existing_tables:
                continue
            present = {col["name"] for col in inspector.get_columns(table)}
            newly_added = []
            for name, ddl in columns:
                if name not in present:
                    conn.execute(text(f'ALTER TABLE {table} ADD COLUMN {name} {ddl}'))
                    newly_added.append(name)
            # When the tier column is first introduced, carry existing premium
            # users up to the top tier so they aren't silently downgraded to
            # free. Only touches legacy rows (is_premium=1 still on 'free').
            if table == "users" and "tier" in newly_added:
                conn.execute(text("UPDATE users SET tier='max' WHERE is_premium=1 AND tier='free'"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fail closed: a default/guessable SECRET_KEY lets anyone forge a JWT for any
    # account (including admins), so refuse to boot in production with it set.
    if settings.secret_key_is_default:
        if settings.is_production:
            raise RuntimeError(
                "SECRET_KEY is the built-in default. Set a strong, unique "
                "SECRET_KEY (e.g. `openssl rand -hex 32`) before starting in "
                "production — the default allows JWT forgery / account takeover."
            )
        logger.warning("SECRET_KEY is the built-in default — INSECURE, dev only.")

    if "*" in settings.cors_origins_list:
        # allow_credentials + wildcard origin is a credential-leak footgun.
        raise RuntimeError("CORS_ORIGINS must list explicit origins, not '*'.")

    Base.metadata.create_all(bind=engine)
    _run_lightweight_migrations()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    yield


app = FastAPI(
    title="EduTest AI",
    description="AI-powered quiz platform for teachers and students",
    version="1.0.0",
    lifespan=lifespan,
    # Hide the interactive API map (Swagger/ReDoc/OpenAPI) in production so the
    # full attack surface isn't handed out to anyone.
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

# Middleware order: the last added is the outermost. We want CORS outermost so
# every response (including 413/429 rejections) still carries CORS headers, then
# security headers, body-size guard, and the rate limiter closest to the routes.
app.add_middleware(RateLimitMiddleware)
app.add_middleware(MaxBodySizeMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["quiz"])
app.include_router(student.router, prefix="/api/student", tags=["student"])
app.include_router(teacher.router, prefix="/api/teacher", tags=["teacher"])
app.include_router(test_routes.router, prefix="/api/test", tags=["test"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(websocket.router, prefix="/ws", tags=["websocket"])


@app.get("/")
def root():
    return {"status": "ok", "service": "EduTest AI API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
