from uuid import UUID

from app.models.session import Session


def test_register_requires_csrf(anon_client):
    resp = anon_client.post("/api/auth/register", json={"email": "a@example.com", "password": "password123"})
    assert resp.status_code == 403


def test_register_login_me_logout_multi_session(anon_client, db_session):
    # CSRF bootstrap
    anon_client.get("/api/auth/csrf")
    csrf = anon_client.cookies.get("tf_csrf")
    anon_client.headers.update({"X-CSRF-Token": csrf})

    reg = anon_client.post("/api/auth/register", json={"email": "a@example.com", "password": "password123"})
    assert reg.status_code == 200
    me = anon_client.get("/api/auth/me")
    assert me.status_code == 200
    user_id = UUID(me.json()["id"])

    assert db_session.query(Session).filter(Session.user_id == user_id).count() == 1

    # Second client logs in -> second concurrent session
    from fastapi.testclient import TestClient
    from app.main import app
    from app.database import get_db

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c2:
        c2.get("/api/auth/csrf")
        csrf2 = c2.cookies.get("tf_csrf")
        c2.headers.update({"X-CSRF-Token": csrf2})
        login = c2.post("/api/auth/login", json={"email": "a@example.com", "password": "password123"})
        assert login.status_code == 200
        assert c2.get("/api/auth/me").status_code == 200

        assert db_session.query(Session).filter(Session.user_id == user_id).count() == 2

        # Logout first session: only current session revoked
        out = anon_client.post("/api/auth/logout")
        assert out.status_code == 200
        assert anon_client.get("/api/auth/me").status_code == 401
        assert c2.get("/api/auth/me").status_code == 200

    app.dependency_overrides.clear()
