import os
import secrets
from datetime import timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from ..config import (
    COOKIE_SAMESITE,
    COOKIE_SECURE,
    CSRF_COOKIE_NAME,
    SESSION_COOKIE_NAME,
    SESSION_TTL_DAYS,
)
from ..database import get_db
from ..deps.auth import get_current_user
from ..models.auth_identity import AuthIdentity
from ..models.email_verification_token import EmailVerificationToken
from ..models.session import Session as DbSession
from ..models.user import User
from ..schemas.auth import ChangePasswordRequest, LoginRequest, RegisterRequest, UserMe, VerifyEmailRequest
from ..services.auth import (
    expires_in_days,
    hash_password,
    new_session_token,
    normalize_email,
    sha256_hex,
    utcnow,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _set_cookie(
    response: Response,
    *,
    name: str,
    value: str,
    http_only: bool,
    max_age_seconds: int | None = None,
) -> None:
    response.set_cookie(
        key=name,
        value=value,
        httponly=http_only,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path="/",
        max_age=max_age_seconds,
    )


def _clear_cookie(response: Response, name: str, http_only: bool) -> None:
    response.delete_cookie(
        key=name,
        httponly=http_only,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path="/",
    )


def _user_me(db: Session, user: User) -> UserMe:
    providers: List[str] = [
        r[0]
        for r in db.query(AuthIdentity.provider)
        .filter(AuthIdentity.user_id == user.id)
        .distinct()
        .all()
    ]
    return UserMe(
        id=user.id,
        email=user.email,
        email_verified_at=user.email_verified_at,
        providers=sorted(providers),
    )


@router.get("/csrf")
def get_csrf(response: Response):
    token = secrets.token_urlsafe(24)
    _set_cookie(response, name=CSRF_COOKIE_NAME, value=token, http_only=False, max_age_seconds=60 * 60 * 24 * 7)
    return {"ok": True}


@router.post("/register", response_model=UserMe)
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    email = normalize_email(payload.email)
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email")

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(email=email, email_verified_at=utcnow())
    db.add(user)
    db.flush()

    identity = AuthIdentity(
        user_id=user.id,
        provider="local",
        provider_subject=email,
        password_hash=hash_password(payload.password),
    )
    db.add(identity)

    raw_token = new_session_token()
    session = DbSession(
        user_id=user.id,
        token_hash=sha256_hex(raw_token),
        expires_at=expires_in_days(SESSION_TTL_DAYS),
    )
    db.add(session)
    db.commit()

    _set_cookie(
        response,
        name=SESSION_COOKIE_NAME,
        value=raw_token,
        http_only=True,
        max_age_seconds=int(timedelta(days=SESSION_TTL_DAYS).total_seconds()),
    )
    return _user_me(db, user)


@router.post("/login", response_model=UserMe)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    email = normalize_email(payload.email)
    identity = (
        db.query(AuthIdentity)
        .filter(AuthIdentity.provider == "local", AuthIdentity.provider_subject == email)
        .first()
    )
    if not identity or not identity.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(payload.password, identity.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = db.query(User).filter(User.id == identity.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    raw_token = new_session_token()
    session = DbSession(
        user_id=user.id,
        token_hash=sha256_hex(raw_token),
        expires_at=expires_in_days(SESSION_TTL_DAYS),
    )
    db.add(session)
    db.commit()

    _set_cookie(
        response,
        name=SESSION_COOKIE_NAME,
        value=raw_token,
        http_only=True,
        max_age_seconds=int(timedelta(days=SESSION_TTL_DAYS).total_seconds()),
    )
    return _user_me(db, user)


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # revoke only the current session
    token = request.cookies.get(SESSION_COOKIE_NAME)
    now = utcnow()
    session = None
    if token:
        session = (
            db.query(DbSession)
            .filter(
                DbSession.user_id == user.id,
                DbSession.token_hash == sha256_hex(token),
                DbSession.revoked_at.is_(None),
                DbSession.expires_at > now,
            )
            .first()
        )
    if session:
        session.revoked_at = now
        db.add(session)
        db.commit()

    _clear_cookie(response, SESSION_COOKIE_NAME, http_only=True)
    return {"ok": True}


@router.get("/me", response_model=UserMe)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _user_me(db, user)


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    identity = (
        db.query(AuthIdentity)
        .filter(AuthIdentity.user_id == user.id, AuthIdentity.provider == "local")
        .first()
    )
    if not identity or not identity.password_hash:
        raise HTTPException(status_code=400, detail="Password login is not available for this account")
    if not verify_password(payload.current_password, identity.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    identity.password_hash = hash_password(payload.new_password)
    db.add(identity)
    db.commit()
    return {"ok": True}


@router.post("/request-email-verification")
def request_email_verification(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    raw = secrets.token_urlsafe(32)
    token_hash = sha256_hex(raw)
    token = EmailVerificationToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=utcnow() + timedelta(hours=24),
    )
    db.add(token)
    db.commit()

    if os.getenv("RETURN_EMAIL_VERIFICATION_TOKEN", "true").lower() in {"1", "true", "yes"}:
        return {"ok": True, "token": raw}
    return {"ok": True}


@router.post("/verify-email")
def verify_email(payload: VerifyEmailRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    token_hash = sha256_hex(payload.token)
    row = (
        db.query(EmailVerificationToken)
        .filter(
            EmailVerificationToken.user_id == user.id,
            EmailVerificationToken.token_hash == token_hash,
            EmailVerificationToken.used_at.is_(None),
            EmailVerificationToken.expires_at > utcnow(),
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=400, detail="Invalid token")

    now = utcnow()
    row.used_at = now
    if user.email_verified_at is None:
        user.email_verified_at = now
        db.add(user)
    db.add(row)
    db.commit()
    return {"ok": True}
