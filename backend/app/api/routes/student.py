import os
import uuid

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.session import QuizSession, Participant
from app.schemas.session import JoinSessionRequest, JoinSessionResponse
from app.services import ai_service
from app.services.file_service import (
    PresentationConversionError,
    TextExtractionError,
    UnsupportedGenerationFileType,
    extract_text_from_pdf,
    prepare_pdf_for_gemini,
)

router = APIRouter()

_SUMMARIZE_EXTS = {".pdf", ".pptx", ".ppt", ".txt", ".md"}
_SUMMARIZE_MAX_BYTES = 25 * 1024 * 1024


@router.post("/summarize")
async def summarize_document(file: UploadFile = File(...)):
    """Student-facing document summarizer (no auth — same as joining a quiz).
    Extracts text from the uploaded document and returns an AI summary."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in _SUMMARIZE_EXTS:
        raise HTTPException(status_code=400, detail="Only PDF, PPTX/PPT, TXT and MD files are supported")

    content = await file.read()
    if len(content) > _SUMMARIZE_MAX_BYTES:
        raise HTTPException(status_code=400, detail="File is too large (max 25 MB)")

    if ext in {".txt", ".md"}:
        text = content.decode("utf-8", errors="replace")
    else:
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        tmp_path = os.path.join(settings.UPLOAD_DIR, f"summarize_{uuid.uuid4().hex}{ext}")
        pdf_path = None
        remove_converted_pdf = False
        async with aiofiles.open(tmp_path, "wb") as f:
            await f.write(content)
        try:
            pdf_path, remove_converted_pdf = prepare_pdf_for_gemini(
                file_path=tmp_path,
                filename=file.filename or tmp_path,
                output_dir=settings.UPLOAD_DIR,
            )
            text = extract_text_from_pdf(pdf_path)
        except (UnsupportedGenerationFileType, TextExtractionError) as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
        except PresentationConversionError as e:
            raise HTTPException(status_code=500, detail=str(e)) from e
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            if remove_converted_pdf and pdf_path and os.path.exists(pdf_path):
                os.remove(pdf_path)

    try:
        summary = await ai_service.summarize_document_text(text)
    except ai_service.AIServiceError as e:
        raise HTTPException(status_code=502, detail=f"Summarization failed: {e}") from e

    return {"summary": summary}


@router.get("/session/{code}")
def check_session(code: str, db: Session = Depends(get_db)):
    session = db.query(QuizSession).filter(QuizSession.code == code.upper()).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status == "finished":
        raise HTTPException(status_code=400, detail="Session has ended")
    return {
        "id": session.id,
        "code": session.code,
        "status": session.status,
        "quiz_title": session.quiz.title,
        "participant_count": len(session.participants),
        "attendance_enabled": session.quiz.attendance_enabled,
    }


def _looks_like_email(value: str) -> bool:
    value = value.strip()
    return "@" in value and "." in value.split("@")[-1] and len(value) >= 5


@router.post("/session/{code}/join", response_model=JoinSessionResponse)
def join_session(code: str, data: JoinSessionRequest, db: Session = Depends(get_db)):
    session = db.query(QuizSession).filter(QuizSession.code == code.upper()).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status == "finished":
        raise HTTPException(status_code=400, detail="Session has ended")

    email = (data.email or "").strip() or None

    # When attendance is on, a valid email is required for the roster
    if session.quiz.attendance_enabled:
        if not email:
            raise HTTPException(status_code=400, detail="Email is required for this quiz")
        if not _looks_like_email(email):
            raise HTTPException(status_code=400, detail="Please enter a valid email address")

    existing = db.query(Participant).filter(
        Participant.session_id == session.id,
        Participant.name == data.name,
    ).first()
    if existing:
        # Keep the roster email fresh if they re-join
        if email and not existing.email:
            existing.email = email
            db.commit()
        return JoinSessionResponse(
            participant_id=existing.id,
            session_id=session.id,
            session_code=session.code,
            quiz_title=session.quiz.title,
            status=session.status,
        )

    participant = Participant(session_id=session.id, name=data.name, email=email)
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return JoinSessionResponse(
        participant_id=participant.id,
        session_id=session.id,
        session_code=session.code,
        quiz_title=session.quiz.title,
        status=session.status,
    )
