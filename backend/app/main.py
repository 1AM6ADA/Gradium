from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from app.database import engine, Base
from app.config import settings
from app.api.routes import auth, quiz, student, websocket

import app.models  # noqa: F401 — ensure all models are registered before create_all


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
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
app.include_router(websocket.router, prefix="/ws", tags=["websocket"])


@app.get("/")
def root():
    return {"status": "ok", "service": "EduTest AI API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
