from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # Attendance: require students to enter an email so the teacher can export
    # a roster (name, email, score) as CSV afterward.
    attendance_enabled = Column(Boolean, default=False, nullable=False)
    # Scoring configuration (teacher-controlled)
    speed_bonus = Column(Boolean, default=True, nullable=False)    # faster correct = more points
    streak_bonus = Column(Boolean, default=False, nullable=False)  # consecutive-correct multiplier
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    teacher = relationship("User", back_populates="quizzes")
    questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan", order_by="Question.order")
    sessions = relationship("QuizSession", back_populates="quiz", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)  # list of strings
    correct_answer = Column(Integer, nullable=False)  # 0-3 index (single-answer questions)
    multiple = Column(Boolean, default=False, nullable=False)  # select-all-that-apply
    correct_answers = Column(JSON, nullable=True)  # list[int] of correct indices when multiple
    time_limit = Column(Integer, default=30)  # seconds; 0 = no time limit (ends on teacher's Next)
    points = Column(Integer, default=1000, nullable=False)  # base points for a correct answer
    order = Column(Integer, default=0)

    quiz = relationship("Quiz", back_populates="questions")
    answers = relationship("Answer", back_populates="question", cascade="all, delete-orphan")
