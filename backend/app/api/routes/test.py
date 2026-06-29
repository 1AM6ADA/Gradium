from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models.quiz import Quiz, Question
from app.models.test_attempt import TestAttempt, TestAnswer
from app.schemas.test import (
    TestInfoOut, TestStartRequest, TestStartResponse, TestQuestionPublic,
    TestSubmitRequest, TestSubmitResponse,
)

router = APIRouter()


def _now() -> datetime:
    # Naive UTC-ish "server clock" time, kept consistent with opens_at/closes_at
    # which arrive from a <input type="datetime-local"> on the frontend (also naive).
    return datetime.utcnow()


def _naive(dt: datetime | None) -> datetime | None:
    if dt is not None and dt.tzinfo is not None:
        return dt.replace(tzinfo=None)
    return dt


def _test_status(quiz: Quiz) -> str:
    now = _now()
    opens_at = _naive(quiz.opens_at)
    closes_at = _naive(quiz.closes_at)
    if opens_at and now < opens_at:
        return "not_open"
    if closes_at and now > closes_at:
        return "closed"
    return "open"


def _get_quiz_or_404(token: str, db: Session) -> Quiz:
    quiz = db.query(Quiz).filter(Quiz.share_token == token, Quiz.mode == "test").first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Test not found")
    return quiz


@router.get("/{token}", response_model=TestInfoOut)
def get_test_info(token: str, db: Session = Depends(get_db)):
    quiz = _get_quiz_or_404(token, db)
    return TestInfoOut(
        quiz_id=quiz.id,
        title=quiz.title,
        description=quiz.description,
        question_count=len(quiz.questions),
        opens_at=quiz.opens_at,
        closes_at=quiz.closes_at,
        status=_test_status(quiz),
    )


@router.post("/{token}/start", response_model=TestStartResponse)
def start_test(token: str, data: TestStartRequest, db: Session = Depends(get_db)):
    quiz = _get_quiz_or_404(token, db)
    status = _test_status(quiz)
    if status == "not_open":
        raise HTTPException(status_code=400, detail="This test is not open yet")
    if status == "closed":
        raise HTTPException(status_code=400, detail="This test has closed")

    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    existing = (
        db.query(TestAttempt)
        .filter(TestAttempt.quiz_id == quiz.id, TestAttempt.name == name)
        .first()
    )
    if existing and existing.submitted_at:
        raise HTTPException(status_code=400, detail="You have already submitted this test")

    attempt = existing or TestAttempt(quiz_id=quiz.id, name=name)
    if not existing:
        db.add(attempt)
        db.commit()
        db.refresh(attempt)

    questions = sorted(quiz.questions, key=lambda q: q.order)
    return TestStartResponse(
        attempt_id=attempt.id,
        quiz_title=quiz.title,
        questions=[
            TestQuestionPublic(
                id=q.id, text=q.text, qtype=q.qtype, options=q.options,
                points=q.points, order=q.order,
            )
            for q in questions
        ],
    )


@router.post("/{token}/submit", response_model=TestSubmitResponse)
def submit_test(token: str, data: TestSubmitRequest, db: Session = Depends(get_db)):
    quiz = _get_quiz_or_404(token, db)
    attempt = db.query(TestAttempt).filter(
        TestAttempt.id == data.attempt_id, TestAttempt.quiz_id == quiz.id
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.submitted_at:
        raise HTTPException(status_code=400, detail="This attempt was already submitted")

    questions_by_id = {q.id: q for q in quiz.questions}

    for ans in data.answers:
        question = questions_by_id.get(ans.question_id)
        if not question:
            continue

        is_correct = None
        points_awarded = None
        graded = False

        if question.grading_mode == "auto":
            if question.qtype == "multiple_choice":
                is_correct = ans.answer_index == question.correct_answer
                points_awarded = question.points if is_correct else 0
                graded = True
            elif question.qtype == "open_ended" and question.expected_answer:
                given = _normalize(ans.answer_text or "")
                expected = _normalize(question.expected_answer)
                is_correct = bool(expected) and (given == expected or expected in given)
                points_awarded = question.points if is_correct else 0
                graded = True
            # open_ended without an expected_answer falls through to manual

        db.add(TestAnswer(
            attempt_id=attempt.id,
            question_id=question.id,
            answer_index=ans.answer_index,
            answer_text=ans.answer_text,
            is_correct=is_correct,
            points_awarded=points_awarded,
            graded=graded,
        ))

    attempt.submitted_at = _now()
    db.commit()
    db.refresh(attempt)

    attempt.max_score = sum(q.points for q in quiz.questions)
    attempt.score = sum(a.points_awarded or 0 for a in attempt.test_answers)
    attempt.fully_graded = all(a.graded for a in attempt.test_answers)
    db.commit()
    db.refresh(attempt)

    return TestSubmitResponse(
        score=attempt.score, max_score=attempt.max_score, fully_graded=attempt.fully_graded,
    )


def _normalize(text: str) -> str:
    return " ".join(text.strip().lower().split())
