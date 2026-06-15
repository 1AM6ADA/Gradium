from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import os, aiofiles

from app.database import get_db
from app.models.session import QuizSession, Participant
from app.schemas.session import JoinSessionRequest, JoinSessionResponse
from app.services.file_service import extract_text_from_file
from app.services.ai_service import summarize_text
from app.config import settings

router = APIRouter()


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
    }


@router.post("/session/{code}/join", response_model=JoinSessionResponse)
def join_session(code: str, data: JoinSessionRequest, db: Session = Depends(get_db)):
    session = db.query(QuizSession).filter(QuizSession.code == code.upper()).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status == "finished":
        raise HTTPException(status_code=400, detail="Session has ended")

    existing = db.query(Participant).filter(
        Participant.session_id == session.id,
        Participant.name == data.name,
    ).first()
    if existing:
        return JoinSessionResponse(
            participant_id=existing.id, session_id=session.id,
            session_code=session.code, quiz_title=session.quiz.title, status=session.status
        )

    participant = Participant(session_id=session.id, name=data.name)
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return JoinSessionResponse(
        participant_id=participant.id, session_id=session.id,
        session_code=session.code, quiz_title=session.quiz.title, status=session.status
    )


@router.post("/summarize")
async def summarize_pdf(file: UploadFile = File(...)):
    allowed = {".pdf", ".pptx", ".ppt", ".txt", ".docx"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"File type {ext} not supported")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_DIR, f"sum_{file.filename}")
    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    try:
        text = extract_text_from_file(file_path, file.filename)
        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from file")
        summary = await summarize_text(text)
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

    return {"summary": summary}
