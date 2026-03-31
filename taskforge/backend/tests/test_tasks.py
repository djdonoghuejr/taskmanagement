from datetime import date


def test_tasks_crud(client):
    resp = client.post("/api/tasks", json={"name": "Task A", "tags": ["one"]})
    assert resp.status_code == 200
    task = resp.json()
    assert task["status"] == "pending"

    list_resp = client.get("/api/tasks")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1

    complete = client.patch(f"/api/tasks/{task['id']}/complete")
    assert complete.status_code == 200
    assert complete.json()["status"] == "completed"

    delete = client.delete(f"/api/tasks/{task['id']}")
    assert delete.status_code == 200


def test_tasks_filters(client):
    client.post("/api/tasks", json={"name": "Task B", "due_date": "2026-01-01"})
    client.post("/api/tasks", json={"name": "Task C", "due_date": "2026-02-01"})

    resp = client.get("/api/tasks", params={"due_before": "2026-01-15"})
    assert len(resp.json()) == 1

    resp = client.get("/api/tasks", params={"due_after": "2026-01-15"})
    assert len(resp.json()) == 1
