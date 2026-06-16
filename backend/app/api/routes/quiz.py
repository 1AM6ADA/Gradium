from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
import os, aiofiles, random, string, uuid

from app.database import get_db
from app.models.user import User
from app.models.quiz import Quiz, Question
from app.models.session import QuizSession
from app.schemas.quiz import (
    QuizCreate, QuizUpdate, QuizOut, QuizSummary,
    QuestionCreate, QuestionUpdate, QuestionOut,
)
from app.schemas.session import SessionOut
from app.api.deps import get_current_user, require_premium
from app.services.file_service import (
    PresentationConversionError,
    UnsupportedGenerationFileType,
    prepare_pdf_for_gemini,
)
from app.services.ai_service import AIServiceError, generate_questions_from_presentation_pdf
from app.config import settings

router = APIRouter()


def generate_session_code(length: int = 6) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


@router.get("/", response_model=List[QuizSummary])
def list_quizzes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quizzes = db.query(Quiz).filter(Quiz.teacher_id == current_user.id).order_by(Quiz.created_at.desc()).all()
    result = []
    for q in quizzes:
        result.append(QuizSummary(
            id=q.id, title=q.title, description=q.description,
            created_at=q.created_at, question_count=len(q.questions)
        ))
    return result


@router.post("/", response_model=QuizOut)
def create_quiz(data: QuizCreate, db: Session = Depends(get_db), current_user: User = Depends(require_premium)):
    quiz = Quiz(title=data.title, description=data.description, teacher_id=current_user.id)
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
    if data.title is not None:
        quiz.title = data.title
    if data.description is not None:
        quiz.description = data.description
    db.commit()
    db.refresh(quiz)
    return quiz


@router.delete("/{quiz_id}")
def delete_quiz(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.teacher_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
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


@router.post("/{quiz_id}/generate")
async def generate_from_slides(
    quiz_id: int,
    file: UploadFile = File(...),
    num_questions: int = Form(10),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_premium),
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.teacher_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    original_ext = os.path.splitext(file.filename or "")[1].lower()
    if original_ext not in {".pdf", ".pptx", ".ppt"}:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and PPTX/PPT files are supported for AI generation",
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
        questions = await generate_questions_from_presentation_pdf(pdf_path, num_questions)
    except UnsupportedGenerationFileType as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except PresentationConversionError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    except AIServiceError as e:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {e}") from e
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)
        if remove_converted_pdf and pdf_path and os.path.exists(pdf_path):
            os.remove(pdf_path)

    if not questions:
        raise HTTPException(status_code=502, detail="AI generated no valid questions")

    created = []
    for i, q_data in enumerate(questions):
        q = Question(
            quiz_id=quiz_id,
            text=q_data["text"],
            options=q_data["options"],
            correct_answer=q_data["correct_answer"],
            time_limit=q_data.get("time_limit", 30),
            order=len(quiz.questions) + i,
        )
        db.add(q)
        created.append(q)
    db.commit()
    return {"generated": len(created), "questions": [QuestionOut.model_validate(q) for q in created]}


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
