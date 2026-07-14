from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from app.schemas.common import UtcDatetime
from typing import Optional


class UserRegister(BaseModel):
    email: EmailStr
    # Length bounds double as a cheap guard against junk/oversized inputs and
    # trivially-weak passwords (bcrypt itself truncates beyond 72 bytes).
    name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    is_premium: bool
    tier: str = "free"
    generation_limit: int = 3
    generations_remaining: int = 3
    generation_period: str = "month"
    is_admin: bool = False
    created_at: UtcDatetime

    class Config:
        from_attributes = True


class RedeemRequest(BaseModel):
    # A single-use promo code (bought via Telegram) that upgrades the tier.
    code: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
