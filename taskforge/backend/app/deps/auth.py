from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..config import SESSION_COOKIE_NAME
from ..database import get_db
from ..models.session import Session as DbSession
from ..models.user import User
from ..services.auth import sha256_hex, utcnow


def _get_session_token(request: Request) -> Optional[str]:
    return request.cookies.get(SESSION_COOKIE_NAME)


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
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
