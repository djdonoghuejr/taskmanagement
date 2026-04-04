from __future__ import annotations

from fastapi import HTTPException, Request

from ..config import ALLOWED_ORIGINS, CSRF_COOKIE_NAME


UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def _origin_allowed(origin: str) -> bool:
    if not origin:
        return False
    if not ALLOWED_ORIGINS:
        return True
    return origin in ALLOWED_ORIGINS


def enforce_origin_and_csrf(request: Request) -> None:
    path = request.url.path
    if not path.startswith("/api/"):
        return
    if request.method.upper() not in UNSAFE_METHODS:
        return

    # Origin allowlist (if configured). In dev/test, ALLOWED_ORIGINS may be empty.
    origin = request.headers.get("origin")
    if ALLOWED_ORIGINS:
        if not origin or not _origin_allowed(origin):
            raise HTTPException(status_code=403, detail="Origin not allowed")

    # Double-submit CSRF: require header token to match cookie value.
    csrf_cookie = request.cookies.get(CSRF_COOKIE_NAME)
    csrf_header = request.headers.get("x-csrf-token")
    if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
        raise HTTPException(status_code=403, detail="CSRF check failed")

