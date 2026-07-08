from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from sqlalchemy.orm import Session
from typing import List, Optional
import os, shutil, aiofiles, random, string, secrets, uuid, csv, io

from app.database import get_db
from app.models.user import User
from app.models.quiz import Quiz, Question
from app.models.session import QuizSession, Participant, Answer
from app.models.test_attempt import TestAttempt, TestAnswer
from app.schemas.quiz import (
    QuizCreate, QuizUpdate, QuizOut, QuizSummary,
    QuestionCreate, QuestionUpdate, QuestionOut,
    TopicOut, GenerateFromTopicsRequest,
)
from app.schemas.session import (
    SessionOut, ParticipantSummaryOut, ParticipantDetailOut, ParticipantAnswerDetail,
)
from app.schemas.test import (
    PublishOut, AttemptSummaryOut, AttemptDetailOut, AttemptAnswerDetail, GradeRequest,
)
from app.api.deps import get_current_user, require_premium
from app.services.file_service import (
    PresentationConversionError,
    UnsupportedGenerationFileType,
    prepare_pdf_for_gemini,
)
from app.services.ai_service import (
    AIServiceError,
    generate_questions_from_presentation_pdf,
    generate_test_questions_from_presentation_pdf,
    regenerate_question_from_presentation_pdf,
    extract_topics_from_presentation_pdf,
)
from app.services.pdf_service import generate_quiz_pdf
from app.config import settings

router = APIRouter()


def generate_session_code(length: int = 6) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


def _create_questions(db: Session, quiz: Quiz, questions: List[dict]) -> List[Question]:
    created = []
    for i, q_data in enumerate(questions):
        q = Question(
            quiz_id=quiz.id,
            text=q_data["text"],
            options=q_data["options"],
            correct_answer=q_data["correct_answer"],
            time_limit=q_data.get("time_limit", 30),
            points=q_data.get("points", 1000),
            qtype=q_data.get("qtype", "multiple_choice"),
            grading_mode=q_data.get("grading_mode", "auto"),
            expected_answer=q_data.get("expected_answer"),
            source_label=q_data.get("source_label"),
            order=len(quiz.questions) + i,
        )
        db.add(q)
        created.append(q)
    db.commit()
    return created


@router.get("/", response_model=List[QuizSummary])
def list_quizzes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quizzes = db.query(Quiz).filter(Quiz.teacher_id == current_user.id).order_by(Quiz.created_at.desc()).all()
    result = []
    for q in quizzes:
        result.append(QuizSummary(
            id=q.id, title=q.title, description=q.description,
            created_at=q.created_at, question_count=len(q.questions),
            attendance_enabled=q.attendance_enabled, mode=q.mode, share_token=q.share_token,
        ))
    return result


@router.post("/", response_model=QuizOut)
def create_quiz(data: QuizCreate, db: Session = Depends(get_db), current_user: User = Depends(require_premium)):
    mode = data.mode if data.mode in ("quiz", "test") else "quiz"
    quiz = Quiz(title=data.title, description=data.description, teacher_id=current_user.id, mode=mode)
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    return quiz


