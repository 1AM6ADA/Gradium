from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text, inspect
import os

from app.database import engine, Base
from app.config import settings
from app.api.routes import auth, quiz, student, websocket, teacher, test as test_routes

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
    ],
    "answers": [
        ("selected", "JSON"),
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
            for name, ddl in columns:
                if name not in present:
                    conn.execute(text(f'ALTER TABLE {table} ADD COLUMN {name} {ddl}'))


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _run_lightweight_migrations()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    yield


app = FastAPI(
    title="EduTest AI",
    description="AI-powered quiz platform for teachers and students",
    version="1.0.0",
    lifespan=lifespan,
)

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
app.include_router(websocket.router, prefix="/ws", tags=["websocket"])


@app.get("/")
def root():
    return {"status": "ok", "service": "EduTest AI API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
