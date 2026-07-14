"""Subscription tiers and the AI-generation quota.

Tiers ("free" | "pro" | "max") differ ONLY by how many AI quiz/test
generations a teacher may run per period. Creating quizzes, running live
sessions, publishing tests, and adding questions manually are available on
every tier. The counter resets each period (daily/weekly/monthly — see
settings.GENERATION_PERIOD; monthly by default).
"""

from datetime import datetime, timezone

from app.config import settings

TIER_ORDER = ["free", "pro", "max"]

# Human label for the reset period, used in API copy / the UI.
PERIOD_LABEL = {"daily": "day", "weekly": "week", "monthly": "month"}


def daily_limit(tier: str | None) -> int:
    """Generations allowed per period for this tier. (Name kept for callers;
    the window is settings.GENERATION_PERIOD, not necessarily a day.)"""
    return {
        "free": settings.FREE_GENERATIONS,
        "pro": settings.PRO_GENERATIONS,
        "max": settings.MAX_GENERATIONS,
    }.get(normalize_tier(tier), settings.FREE_GENERATIONS)


def normalize_tier(tier: str | None) -> str:
    return tier if tier in TIER_ORDER else "free"


def tier_rank(tier: str | None) -> int:
    """Ordinal rank so tiers can be compared: free < pro < max."""
    return TIER_ORDER.index(normalize_tier(tier))


def is_upgrade(current: str | None, target: str | None) -> bool:
    """True only when `target` is strictly higher than `current` — used to
    forbid downgrades and no-op re-purchases of the same tier."""
    return tier_rank(target) > tier_rank(current)


def period_label() -> str:
    return PERIOD_LABEL.get(settings.GENERATION_PERIOD, "month")


def period_key() -> str:
    """A key identifying the CURRENT reset window (UTC). Usage is bucketed by
    this key; when it changes, the quota has reset."""
    now = datetime.now(timezone.utc)
    p = settings.GENERATION_PERIOD
    if p == "daily":
        return now.strftime("%Y-%m-%d")
    if p == "weekly":
        iso = now.isocalendar()
        return f"{iso[0]}-W{iso[1]:02d}"
    return now.strftime("%Y-%m")  # monthly (default)


def generations_used(user) -> int:
    """How many generations the user has spent in the CURRENT period. Usage
    from a previous period is treated as zero (the quota has since reset)."""
    if getattr(user, "generation_day", None) != period_key():
        return 0
    return getattr(user, "generations_today", 0) or 0


def remaining_generations(user) -> int:
    return max(0, daily_limit(getattr(user, "tier", "free")) - generations_used(user))


def record_generation(user) -> None:
    """Count one successful generation against the current period, rolling the
    counter over if this is the first generation of a new period. The caller is
    responsible for committing the session.

    (The DB columns are named `generation_day` / `generations_today` for
    historical reasons but hold the current period key and its usage count.)"""
    key = period_key()
    if getattr(user, "generation_day", None) != key:
        user.generation_day = key
        user.generations_today = 1
    else:
        user.generations_today = (user.generations_today or 0) + 1
