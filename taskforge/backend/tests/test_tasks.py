from datetime import date


def test_tasks_crud(client):
    resp = client.post("/api/tasks", json={"name": "Task A", "tags": ["one"]})
    assert resp.status_code == 200
    task = resp.json()
    assert task["status"] == "pending"

    list_resp = client.get("/api/tasks")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1

    complete = client.patch(
        f"/api/tasks/{task['id']}/complete", json={"completion_notes": "Done"}
    )
    assert complete.status_code == 200
    assert complete.json()["status"] == "completed"
    assert complete.json()["completion_notes"] == "Done"

    reopen = client.patch(f"/api/tasks/{task['id']}/reopen")
    assert reopen.status_code == 200
    assert reopen.json()["status"] == "pending"

    delete = client.delete(f"/api/tasks/{task['id']}")
    assert delete.status_code == 200


def test_tasks_filters(client):
    client.post("/api/tasks", json={"name": "Task B", "due_date": "2026-01-01"})
    client.post("/api/tasks", json={"name": "Task C", "due_date": "2026-02-01"})

    resp = client.get("/api/tasks", params={"due_before": "2026-01-15"})
    assert len(resp.json()) == 1

    resp = client.get("/api/tasks", params={"due_after": "2026-01-15"})
    assert len(resp.json()) == 1


def test_tasks_update_and_duplicate(client):
    created = client.post(
        "/api/tasks",
        json={
            "name": "Original",
            "description": "Desc",
            "expected_minutes": 25,
            "due_date": "2026-02-02",
            "tags": ["a", "b"],
        },
    ).json()

    updated = client.put(
        f"/api/tasks/{created['id']}",
        json={"name": "Updated", "description": "New", "expected_minutes": 40},
    ).json()
    assert updated["name"] == "Updated"
    assert updated["description"] == "New"
    assert updated["expected_minutes"] == 40

    duplicated = client.post(f"/api/tasks/{created['id']}/duplicate").json()
    assert duplicated["id"] != created["id"]
    assert duplicated["name"] == updated["name"]
    assert duplicated["description"] == updated["description"]
    assert duplicated["expected_minutes"] == updated["expected_minutes"]
    assert duplicated["due_date"] == created["due_date"]
    assert duplicated["tags"] == created["tags"]
    assert duplicated["status"] == "pending"


def test_tasks_completed_filters_and_ordering(client):
    t1 = client.post("/api/tasks", json={"name": "Done 1"}).json()
    t2 = client.post("/api/tasks", json={"name": "Done 2"}).json()

    client.put(
        f"/api/tasks/{t1['id']}",
        json={"status": "completed", "completed_at": "2026-01-10T12:00:00+00:00"},
    )
    client.put(
        f"/api/tasks/{t2['id']}",
        json={"status": "completed", "completed_at": "2026-02-10T12:00:00+00:00"},
    )

    resp = client.get(
        "/api/tasks",
        params={
            "status": "completed",
            "completed_after": "2026-02-01",
        },
    )
    assert len(resp.json()) == 1

    resp = client.get(
        "/api/tasks",
        params={
            "status": "completed",
            "completed_before": "2026-01-31",
        },
    )
    assert len(resp.json()) == 1

    resp = client.get(
        "/api/tasks",
        params={"status": "completed", "order_by": "completed_at", "sort": "desc"},
    )
    data = resp.json()
    assert data[0]["id"] == t2["id"]


def test_get_something_done_prefers_matching_estimates(client):
    quick = client.post(
        "/api/tasks",
        json={"name": "Quick win", "expected_minutes": 20},
    ).json()
    client.post(
        "/api/tasks",
        json={"name": "Long task", "expected_minutes": 45},
    ).json()
    client.post("/api/tasks", json={"name": "Unestimated task"}).json()

    resp = client.get("/api/tasks/get-something-done", params={"minutes": 20})

    assert resp.status_code == 200
    data = resp.json()
    assert data["selection_mode"] == "estimated"
    assert data["task"]["id"] == quick["id"]
    assert data["task"]["expected_minutes"] == 20


def test_get_something_done_falls_back_when_no_estimates_fit(client):
    client.post(
        "/api/tasks",
        json={"name": "Too long", "expected_minutes": 90},
    ).json()
    fallback = client.post("/api/tasks", json={"name": "Start somewhere"}).json()

    resp = client.get("/api/tasks/get-something-done", params={"minutes": 15})

    assert resp.status_code == 200
    data = resp.json()
    assert data["selection_mode"] == "fallback"
    assert data["task"]["id"] == fallback["id"]
    assert data["message"] == 'Get started on "Start somewhere".'


def test_get_something_done_can_exclude_previous_suggestions(client):
    first = client.post(
        "/api/tasks",
        json={"name": "One", "expected_minutes": 10},
    ).json()
    second = client.post(
        "/api/tasks",
        json={"name": "Two", "expected_minutes": 10},
    ).json()

    resp = client.get(
        "/api/tasks/get-something-done",
        params=[("minutes", "10"), ("exclude_ids", first["id"])],
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["selection_mode"] == "estimated"
    assert data["task"]["id"] == second["id"]
