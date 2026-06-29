from pydantic import BaseModel
from datetime import datetime
from app.schemas.common import UtcDatetime
from typing import List, Optional


class StudentQuizResult(BaseModel):
    quiz_id: int
    quiz_title: str
    participant_id: int
    score: int
    correct: int
    total: int
    session_code: str
    joined_at: UtcDatetime


class StudentTestResult(BaseModel):
    quiz_id: int
    quiz_title: str
    attempt_id: int
    score: int
    max_score: int
    fully_graded: bool
    submitted_at: Optional[UtcDatetime] = None


class StudentProfileOut(BaseModel):
    name: str
    quiz_results: List[StudentQuizResult]
    test_results: List[StudentTestResult]
