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
            participant_id=existing.id,
            session_id=session.id,
            session_code=session.code,
            quiz_title=session.quiz.title,
            status=session.status,
        )

    participant = Participant(session_id=session.id, name=data.name)
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
