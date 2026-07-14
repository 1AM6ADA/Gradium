from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.user import User
from app.models.quiz import Quiz
from app.models.session import QuizSession, Participant, Answer
from app.models.test_attempt import TestAttempt
from app.schemas.student_profile import StudentProfileOut, StudentQuizResult, StudentTestResult
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/students/{name}", response_model=StudentProfileOut)
def get_student_profile(name: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Cross-quiz history for a student name, scoped to quizzes/tests owned
    by the current teacher only. Students have no login, so 'same student'
    is matched by name (case-insensitive) — the only identifier available
    across both live-quiz participants and test attempts."""

    name_norm = name.strip()

    participants = (
        db.query(Participant)
        .join(QuizSession, Participant.session_id == QuizSession.id)
        .join(Quiz, QuizSession.quiz_id == Quiz.id)
        .filter(Quiz.teacher_id == current_user.id, func.lower(Participant.name) == name_norm.lower())
        .order_by(Participant.joined_at.desc())
        .all()
    )

    quiz_results = []
    for p in participants:
        correct = sum(1 for a in p.answers if a.is_correct)
        quiz_results.append(StudentQuizResult(
            quiz_id=p.session.quiz_id,
            quiz_title=p.session.quiz.title,
            participant_id=p.id,
            score=p.score,
            correct=correct,
            total=len(p.session.quiz.questions),
            session_code=p.session.code,
            joined_at=p.joined_at,
        ))

    attempts = (
        db.query(TestAttempt)
        .join(Quiz, TestAttempt.quiz_id == Quiz.id)
        .filter(Quiz.teacher_id == current_user.id, func.lower(TestAttempt.name) == name_norm.lower())
        .order_by(TestAttempt.started_at.desc())
        .all()
    )

    test_results = [
        StudentTestResult(
            quiz_id=a.quiz_id,
            quiz_title=a.quiz.title,
            attempt_id=a.id,
            score=a.score,
            max_score=a.max_score,
            fully_graded=a.fully_graded,
            submitted_at=a.submitted_at,
        )
        for a in attempts
    ]

    return StudentProfileOut(name=name_norm, quiz_results=quiz_results, test_results=test_results)
