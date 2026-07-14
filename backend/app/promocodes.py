"""Promo-code generation helpers. Codes are minted on demand from the admin
panel (there is no shipped/seeded batch)."""

import secrets

from sqlalchemy.orm import Session

from app.models.promocode import PromoCode

# Unambiguous alphabet — no 0/O/1/I/L so codes are easy to read and type.
_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def _random_block(n: int = 4) -> str:
    return "".join(secrets.choice(_ALPHABET) for _ in range(n))


def _new_code(tier: str) -> str:
    return f"GRDM-{tier.upper()}-{_random_block()}-{_random_block()}"


def create_codes(db: Session, tier: str, count: int) -> list[PromoCode]:
    """Mint `count` unused codes for `tier`, guaranteeing DB-wide uniqueness.
    Caller commits."""
    existing = {c for (c,) in db.query(PromoCode.code).all()}
    created: list[PromoCode] = []
    for _ in range(count):
        code = _new_code(tier)
        while code in existing:
            code = _new_code(tier)
        existing.add(code)
        promo = PromoCode(code=code, tier=tier)
        db.add(promo)
        created.append(promo)
    return created
