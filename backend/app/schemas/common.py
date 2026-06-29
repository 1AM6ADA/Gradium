from datetime import datetime, timezone
from typing import Annotated

from pydantic import PlainSerializer


def _serialize_utc(dt: datetime) -> str:
    """Always emit an explicit UTC offset.

    SQLite (via SQLAlchemy) always returns naive datetimes on read, even for
    columns declared DateTime(timezone=True) — the values are semantically
    UTC, but Python sees no tzinfo. Without an explicit 'Z'/'+00:00' suffix,
    a browser's `new Date(isoString)` parses a date-time string as *local*
    time instead of UTC, silently shifting it by the viewer's UTC offset
    (this was the source of the "wrong open time shown to students" bug).
    Tagging tzinfo=UTC here — purely at the serialization boundary — fixes
    display everywhere without touching the access-control comparison logic,
    which already treats stored values as naive UTC consistently.
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


UtcDatetime = Annotated[datetime, PlainSerializer(_serialize_utc, return_type=str)]
