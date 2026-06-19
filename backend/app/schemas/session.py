from pydantic import BaseModel
from datetime import datetime
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
    created_at: datetime
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
