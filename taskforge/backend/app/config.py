import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+pg8000://taskforge:taskforge@db:5432/taskforge",
)

# Auth / security
SESSION_COOKIE_NAME = os.getenv("SESSION_COOKIE_NAME", "tf_session")
CSRF_COOKIE_NAME = os.getenv("CSRF_COOKIE_NAME", "tf_csrf")
SESSION_TTL_DAYS = int(os.getenv("SESSION_TTL_DAYS", "30"))
MOBILE_ACCESS_TOKEN_TTL_MINUTES = int(os.getenv("MOBILE_ACCESS_TOKEN_TTL_MINUTES", "15"))
MOBILE_REFRESH_TOKEN_TTL_DAYS = int(os.getenv("MOBILE_REFRESH_TOKEN_TTL_DAYS", "30"))
MOBILE_TOKEN_SECRET = os.getenv("MOBILE_TOKEN_SECRET", os.getenv("SECRET_KEY", "dev-mobile-token-secret"))
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() in {"1", "true", "yes"}
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").lower()

# Comma-separated list like: https://example.com,https://app.example.com
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", os.getenv("CORS_ORIGINS", "")).split(",")
    if o.strip()
]
