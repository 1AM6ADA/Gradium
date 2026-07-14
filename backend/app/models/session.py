from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class QuizSession(Base):
    __tablename__ = "quiz_sessions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    code = Column(String(8), unique=True, index=True, nullable=False)
    status = Column(String, default="waiting")  # waiting, active, finished
    current_question_index = Column(Integer, default=-1)
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    quiz = relationship("Quiz", back_populates="sessions")
    participants = relationship("Participant", back_populates="session", cascade="all, delete-orphan")


class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("quiz_sessions.id"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)  # collected when attendance is enabled
    score = Column(Integer, default=0)
    current_streak = Column(Integer, default=0, nullable=False)  # consecutive correct answers
    # Private per-participant token returned to the joiner's browser. Only a
    # request presenting the matching token may re-claim this name/identity, so
    # a different student can't take over an existing participant by reusing
    # their display name.
    join_token = Column(String, nullable=True)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("QuizSession", back_populates="participants")
    answers = relationship("Answer", back_populates="participant", cascade="all, delete-orphan")


class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    answer = Column(Integer, nullable=False)  # single-answer index (-1 if multiple)
    selected = Column(JSON, nullable=True)  # list[int] of selected indices when multiple
    is_correct = Column(Boolean, default=False)
    time_taken = Column(Float, default=0.0)

    participant = relationship("Participant", back_populates="answers")
    question = relationship("Question", back_populates="answers")
