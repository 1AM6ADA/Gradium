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
    # "quiz" = live, Kahoot-style session. "test" = async, Google-Forms-style
    # link students complete on their own within an optional time window.
    mode = Column(String, default="quiz", nullable=False)
    # Attendance: require students to enter an email so the teacher can export
    # a roster (name, email, score) as CSV afterward. (quiz mode)
    attendance_enabled = Column(Boolean, default=False, nullable=False)
    # Scoring configuration (teacher-controlled, quiz mode)
    speed_bonus = Column(Boolean, default=True, nullable=False)    # faster correct = more points
    streak_bonus = Column(Boolean, default=False, nullable=False)  # consecutive-correct multiplier
    # Test mode: optional availability window. Either bound may be null
    # (open-ended on that side). Naive server-local datetimes for simplicity.
    opens_at = Column(DateTime(timezone=True), nullable=True)
    closes_at = Column(DateTime(timezone=True), nullable=True)
    # Test mode: public share link token (generated on "Publish")
    share_token = Column(String, unique=True, index=True, nullable=True)
    # Path to the PDF used for AI generation, kept around (not deleted) so a
    # single question can be regenerated later with the same source context.
    source_pdf_path = Column(String, nullable=True)
    # Original uploaded filename (e.g. "lecture3.pptx"), shown alongside each
    # question's slide attribution so the teacher knows which deck it's from.
    source_filename = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    teacher = relationship("User", back_populates="quizzes")
    questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan", order_by="Question.order")
    sessions = relationship("QuizSession", back_populates="quiz", cascade="all, delete-orphan")
    attempts = relationship("TestAttempt", back_populates="quiz", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)  # list of strings ([] for open_ended)
    correct_answer = Column(Integer, nullable=False)  # 0-3 index; -1 = not applicable (open_ended)
    multiple = Column(Boolean, default=False, nullable=False)  # select-all-that-apply (quiz mode)
    correct_answers = Column(JSON, nullable=True)  # list[int] of correct indices when multiple
    time_limit = Column(Integer, default=30)  # seconds; 0 = no time limit (ends on teacher's Next)
    points = Column(Integer, default=1000, nullable=False)  # base points for a correct answer
    order = Column(Integer, default=0)
    # Test mode question type + grading
    qtype = Column(String, default="multiple_choice", nullable=False)  # multiple_choice | open_ended
    grading_mode = Column(String, default="auto", nullable=False)      # auto | manual
    expected_answer = Column(Text, nullable=True)  # auto-grading target text for open_ended
    # Provenance: which slide/page this question was grounded in (AI-set;
    # null for manually-added questions). e.g. "Slide 3".
    source_label = Column(String, nullable=True)

    quiz = relationship("Quiz", back_populates="questions")
    answers = relationship("Answer", back_populates="question", cascade="all, delete-orphan")
    test_answers = relationship("TestAnswer", back_populates="question", cascade="all, delete-orphan")
