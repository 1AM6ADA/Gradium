from pydantic import BaseModel
from datetime import datetime
from app.schemas.common import UtcDatetime
from typing import List, Optional


class SessionCreate(BaseModel):
    pass


class ParticipantOut(BaseModel):
    id: int
    name: str
    score: int

    class Config:
        from_attributes = True


class LeaderboardEntry(BaseModel):
    rank: int
    name: str
    score: int
    correct: int
    total: int


class SessionOut(BaseModel):
    id: int
    quiz_id: int
    code: str
    status: str
    current_question_index: int
    created_at: UtcDatetime
    quiz_title: str = ""
    participant_count: int = 0

    class Config:
        from_attributes = True


class JoinSessionRequest(BaseModel):
    name: str
    email: Optional[str] = None


class JoinSessionResponse(BaseModel):
    participant_id: int
    session_id: int
    session_code: str
    quiz_title: str
    status: str


class SummarizeRequest(BaseModel):
    pass


# ---------------------------------------------------------------------------
# Quiz-mode statistics (across all live sessions of a quiz)
# ---------------------------------------------------------------------------

class ParticipantSummaryOut(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    score: int
    correct: int
    total: int
    session_code: str
    joined_at: UtcDatetime

    class Config:
        from_attributes = True


class ParticipantAnswerDetail(BaseModel):
    question_id: int
    question_text: str
    options: List[str]
    correct_answer: int
    multiple: bool
    correct_answers: Optional[List[int]] = None
    points: int
    answer: int
    selected: Optional[List[int]] = None
    is_correct: bool
    time_taken: float


class ParticipantDetailOut(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    score: int
    session_code: str
    joined_at: UtcDatetime
    answers: List[ParticipantAnswerDetail]