@router.get("/{quiz_id}", response_model=QuizOut)
def get_quiz(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.teacher_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz


@router.put("/{quiz_id}", response_model=QuizOut)
def update_quiz(quiz_id: int, data: QuizUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.teacher_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(quiz, field, val)
    db.commit()
    db.refresh(quiz)
    return quiz


@router.delete("/{quiz_id}")
def delete_quiz(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.teacher_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if quiz.source_pdf_path and os.path.exists(quiz.source_pdf_path):
        os.remove(quiz.source_pdf_path)
    db.delete(quiz)
    db.commit()
    return {"ok": True}


@router.post("/{quiz_id}/questions", response_model=QuestionOut)
def add_question(quiz_id: int, data: QuestionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.teacher_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    q = Question(quiz_id=quiz_id, **data.model_dump())
    db.add(q)
    db.commit()
    db.refresh(q)
    return q


@router.put("/{quiz_id}/questions/{q_id}", response_model=QuestionOut)
def update_question(quiz_id: int, q_id: int, data: QuestionUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.teacher_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    q = db.query(Question).filter(Question.id == q_id, Question.quiz_id == quiz_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    for field, val in data.model_dump(exclude_none=True).items():
        setattr(q, field, val)
    db.commit()
    db.refresh(q)
    return q


@router.delete("/{quiz_id}/questions/{q_id}")
def delete_question(quiz_id: int, q_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.teacher_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    q = db.query(Question).filter(Question.id == q_id, Question.quiz_id == quiz_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(q)
    db.commit()
    return {"ok": True}


async def _ingest_source_file(quiz: Quiz, file: UploadFile) -> str:
    """Save an uploaded slide deck, convert it to PDF, and persist it as this
    quiz's permanent source file (overwriting any previous one) so later
    steps — regenerate, topic extraction, topic-scoped generation — can all
    reuse the same slide context. Returns the persistent PDF path."""
    original_ext = os.path.splitext(file.filename or "")[1].lower()
    if original_ext not in {".pdf", ".pptx", ".ppt", ".odp"}:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, PPTX/PPT and ODP files are supported for AI generation",
        )

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    safe_filename = f"{uuid.uuid4().hex}{original_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
    pdf_path = None
    remove_converted_pdf = False

    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    try:
        pdf_path, remove_converted_pdf = prepare_pdf_for_gemini(
            file_path=file_path,
            filename=file.filename or safe_filename,
            output_dir=settings.UPLOAD_DIR,
        )
        persistent_path = os.path.join(settings.UPLOAD_DIR, f"quiz_{quiz.id}_source.pdf")
        shutil.copyfile(pdf_path, persistent_path)
        quiz.source_pdf_path = persistent_path
        quiz.source_filename = file.filename or safe_filename
        return persistent_path
    except UnsupportedGenerationFileType as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except PresentationConversionError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)
        if remove_converted_pdf and pdf_path and os.path.exists(pdf_path):
            os.remove(pdf_path)


@router.post("/{quiz_id}/generate")
async def generate_from_slides(
    quiz_id: int,
    file: UploadFile = File(...),
    num_questions: int = Form(10),
    num_open_ended: int = Form(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_premium),
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.teacher_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    persistent_path = await _ingest_source_file(quiz, file)
    # Don't let the model duplicate questions the quiz already has.
    avoid_texts = [q.text for q in quiz.questions]

    try:
        if quiz.mode == "test":
            questions = await generate_test_questions_from_presentation_pdf(
                persistent_path, num_questions, num_open_ended, avoid_texts=avoid_texts
            )
        else:
            questions = await generate_questions_from_presentation_pdf(
                persistent_path, num_questions, avoid_texts=avoid_texts
            )
    except AIServiceError as e:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {e}") from e

    if not questions:
        raise HTTPException(status_code=502, detail="AI generated no valid questions")

    created = _create_questions(db, quiz, questions)
    return {
        "generated": len(created),
        "requested": num_questions,
        "questions": [QuestionOut.model_validate(q) for q in created],
    }


@router.post("/{quiz_id}/extract-topics", response_model=List[TopicOut])
async def extract_topics(
    quiz_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_premium),
):
    """Experimental: list the topics covered in an uploaded deck WITHOUT
    generating any questions yet, so the teacher can pick which ones to
    cover. The deck is persisted as the quiz's source so the follow-up
    /generate-from-topics call can reuse it without re-uploading."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.teacher_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    persistent_path = await _ingest_source_file(quiz, file)
    db.commit()

    try:
        topics = await extract_topics_from_presentation_pdf(persistent_path)
    except AIServiceError as e:
        raise HTTPException(status_code=502, detail=f"Topic extraction failed: {e}") from e

    if not topics:
        raise HTTPException(status_code=502, detail="AI could not identify any topics in this material")
    return topics


@router.post("/{quiz_id}/generate-from-topics")
async def generate_from_topics(
    quiz_id: int,
    data: GenerateFromTopicsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_premium),
):
    """Experimental: generate questions scoped to a teacher-picked subset of
    topics (from /extract-topics), reusing the already-uploaded source PDF."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.teacher_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if not quiz.source_pdf_path or not os.path.exists(quiz.source_pdf_path):
        raise HTTPException(
            status_code=400,
            detail="No source material on file. Upload slides via the topic picker first.",
        )
    topics = [t.strip() for t in data.topics if t.strip()]
    if not topics:
        raise HTTPException(status_code=400, detail="Select at least one topic")
    avoid_texts = [q.text for q in quiz.questions]

    try:
        if quiz.mode == "test":
            questions = await generate_test_questions_from_presentation_pdf(
                quiz.source_pdf_path, data.num_questions, data.num_open_ended,
                topics=topics, avoid_texts=avoid_texts,
            )
        else:
            questions = await generate_questions_from_presentation_pdf(
                quiz.source_pdf_path, data.num_questions, topics=topics, avoid_texts=avoid_texts
            )
    except AIServiceError as e:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {e}") from e

    if not questions:
        raise HTTPException(status_code=502, detail="AI generated no valid questions")

    created = _create_questions(db, quiz, questions)
    return {
        "generated": len(created),
        "requested": data.num_questions,
        "questions": [QuestionOut.model_validate(q) for q in created],
    }


@router.post("/{quiz_id}/questions/{q_id}/regenerate", response_model=QuestionOut)
async def regenerate_question(
    quiz_id: int,
    q_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_premium),
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.teacher_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    q = db.query(Question).filter(Question.id == q_id, Question.quiz_id == quiz_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    if not quiz.source_pdf_path or not os.path.exists(quiz.source_pdf_path):
        raise HTTPException(
            status_code=400,
            detail="No source material available to regenerate from. Re-upload your slides.",
        )

    avoid_texts = [other.text for other in quiz.questions if other.id != q_id]

    try:
        replacement = await regenerate_question_from_presentation_pdf(
            pdf_path=quiz.source_pdf_path,
            qtype=q.qtype,
            existing_text=q.text,
            avoid_texts=avoid_texts,
        )
    except AIServiceError as e:
        raise HTTPException(status_code=502, detail=f"AI regeneration failed: {e}") from e

    q.text = replacement["text"]
    q.options = replacement["options"]
    q.correct_answer = replacement["correct_answer"]
    q.points = replacement.get("points", q.points)
    q.source_label = replacement.get("source_label")
    if q.qtype == "open_ended":
        # Keep the auto-grading reference in sync with the new question text,
        # otherwise the LLM would grade answers against the old question's
        # expected answer.
        q.expected_answer = replacement.get("expected_answer")
    if "grading_mode" in replacement and q.grading_mode == "auto":
        # Don't silently force manual->auto, but keep auto in sync with the new content
        q.grading_mode = replacement["grading_mode"]
    db.commit()
    db.refresh(q)
    return q


@router.post("/{quiz_id}/session", response_model=SessionOut)
def start_session(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_premium)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.teacher_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if not quiz.questions:
        raise HTTPException(status_code=400, detail="Quiz has no questions")

    # Close any active sessions
    active = db.query(QuizSession).filter(QuizSession.quiz_id == quiz_id, QuizSession.status != "finished").first()
    if active:
        active.status = "finished"
        db.commit()

    for _ in range(10):
        code = generate_session_code()
        if not db.query(QuizSession).filter(QuizSession.code == code).first():
            break

    session = QuizSession(quiz_id=quiz_id, code=code, status="waiting")
    db.add(session)
    db.commit()
    db.refresh(session)
    return SessionOut(
        id=session.id, quiz_id=session.quiz_id, code=session.code,
        status=session.status, current_question_index=session.current_question_index,
        created_at=session.created_at, quiz_title=quiz.title, participant_count=0
    )


@router.get("/{quiz_id}/attendance.csv")
def download_attendance(
    quiz_id: int,
    code: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export the roster of a session as CSV. Defaults to the most recent
    session for this quiz; pass ?code=XXXX to pick a specific one."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.teacher_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    query = db.query(QuizSession).filter(QuizSession.quiz_id == quiz_id)
    if code:
        query = query.filter(QuizSession.code == code.upper())
    session = query.order_by(QuizSession.created_at.desc()).first()
    if not session:
        raise HTTPException(status_code=404, detail="No session found")

    total_questions = len(quiz.questions)
    participants = sorted(session.participants, key=lambda p: p.score, reverse=True)

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Rank", "Name", "Email", "Score", "Correct", "Total", "Joined At"])
    for rank, p in enumerate(participants, start=1):
        correct = sum(1 for a in p.answers if a.is_correct)
        writer.writerow([
            rank,
            p.name,
            p.email or "",
            p.score,
            correct,
            total_questions,
            p.joined_at.isoformat() if p.joined_at else "",
        ])

    filename = f"attendance_{quiz.title[:30].strip().replace(' ', '_')}_{session.code}.csv"
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{quiz_id}/export.pdf")
def export_quiz_pdf(
    quiz_id: int,
    include_answers: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Printable handout of the quiz/test — for teachers who'd rather run it
    on paper. Pass ?include_answers=true for a trailing answer-key page."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.teacher_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if not quiz.questions:
        raise HTTPException(status_code=400, detail="Add at least one question before exporting")

    pdf_bytes = generate_quiz_pdf(quiz, include_answers=include_answers)
    safe_title = "".join(c for c in (quiz.title or "quiz") if c.isalnum() or c in " _-").strip().replace(" ", "_")
    filename = f"{safe_title or 'quiz'}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{quiz_id}/session", response_model=SessionOut)
def get_active_session(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.teacher_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    session = db.query(QuizSession).filter(
        QuizSession.quiz_id == quiz_id, QuizSession.status != "finished"
    ).order_by(QuizSession.created_at.desc()).first()
    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    return SessionOut(
        id=session.id, quiz_id=session.quiz_id, code=session.code,
        status=session.status, current_question_index=session.current_question_index,
        created_at=session.created_at, quiz_title=quiz.title,
        participant_count=len(session.participants)
    )


# ---------------------------------------------------------------------------
# Test mode: publish (generate share link) + teacher-side results & grading
# ---------------------------------------------------------------------------

@router.post("/{quiz_id}/publish", response_model=PublishOut)
def publish_test(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_premium)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.teacher_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if quiz.mode != "test":
        raise HTTPException(status_code=400, detail="Only test-mode quizzes can be published")
    if not quiz.questions:
        raise HTTPException(status_code=400, detail="Test has no questions")

    if not quiz.share_token:
        for _ in range(10):
            token = secrets.token_urlsafe(8)
            if not db.query(Quiz).filter(Quiz.share_token == token).first():
                break
        quiz.share_token = token
        db.commit()
        db.refresh(quiz)

    return PublishOut(share_token=quiz.share_token, url_path=f"/student/test/{quiz.share_token}")


@router.get("/{quiz_id}/attempts", response_model=List[AttemptSummaryOut])
def list_attempts(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.teacher_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    attempts = (
        db.query(TestAttempt)
        .filter(TestAttempt.quiz_id == quiz_id)
        .order_by(TestAttempt.submitted_at.desc().nullslast(), TestAttempt.started_at.desc())
        .all()
    )
    return attempts


@router.get("/{quiz_id}/attempts/{attempt_id}", response_model=AttemptDetailOut)
def get_attempt_detail(quiz_id: int, attempt_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.teacher_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    attempt = db.query(TestAttempt).filter(TestAttempt.id == attempt_id, TestAttempt.quiz_id == quiz_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    by_question = {a.question_id: a for a in attempt.test_answers}
    answers = []
    for q in sorted(quiz.questions, key=lambda x: x.order):
        a = by_question.get(q.id)
        answers.append(AttemptAnswerDetail(
            question_id=q.id,
            question_text=q.text,
            qtype=q.qtype,
            options=q.options,
            correct_answer=q.correct_answer,
            expected_answer=q.expected_answer,
            points=q.points,
            grading_mode=q.grading_mode,
            answer_index=a.answer_index if a else None,
            answer_text=a.answer_text if a else None,
            is_correct=a.is_correct if a else None,
            points_awarded=a.points_awarded if a else None,
            graded=a.graded if a else False,
        ))

    return AttemptDetailOut(
        id=attempt.id, name=attempt.name, score=attempt.score, max_score=attempt.max_score,
        fully_graded=attempt.fully_graded, started_at=attempt.started_at,
        submitted_at=attempt.submitted_at, answers=answers,
    )


@router.post("/{quiz_id}/attempts/{attempt_id}/grade", response_model=AttemptSummaryOut)
def grade_attempt(
    quiz_id: int, attempt_id: int, data: GradeRequest,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.teacher_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    attempt = db.query(TestAttempt).filter(TestAttempt.id == attempt_id, TestAttempt.quiz_id == quiz_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    by_question = {a.question_id: a for a in attempt.test_answers}
    for entry in data.grades:
        a = by_question.get(entry.question_id)
        if not a:
            continue
        a.points_awarded = max(0, entry.points_awarded)
        a.is_correct = entry.is_correct
        a.graded = True

    db.commit()
    db.refresh(attempt)

    # Recompute score + fully_graded from all answers
    attempt.score = sum(a.points_awarded or 0 for a in attempt.test_answers)
    attempt.fully_graded = all(a.graded for a in attempt.test_answers)
    db.commit()
    db.refresh(attempt)
    return attempt


# ---------------------------------------------------------------------------
# Quiz mode: statistics across ALL live sessions of a quiz (not just the
# latest one). This is the "how many students passed / per-student" view.
# ---------------------------------------------------------------------------

@router.get("/{quiz_id}/participants", response_model=List[ParticipantSummaryOut])
def list_participants(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.teacher_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    total_questions = len(quiz.questions)
    participants = (
        db.query(Participant)
        .join(QuizSession, Participant.session_id == QuizSession.id)
        .filter(QuizSession.quiz_id == quiz_id)
        .order_by(Participant.joined_at.desc())
        .all()
    )

    return [
        ParticipantSummaryOut(
            id=p.id, name=p.name, email=p.email, score=p.score,
            correct=sum(1 for a in p.answers if a.is_correct),
            total=total_questions, session_code=p.session.code, joined_at=p.joined_at,
        )
        for p in participants
    ]


@router.get("/{quiz_id}/participants/{participant_id}", response_model=ParticipantDetailOut)
def get_participant_detail(
    quiz_id: int, participant_id: int,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.teacher_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    participant = (
        db.query(Participant)
        .join(QuizSession, Participant.session_id == QuizSession.id)
        .filter(Participant.id == participant_id, QuizSession.quiz_id == quiz_id)
        .first()
    )
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    by_question = {a.question_id: a for a in participant.answers}
    answers = []
    for q in sorted(quiz.questions, key=lambda x: x.order):
        a = by_question.get(q.id)
        if not a:
            continue
        answers.append(ParticipantAnswerDetail(
            question_id=q.id, question_text=q.text, options=q.options,
            correct_answer=q.correct_answer, multiple=q.multiple, correct_answers=q.correct_answers,
            points=q.points, answer=a.answer, selected=a.selected,
            is_correct=a.is_correct, time_taken=a.time_taken,
        ))

    return ParticipantDetailOut(
        id=participant.id, name=participant.name, email=participant.email, score=participant.score,
        session_code=participant.session.code, joined_at=participant.joined_at, answers=answers,
    )
