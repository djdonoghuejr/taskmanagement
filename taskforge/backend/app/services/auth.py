import base64
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone


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


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def utcnow() -> datetime:
    return datetime.now(tz=timezone.utc)


def expires_in_days(days: int) -> datetime:
    return utcnow() + timedelta(days=days)

