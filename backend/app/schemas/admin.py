from typing import List, Optional

from pydantic import BaseModel

from app.schemas.common import UtcDatetime


class GenerateCodesRequest(BaseModel):
    tier: str = "pro"        # "pro" | "max"
    count: int = 10


class PromoCodeOut(BaseModel):
    id: int
    code: str
    tier: str
    used: bool
    used_by_email: Optional[str] = None
    used_at: Optional[UtcDatetime] = None
    created_at: UtcDatetime


class PromoStatsOut(BaseModel):
    total: int
    used: int
    available: int


class GenerateCodesResponse(BaseModel):
    created: List[PromoCodeOut]


class AdminUserOut(BaseModel):
    id: int
    email: str
    name: str
    tier: str
    is_premium: bool
    is_admin: bool
    generation_limit: int
    generations_remaining: int
    quiz_count: int = 0
    created_at: UtcDatetime


class SetTierRequest(BaseModel):
    tier: str  # "free" | "pro" | "max"
