import ssl

from sqlalchemy import create_engine
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from .config import DATABASE_URL

class Base(DeclarativeBase):
    pass

def sanitize_database_url(url_str: str) -> tuple[str, dict]:
    """
    pg8000 doesn't accept `sslmode=` as a connect kwarg, but many hosted providers
    (e.g. Neon) include it in Postgres URLs. Strip it from the URL and translate
    to pg8000's `ssl_context`.
    """
    url = make_url(url_str)
    query = dict(url.query)

    connect_args: dict = {}
    sslmode = query.pop("sslmode", None)
    ssl_flag = query.pop("ssl", None)

    wants_ssl = False
    if isinstance(sslmode, str) and sslmode.lower() in {"require", "verify-ca", "verify-full"}:
        wants_ssl = True
    if isinstance(ssl_flag, str) and ssl_flag.lower() in {"1", "true", "yes"}:
        wants_ssl = True

    if wants_ssl:
        connect_args["ssl_context"] = ssl.create_default_context()

    clean_url = url.set(query=query).render_as_string(hide_password=False)
    return clean_url, connect_args


def get_database_url_and_connect_args() -> tuple[str, dict]:
    return sanitize_database_url(DATABASE_URL)


_db_url, _connect_args = get_database_url_and_connect_args()
engine = create_engine(_db_url, pool_pre_ping=True, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
