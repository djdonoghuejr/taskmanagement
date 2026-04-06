from datetime import date


def test_projects_soft_delete(client):
    proj = client.post(
        "/api/projects",
        json={"name": "Alpha", "color": "#111111", "description": "A"},
    ).json()

    task = client.post(
        "/api/tasks",
        json={"name": "Task", "project_id": proj["id"]},
    ).json()

    delete_resp = client.delete(f"/api/projects/{proj['id']}")
    assert delete_resp.status_code == 200

    list_projects = client.get("/api/projects").json()
    assert all(p["id"] != proj["id"] for p in list_projects)

    fetched_task = client.get(f"/api/tasks/{task['id']}").json()
    assert fetched_task["project_id"] is None


def test_tags_soft_delete(client):
    tag = client.post("/api/tags", json={"name": "home", "color": "#ff0000"}).json()
    delete_resp = client.delete(f"/api/tags/{tag['id']}")
    assert delete_resp.status_code == 200

    tags = client.get("/api/tags").json()
    assert all(t["id"] != tag["id"] for t in tags)


def test_cannot_assign_task_to_other_users_project(client, anon_client):
    anon_client.get("/api/auth/csrf")
    csrf = anon_client.cookies.get("tf_csrf")
    anon_client.headers.update({"X-CSRF-Token": csrf})
    anon_client.post("/api/auth/register", json={"email": "other@example.com", "password": "password123"})

    other_project = anon_client.post(
        "/api/projects",
        json={"name": "Other", "color": "#222222", "description": "Other user project"},
    ).json()

    create_resp = client.post(
        "/api/tasks",
        json={"name": "Should fail", "project_id": other_project["id"]},
    )
    assert create_resp.status_code == 400
    assert create_resp.json()["detail"] == "Project not found"
