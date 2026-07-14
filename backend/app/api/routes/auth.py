from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from jose import jwt
from datetime import datetime, timedelta
import bcrypt
from app.database import get_db
from app.models.user import User
from app.models.promocode import PromoCode
from app.schemas.user import UserRegister, UserLogin, UserOut, Token, RedeemRequest
from app.api.deps import get_current_user
from app.config import settings
from app.entitlements import is_upgrade

router = APIRouter()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_access_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": str(user_id), "exp": expire}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


@router.post("/register", response_model=Token)
def register(data: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=data.email,
        name=data.name,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return Token(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return Token(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/redeem", response_model=Token)
def redeem(
    data: RedeemRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Redeem a single-use promo code to upgrade the current user's tier.

    Codes are sold out-of-band (via Telegram). A code can only ever raise the
    tier — you can't use it to move sideways or down (free<pro<max), and each
    code works exactly once."""
    code = (data.code or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Enter a promo code")

    # Seeded codes are stored uppercase; the input is uppercased above.
    promo = db.query(PromoCode).filter(PromoCode.code == code).first()
    if not promo:
        raise HTTPException(status_code=400, detail="Invalid promo code")
    if promo.used:
        raise HTTPException(status_code=400, detail="This promo code has already been used")

    if not is_upgrade(current_user.tier, promo.tier):
        # Don't burn the code on a no-op; tell them they're already at/above it.
        raise HTTPException(
            status_code=400,
            detail=f"Your plan is already {current_user.tier.capitalize()} — this {promo.tier.capitalize()} code wouldn't upgrade you.",
        )

    # Grant the tier and consume the code atomically.
    current_user.tier = promo.tier
    current_user.is_premium = True
    promo.used = True
    promo.used_by_user_id = current_user.id
    promo.used_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    return Token(access_token=create_access_token(current_user.id), user=UserOut.model_validate(current_user))
