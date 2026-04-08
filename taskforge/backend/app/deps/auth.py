from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..config import SESSION_COOKIE_NAME
from ..database import get_db
from ..models.mobile_session import MobileSession
from ..models.session import Session as DbSession
from ..models.user import User
from ..services.auth import sha256_hex, utcnow, verify_mobile_access_token


def _get_session_token(request: Request) -> Optional[str]:
    return request.cookies.get(SESSION_COOKIE_NAME)


def _get_bearer_token(request: Request) -> Optional[str]:
    authorization = request.headers.get("authorization", "")
    if not authorization.lower().startswith("bearer "):
        return None
    return authorization.split(" ", 1)[1].strip() or None


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    bearer_token = _get_bearer_token(request)
    if bearer_token:
        payload = verify_mobile_access_token(bearer_token)
        if not payload:
            raise HTTPException(status_code=401, detail="Not authenticated")

        now = utcnow()
        session = (
            db.query(MobileSession)
            .filter(
                MobileSession.id == payload.get("sid"),
                MobileSession.user_id == payload.get("sub"),
                MobileSession.revoked_at.is_(None),
                MobileSession.refresh_expires_at > now,
            )
            .first()
        )
        if not session:
            raise HTTPException(status_code=401, detail="Not authenticated")

        user = db.query(User).filter(User.id == session.user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")

        session.last_seen_at = datetime.now(tz=timezone.utc)
        db.add(session)
        return user

    token = _get_session_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token_hash = sha256_hex(token)
    now = utcnow()
    session = (
        db.query(DbSession)
        .filter(
            DbSession.token_hash == token_hash,
            DbSession.revoked_at.is_(None),
            DbSession.expires_at > now,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = db.query(User).filter(User.id == session.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session.last_seen_at = datetime.now(tz=timezone.utc)
    db.add(session)
    return user
