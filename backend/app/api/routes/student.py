from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.session import QuizSession, Participant
from app.schemas.session import JoinSessionRequest, JoinSessionResponse

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
