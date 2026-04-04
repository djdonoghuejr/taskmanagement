import os
import sys
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.config import SYSTEM_USER_ID
from app.database import Base, get_db
from app.main import app


def _build_test_db_url() -> str:
    url = make_url(
        os.getenv(
            "DATABASE_URL",
            "postgresql+pg8000://taskforge:taskforge@localhost:5432/taskforge",
        )
    )
    test_db = os.getenv("TEST_DATABASE_NAME", f"{url.database}_test")
    return url.set(database=test_db).render_as_string(hide_password=False)


def _ensure_test_db(db_url: str) -> None:
    url = make_url(db_url)
    admin_url = url.set(database="postgres")
    admin_engine = create_engine(
        admin_url.render_as_string(hide_password=False),
        isolation_level="AUTOCOMMIT",
        pool_pre_ping=True,
    )
    try:
        with admin_engine.connect() as conn:
            exists = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :name"),
                {"name": url.database},
            ).scalar()
            if not exists:
                db_name = (url.database or "").replace('"', '""')
                conn.execute(text(f'CREATE DATABASE "{db_name}"'))
    finally:
        admin_engine.dispose()


@pytest.fixture(scope="session")
def test_engine():
    db_url = _build_test_db_url()
    _ensure_test_db(db_url)
    engine = create_engine(db_url, pool_pre_ping=True)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    # cleanup enums
    with engine.begin() as conn:
        conn.execute(text("DROP TYPE IF EXISTS taskstatus"))
        conn.execute(text("DROP TYPE IF EXISTS cadencetype"))
    engine.dispose()


@pytest.fixture()
def db_session(test_engine):
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture(autouse=True)
def clean_db(db_session):
    table_names = [table.name for table in Base.metadata.sorted_tables]
    if table_names:
        db_session.execute(text("TRUNCATE " + ", ".join(table_names) + " CASCADE"))
        db_session.commit()
    yield


@pytest.fixture()
def client(db_session):
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def system_user_id() -> UUID:
    return SYSTEM_USER_ID
