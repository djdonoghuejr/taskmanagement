import os
import time
from sqlalchemy.engine.url import make_url
import psycopg

from .config import DATABASE_URL


def wait_for_db(timeout_seconds: int = 30) -> None:
    url = make_url(DATABASE_URL)
    dsn = url.set(drivername="postgresql").render_as_string(hide_password=False)
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            with psycopg.connect(dsn) as conn:
                return
        except Exception:
            time.sleep(1)
    raise RuntimeError("Database not ready after waiting")


if __name__ == "__main__":
    timeout = int(os.getenv("DB_WAIT_SECONDS", "30"))
    wait_for_db(timeout)
