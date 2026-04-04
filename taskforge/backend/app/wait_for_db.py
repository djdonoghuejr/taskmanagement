import os
import time
from sqlalchemy import create_engine, text

from .config import DATABASE_URL


def wait_for_db(timeout_seconds: int = 30) -> None:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
    )
    deadline = time.time() + timeout_seconds
    try:
        while time.time() < deadline:
            try:
                with engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                return
            except Exception:
                time.sleep(1)
        raise RuntimeError("Database not ready after waiting")
    finally:
        engine.dispose()


if __name__ == "__main__":
    timeout = int(os.getenv("DB_WAIT_SECONDS", "30"))
    wait_for_db(timeout)
