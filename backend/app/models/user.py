from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    # Kept for backward compatibility; derived from `tier` (True when tier != free).
    is_premium = Column(Boolean, default=False)
    # Subscription tier: "free" | "pro" | "max". Gates the daily AI-generation
    # quota only (see app.entitlements).
    tier = Column(String, default="free", nullable=False)
    # Rolling per-day generation counter. `generation_day` is the UTC day (ISO
    # string) the count applies to; a newer day means the quota has reset.
    generations_today = Column(Integer, default=0, nullable=False)
    generation_day = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    quizzes = relationship("Quiz", back_populates="teacher", cascade="all, delete-orphan")

    # Exposed to the API via UserOut (Pydantic from_attributes reads properties).
    @property
    def generation_limit(self) -> int:
        from app.entitlements import daily_limit
        return daily_limit(self.tier)

    @property
    def generations_remaining(self) -> int:
        from app.entitlements import remaining_generations
        return remaining_generations(self)

    @property
    def generation_period(self) -> str:
        # "day" | "week" | "month" — the window the quota resets on.
        from app.entitlements import period_label
        return period_label()

    @property
    def is_admin(self) -> bool:
        from app.config import settings
        return (self.email or "").lower() in settings.admin_emails_list
