from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.database import get_db
from app.entitlements import TIER_ORDER, normalize_tier
from app.models.promocode import PromoCode
from app.models.quiz import Quiz
from app.models.user import User
from app.promocodes import create_codes
from app.schemas.admin import (
    AdminUserOut, GenerateCodesRequest, GenerateCodesResponse,
    PromoCodeOut, PromoStatsOut, SetTierRequest,
)

router = APIRouter()


def _promo_out(p: PromoCode, email_by_id: dict[int, str]) -> PromoCodeOut:
    return PromoCodeOut(
        id=p.id, code=p.code, tier=p.tier, used=p.used,
        used_by_email=email_by_id.get(p.used_by_user_id),
        used_at=p.used_at, created_at=p.created_at,
    )


# ---------------------------------------------------------------------------
# Promo codes
# ---------------------------------------------------------------------------

@router.get("/promocodes", response_model=List[PromoCodeOut])
def list_promocodes(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    codes = db.query(PromoCode).order_by(PromoCode.created_at.desc(), PromoCode.id.desc()).all()
    email_by_id = {u.id: u.email for u in db.query(User.id, User.email).all()}
    return [_promo_out(p, email_by_id) for p in codes]


@router.get("/promocodes/stats", response_model=PromoStatsOut)
def promocode_stats(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    total = db.query(PromoCode).count()
    used = db.query(PromoCode).filter(PromoCode.used.is_(True)).count()
    return PromoStatsOut(total=total, used=used, available=total - used)


@router.post("/promocodes", response_model=GenerateCodesResponse)
def generate_promocodes(
    data: GenerateCodesRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    tier = normalize_tier(data.tier)
    if tier == "free":
        raise HTTPException(status_code=400, detail="Promo codes are only for paid tiers (pro or max)")
    if not 1 <= data.count <= 100:
        raise HTTPException(status_code=400, detail="Count must be between 1 and 100")

    created = create_codes(db, tier, data.count)
    db.commit()
    return GenerateCodesResponse(
        created=[
            PromoCodeOut(id=p.id, code=p.code, tier=p.tier, used=False, created_at=p.created_at)
            for p in created
        ]
    )


@router.delete("/promocodes/{code_id}")
def delete_promocode(code_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    promo = db.query(PromoCode).filter(PromoCode.id == code_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Code not found")
    if promo.used:
        raise HTTPException(status_code=400, detail="Can't delete a code that's already been redeemed")
    db.delete(promo)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Users / subscriptions
# ---------------------------------------------------------------------------

@router.get("/users", response_model=List[AdminUserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    quiz_counts = dict(
        db.query(Quiz.teacher_id, func.count(Quiz.id)).group_by(Quiz.teacher_id).all()
    )
    return [
        AdminUserOut(
            id=u.id, email=u.email, name=u.name, tier=u.tier, is_premium=u.is_premium,
            is_admin=u.is_admin, generation_limit=u.generation_limit,
            generations_remaining=u.generations_remaining,
            quiz_count=quiz_counts.get(u.id, 0), created_at=u.created_at,
        )
        for u in users
    ]


@router.patch("/users/{user_id}/tier", response_model=AdminUserOut)
def set_user_tier(
    user_id: int, data: SetTierRequest,
    db: Session = Depends(get_db), _: User = Depends(require_admin),
):
    """Admin override — set any user's tier directly (up or down). Unlike promo
    redemption, this is not restricted to upgrades."""
    if data.tier not in TIER_ORDER:
        raise HTTPException(status_code=400, detail="Invalid tier")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.tier = data.tier
    user.is_premium = data.tier != "free"
    db.commit()
    db.refresh(user)
    quiz_count = db.query(Quiz).filter(Quiz.teacher_id == user.id).count()
    return AdminUserOut(
        id=user.id, email=user.email, name=user.name, tier=user.tier, is_premium=user.is_premium,
        is_admin=user.is_admin, generation_limit=user.generation_limit,
        generations_remaining=user.generations_remaining, quiz_count=quiz_count,
        created_at=user.created_at,
    )


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="You can't delete your own admin account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"ok": True}
