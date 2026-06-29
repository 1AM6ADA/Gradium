from pydantic import BaseModel, field_validator
from datetime import datetime, timezone
from app.schemas.common import UtcDatetime
from typing import List, Optional


class QuestionCreate(BaseModel):
    text: str
    options: List[str] = []
    correct_answer: int = 0
    multiple: bool = False
    correct_answers: Optional[List[int]] = None
    time_limit: int = 30  # 0 = no time limit
    points: int = 1000
    order: int = 0
    qtype: str = "multiple_choice"  # multiple_choice | open_ended
    grading_mode: str = "auto"      # auto | manual
    expected_answer: Optional[str] = None
    source_label: Optional[str] = None


class QuestionUpdate(BaseModel):
    text: Optional[str] = None
    options: Optional[List[str]] = None
    correct_answer: Optional[int] = None
    multiple: Optional[bool] = None
    correct_answers: Optional[List[int]] = None
    time_limit: Optional[int] = None
    points: Optional[int] = None
    order: Optional[int] = None
    qtype: Optional[str] = None
    grading_mode: Optional[str] = None
    expected_answer: Optional[str] = None
    source_label: Optional[str] = None


class QuestionOut(BaseModel):
    id: int
    text: str
    options: List[str]
    correct_answer: int
    multiple: bool = False
    correct_answers: Optional[List[int]] = None
    time_limit: int
    points: int
    order: int
    qtype: str = "multiple_choice"
    grading_mode: str = "auto"
    expected_answer: Optional[str] = None
    source_label: Optional[str] = None

    class Config:
        from_attributes = True


class QuestionPublic(BaseModel):
    id: int
    text: str
    options: List[str]
    time_limit: int
    order: int

    class Config:
        from_attributes = True


class QuizCreate(BaseModel):
    title: str
    description: str = ""
    mode: str = "quiz"  # quiz | test


class QuizUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    attendance_enabled: Optional[bool] = None
    speed_bonus: Optional[bool] = None
    streak_bonus: Optional[bool] = None
    # Plain datetime (not UtcDatetime) — this is a REQUEST body, not a
    # response model. UtcDatetime's PlainSerializer would otherwise also
    # fire on .model_dump() (Python mode), turning the value into a string
    # right before `setattr(quiz, field, val)` tries to write it to a
    # SQLAlchemy DateTime column.
    opens_at: Optional[datetime] = None
    closes_at: Optional[datetime] = None

    @field_validator("opens_at", "closes_at")
    @classmethod
    def _normalize_to_utc_naive(cls, v: Optional[datetime]) -> Optional[datetime]:
        # SQLite's DateTime column silently discards tzinfo and stores the
        # literal wall-clock numbers — it does NOT convert to UTC. The
        # frontend always sends true UTC ('Z') already, but any other client
        # sending a non-UTC offset would otherwise have its instant silently
        # mislabeled. Normalize here, at the input boundary, to stay
        # consistent with UtcDatetime's output-side normalization.
        if v is not None and v.tzinfo is not None:
            v = v.astimezone(timezone.utc).replace(tzinfo=None)
        return v


class QuizOut(BaseModel):
    id: int
    title: str
    description: str
    teacher_id: int
    mode: str = "quiz"
    attendance_enabled: bool = False
    speed_bonus: bool = True
    streak_bonus: bool = False
    opens_at: Optional[UtcDatetime] = None
    closes_at: Optional[UtcDatetime] = None
    share_token: Optional[str] = None
    source_filename: Optional[str] = None
    created_at: UtcDatetime
    questions: List[QuestionOut] = []

    class Config:
        from_attributes = True


class QuizSummary(BaseModel):
    id: int
    title: str
    description: str
    created_at: UtcDatetime
    question_count: int = 0
    attendance_enabled: bool = False
    mode: str = "quiz"
    share_token: Optional[str] = None

    class Config:
        from_attributes = True


class GenerateQuestionsRequest(BaseModel):
    num_questions: int = 10


class TopicOut(BaseModel):
    topic: str
    source_label: Optional[str] = None


class GenerateFromTopicsRequest(BaseModel):
    topics: List[str]
    num_questions: int = 10
    num_open_ended: int = 0
