from uuid import UUID

from app.models.mobile_session import MobileSession
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


def test_change_password_updates_local_credentials(client, anon_client):
    change = client.post(
        "/api/auth/change-password",
        json={"current_password": "password123", "new_password": "newpassword456"},
    )
    assert change.status_code == 200
    assert change.json() == {"ok": True}

    logout = client.post("/api/auth/logout")
    assert logout.status_code == 200

    anon_client.get("/api/auth/csrf")
    csrf = anon_client.cookies.get("tf_csrf")
    anon_client.headers.update({"X-CSRF-Token": csrf})

    old_login = anon_client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
    assert old_login.status_code == 401

    new_login = anon_client.post("/api/auth/login", json={"email": "test@example.com", "password": "newpassword456"})
    assert new_login.status_code == 200


def test_mobile_auth_refresh_and_logout(anon_client, db_session):
    register = anon_client.post(
        "/api/auth/mobile/register",
        json={"email": "android@example.com", "password": "password123"},
    )
    assert register.status_code == 200
    payload = register.json()
    user_id = UUID(payload["user"]["id"])

    assert db_session.query(MobileSession).filter(MobileSession.user_id == user_id).count() == 1

    access_token = payload["access_token"]
    refresh_token = payload["refresh_token"]
    anon_client.headers.update({"Authorization": f"Bearer {access_token}"})

    me = anon_client.get("/api/auth/mobile/me")
    assert me.status_code == 200
    tasks = anon_client.get("/api/tasks")
    assert tasks.status_code == 200

    refreshed = anon_client.post("/api/auth/mobile/refresh", json={"refresh_token": refresh_token})
    assert refreshed.status_code == 200
    refreshed_payload = refreshed.json()
    assert refreshed_payload["user"]["id"] == payload["user"]["id"]
    assert refreshed_payload["refresh_token"] == refresh_token
    assert refreshed_payload["access_token"] != access_token

    anon_client.headers.update({"Authorization": f"Bearer {refreshed_payload['access_token']}"})
    logout = anon_client.post("/api/auth/mobile/logout")
    assert logout.status_code == 200

    unauthorized = anon_client.get("/api/auth/mobile/me")
    assert unauthorized.status_code == 401

    expired_refresh = anon_client.post("/api/auth/mobile/refresh", json={"refresh_token": refresh_token})
    assert expired_refresh.status_code == 401
