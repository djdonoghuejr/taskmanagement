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
