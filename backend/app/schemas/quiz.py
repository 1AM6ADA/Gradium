from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


class QuestionCreate(BaseModel):
    text: str
    options: List[str]
    correct_answer: int
    time_limit: int = 30
    order: int = 0


class QuestionUpdate(BaseModel):
    text: Optional[str] = None
    options: Optional[List[str]] = None
    correct_answer: Optional[int] = None
    time_limit: Optional[int] = None
    order: Optional[int] = None


class QuestionOut(BaseModel):
    id: int
    text: str
    options: List[str]
    correct_answer: int
    time_limit: int
    order: int

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


class QuizUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class QuizOut(BaseModel):
    id: int
    title: str
    description: str
    teacher_id: int
    created_at: datetime
    questions: List[QuestionOut] = []

    class Config:
        from_attributes = True


class QuizSummary(BaseModel):
    id: int
    title: str
    description: str
    created_at: datetime
    question_count: int = 0

    class Config:
        from_attributes = True


class GenerateQuestionsRequest(BaseModel):
    num_questions: int = 10
