def test_dependencies_blocked_status_and_unblock(client):
    a = client.post("/api/tasks", json={"name": "A"}).json()
    b = client.post("/api/tasks", json={"name": "B"}).json()

    blocked = client.post(
        "/api/tasks",
        json={"name": "C", "blocked_by_ids": [a["id"], b["id"]]},
    ).json()
    assert blocked["status"] == "blocked"

    # Completing one blocker should still keep it blocked
    client.patch(f"/api/tasks/{a['id']}/complete", json={})
    c = client.get(f"/api/tasks/{blocked['id']}").json()
    assert c["status"] == "blocked"

    # Completing the other blocker should unblock it
    client.patch(f"/api/tasks/{b['id']}/complete", json={})
    c = client.get(f"/api/tasks/{blocked['id']}").json()
    assert c["status"] == "pending"


def test_dependencies_endpoint_shape(client):
    a = client.post("/api/tasks", json={"name": "A"}).json()
    b = client.post("/api/tasks", json={"name": "B", "blocked_by_ids": [a["id"]]}).json()

    deps = client.get(f"/api/tasks/{b['id']}/dependencies").json()
    assert len(deps["blocked_by"]) == 1
    assert deps["blocked_by"][0]["id"] == a["id"]
    assert deps["blocking"] == []

    deps_a = client.get(f"/api/tasks/{a['id']}/dependencies").json()
    assert deps_a["blocked_by"] == []
    assert len(deps_a["blocking"]) == 1
    assert deps_a["blocking"][0]["id"] == b["id"]


def test_dependency_cycle_prevention(client):
    a = client.post("/api/tasks", json={"name": "A"}).json()
    b = client.post("/api/tasks", json={"name": "B"}).json()

    resp = client.put(f"/api/tasks/{b['id']}", json={"blocked_by_ids": [a["id"]]})
    assert resp.status_code == 200

    cycle = client.put(f"/api/tasks/{a['id']}", json={"blocked_by_ids": [b["id"]]})
    assert cycle.status_code == 400


def test_task_search_excludes_completed(client):
    t1 = client.post("/api/tasks", json={"name": "Alpha"}).json()
    t2 = client.post("/api/tasks", json={"name": "Alpine"}).json()
    client.patch(f"/api/tasks/{t2['id']}/complete", json={})

    res = client.get("/api/tasks/search", params={"q": "Al", "scope": "all"}).json()
    ids = {t["id"] for t in res}
    assert t1["id"] in ids
    assert t2["id"] not in ids


def test_dependencies_activity_logged(client):
    a = client.post("/api/tasks", json={"name": "A"}).json()
    b = client.post("/api/tasks", json={"name": "B"}).json()

    resp = client.put(
        f"/api/tasks/{b['id']}",
        json={"blocked_by_ids": [a["id"]], "activity_comment": "Need A first"},
    )
    assert resp.status_code == 200

    activity = client.get(f"/api/tasks/{b['id']}/activity").json()
    assert any(a["type"] == "dependencies_changed" for a in activity)
    assert any(a["message"] == "Need A first" for a in activity if a["type"] == "dependencies_changed")

