from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.schemas.common import UtcDatetime
from typing import Optional


class UserRegister(BaseModel):
    email: EmailStr
    name: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    is_premium: bool
    created_at: UtcDatetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
