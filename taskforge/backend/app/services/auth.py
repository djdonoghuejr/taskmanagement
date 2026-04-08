import base64
import hashlib
import hmac
import json
import os
import secrets
from datetime import datetime, timedelta, timezone

from ..config import MOBILE_TOKEN_SECRET


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def _b64e(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _b64d(data: str) -> bytes:
    padding = "=" * ((4 - (len(data) % 4)) % 4)
    return base64.urlsafe_b64decode((data + padding).encode("ascii"))


def hash_password(password: str) -> str:
    if not isinstance(password, str) or not password:
        raise ValueError("Password required")
    salt = secrets.token_bytes(16)
    n = int(os.getenv("PASSWORD_SCRYPT_N", "16384"))
    r = int(os.getenv("PASSWORD_SCRYPT_R", "8"))
    p = int(os.getenv("PASSWORD_SCRYPT_P", "1"))
    dk = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=n, r=r, p=p, dklen=32)
    return f"scrypt:{n}:{r}:{p}:{_b64e(salt)}:{_b64e(dk)}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algo, n_s, r_s, p_s, salt_b64, dk_b64 = (encoded or "").split(":", 5)
        if algo != "scrypt":
            return False
        n, r, p = int(n_s), int(r_s), int(p_s)
        salt = _b64d(salt_b64)
        expected = _b64d(dk_b64)
        actual = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=n, r=r, p=p, dklen=len(expected))
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def new_session_token() -> str:
    return secrets.token_urlsafe(32)


def new_mobile_refresh_token() -> str:
    return secrets.token_urlsafe(32)


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def utcnow() -> datetime:
    return datetime.now(tz=timezone.utc)


def expires_in_days(days: int) -> datetime:
    return utcnow() + timedelta(days=days)


def expires_in_minutes(minutes: int) -> datetime:
    return utcnow() + timedelta(minutes=minutes)


def _sign_token_payload(payload_b64: str) -> str:
    digest = hmac.new(MOBILE_TOKEN_SECRET.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).digest()
    return _b64e(digest)


def create_mobile_access_token(*, user_id: str, session_id: str, expires_at: datetime) -> str:
    payload = {
        "typ": "mobile_access",
        "sub": user_id,
        "sid": session_id,
        "iat": int(utcnow().timestamp()),
        "exp": int(expires_at.timestamp()),
        "nonce": secrets.token_urlsafe(8),
    }
    payload_b64 = _b64e(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    signature = _sign_token_payload(payload_b64)
    return f"v1.{payload_b64}.{signature}"


def verify_mobile_access_token(token: str) -> dict | None:
    try:
        version, payload_b64, signature = (token or "").split(".", 2)
        if version != "v1":
            return None
        expected = _sign_token_payload(payload_b64)
        if not hmac.compare_digest(signature, expected):
            return None
        payload = json.loads(_b64d(payload_b64).decode("utf-8"))
        if payload.get("typ") != "mobile_access":
            return None
        exp = int(payload["exp"])
        if exp < int(utcnow().timestamp()):
            return None
        return payload
    except Exception:
        return None
