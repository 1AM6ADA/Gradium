from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class TestAttempt(Base):
    """A single student's run of an async ('test' mode) quiz.

    Unlike the live-quiz Participant/Answer flow (WebSocket, scored as it
    goes), a test attempt is a one-shot form submission: a student opens the
    public link, answers everything, and submits once.
    """

    __tablename__ = "test_attempts"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    name = Column(String, nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    score = Column(Integer, default=0, nullable=False)
    max_score = Column(Integer, default=0, nullable=False)
    # False while any manually-graded answer is still ungraded
    fully_graded = Column(Boolean, default=True, nullable=False)

    quiz = relationship("Quiz", back_populates="attempts")
    test_answers = relationship("TestAnswer", back_populates="attempt", cascade="all, delete-orphan")


class TestAnswer(Base):
    __tablename__ = "test_answers"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("test_attempts.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    answer_index = Column(Integer, nullable=True)   # selected option index (multiple_choice)
    answer_text = Column(Text, nullable=True)        # free-text response (open_ended)
    is_correct = Column(Boolean, nullable=True)      # null until graded
    points_awarded = Column(Integer, nullable=True)  # null until graded
    graded = Column(Boolean, default=False, nullable=False)

    attempt = relationship("TestAttempt", back_populates="test_answers")
    question = relationship("Question", back_populates="test_answers")
