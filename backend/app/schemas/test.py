from pydantic import BaseModel
from datetime import datetime
from app.schemas.common import UtcDatetime
from typing import List, Optional


class PublishOut(BaseModel):
    share_token: str
    url_path: str


class TestInfoOut(BaseModel):
    quiz_id: int
    title: str
    description: str
    question_count: int
    opens_at: Optional[UtcDatetime] = None
    closes_at: Optional[UtcDatetime] = None
    status: str  # not_open | open | closed


class TestStartRequest(BaseModel):
    name: str


class TestQuestionPublic(BaseModel):
    id: int
    text: str
    qtype: str
    options: List[str]
    points: int
    order: int

    class Config:
        from_attributes = True


class TestStartResponse(BaseModel):
    attempt_id: int
    quiz_title: str
    questions: List[TestQuestionPublic]


class TestAnswerSubmit(BaseModel):
    question_id: int
    answer_index: Optional[int] = None
    answer_text: Optional[str] = None


class TestSubmitRequest(BaseModel):
    attempt_id: int
    answers: List[TestAnswerSubmit]


class TestSubmitResponse(BaseModel):
    score: int
    max_score: int
    fully_graded: bool


class AttemptSummaryOut(BaseModel):
    id: int
    name: str
    score: int
    max_score: int
    fully_graded: bool
    started_at: UtcDatetime
    submitted_at: Optional[UtcDatetime] = None

    class Config:
        from_attributes = True


class AttemptAnswerDetail(BaseModel):
    question_id: int
    question_text: str
    qtype: str
    options: List[str]
    correct_answer: int
    expected_answer: Optional[str] = None
    points: int
    grading_mode: str
    answer_index: Optional[int] = None
    answer_text: Optional[str] = None
    is_correct: Optional[bool] = None
    points_awarded: Optional[int] = None
    graded: bool = False


class AttemptDetailOut(BaseModel):
    id: int
    name: str
    score: int
    max_score: int
    fully_graded: bool
    started_at: UtcDatetime
    submitted_at: Optional[UtcDatetime] = None
    answers: List[AttemptAnswerDetail]


class GradeEntry(BaseModel):
    question_id: int
    points_awarded: int
    is_correct: bool


class GradeRequest(BaseModel):
    grades: List[GradeEntry]
