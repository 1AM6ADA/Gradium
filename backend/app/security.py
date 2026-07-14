"""In-app abuse / DoS defences.

The backend is exposed directly to the internet (the browser SPA talks to it
over NEXT_PUBLIC_API_URL), so these middlewares are its first line of defence
against brute-force logins, LLM cost-amplification and memory-exhaustion
uploads. They keep all state in-process, which is correct for the single
uvicorn worker this app runs; if you scale to multiple workers/hosts, move the
rate-limit counters to Redis.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock
from typing import Deque, Dict, Tuple

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import settings


# --- client identity ------------------------------------------------------

def client_ip(request: Request) -> str:
    """Best-effort client IP.

    When TRUST_PROXY is off (direct exposure) we use the socket peer, which a
    client cannot forge. Only when the app sits behind a reverse proxy you
    control should X-Forwarded-For be trusted — otherwise anyone could spoof it
    to dodge the rate limiter."""
    if settings.TRUST_PROXY:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# --- request classification ----------------------------------------------

def _rate_bucket(path: str, method: str) -> Tuple[str, int]:
    """Map a request to a (bucket_name, limit) pair. The bucket name namespaces
    the per-IP counter so a burst of cheap GETs can't exhaust the auth budget
    and vice-versa."""
    p = path.rstrip("/")

    # Auth: brute-force / credential-stuffing surface.
    if p in ("/api/auth/login", "/api/auth/register", "/api/auth/redeem"):
        return "auth", settings.RATE_LIMIT_AUTH

    # Expensive LLM calls (unauthenticated summarize + all generation paths).
    if p == "/api/student/summarize":
        return "ai", settings.RATE_LIMIT_AI
    if p.startswith("/api/quiz/") and (
        p.endswith("/generate")
        or p.endswith("/extract-topics")
        or p.endswith("/generate-from-topics")
        or p.endswith("/regenerate")
    ):
        return "ai", settings.RATE_LIMIT_AI

    # Any other multipart upload.
    ctype = ""  # method/ctype checked by caller for uploads; keep GETs cheap.
    if method == "POST" and ("/generate" in p or "upload" in p):
        return "upload", settings.RATE_LIMIT_UPLOAD

    return "general", settings.RATE_LIMIT_GENERAL


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Fixed-window-ish sliding limiter: keeps a timestamp deque per (ip, bucket)
    and rejects once more than `limit` requests fall inside the trailing
    window. O(1) amortised; memory is bounded by active-IP count and pruned
    lazily."""

    def __init__(self, app):
        super().__init__(app)
        self._hits: Dict[Tuple[str, str], Deque[float]] = defaultdict(deque)
        self._lock = Lock()
        self._last_gc = time.monotonic()

    def _gc(self, now: float, window: float) -> None:
        # Drop keys with no recent activity so idle IPs don't accumulate.
        if now - self._last_gc < 300:
            return
        self._last_gc = now
        stale = [k for k, dq in self._hits.items() if not dq or now - dq[-1] > window]
        for k in stale:
            self._hits.pop(k, None)

    async def dispatch(self, request: Request, call_next):
        if not settings.RATE_LIMIT_ENABLED or request.method == "OPTIONS":
            return await call_next(request)

        window = float(settings.RATE_LIMIT_WINDOW_SECONDS)
        bucket, limit = _rate_bucket(request.url.path, request.method)
        key = (client_ip(request), bucket)
        now = time.monotonic()

        with self._lock:
            self._gc(now, window)
            dq = self._hits[key]
            cutoff = now - window
            while dq and dq[0] < cutoff:
                dq.popleft()
            if len(dq) >= limit:
                retry = max(1, int(window - (now - dq[0])))
                return JSONResponse(
                    {"detail": "Too many requests. Please slow down."},
                    status_code=429,
                    headers={"Retry-After": str(retry)},
                )
            dq.append(now)

        return await call_next(request)


class MaxBodySizeMiddleware(BaseHTTPMiddleware):
    """Reject oversized requests up front (413) using the Content-Length header,
    before FastAPI reads the body into memory. Requests without a length that
    exceed the cap mid-stream are additionally guarded by per-endpoint checks."""

    async def dispatch(self, request: Request, call_next):
        cl = request.headers.get("content-length")
        if cl is not None:
            try:
                if int(cl) > settings.MAX_BODY_BYTES:
                    return JSONResponse(
                        {"detail": "Request body too large."},
                        status_code=413,
                    )
            except ValueError:
                return JSONResponse({"detail": "Invalid Content-Length."}, status_code=400)
        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attach conservative security headers to every API response."""

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Cross-Origin-Resource-Policy", "same-site")
        # API returns JSON only; a locked-down CSP costs nothing and blocks any
        # accidental HTML/script from being rendered by a browser.
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'none'; frame-ancestors 'none'",
        )
        # Inert over plain HTTP, but takes effect the moment TLS is added.
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
        )
        return response
