def test_task_activity_thread(client):
    created = client.post(
        "/api/tasks",
        json={"name": "A", "due_date": "2026-04-01"},
    ).json()

    activity = client.get(f"/api/tasks/{created['id']}/activity").json()
    assert len(activity) >= 1
    assert activity[0]["type"] == "created"

    updated = client.put(
        f"/api/tasks/{created['id']}",
        json={"due_date": "2026-04-02", "activity_comment": "Rescheduled"},
    ).json()
    assert updated["due_date"] == "2026-04-02"

    activity = client.get(f"/api/tasks/{created['id']}/activity").json()
    assert any(a["type"] == "due_date_changed" for a in activity)
    assert any(a["message"] == "Rescheduled" for a in activity if a["type"] == "due_date_changed")

    complete = client.patch(
        f"/api/tasks/{created['id']}/complete",
        json={"completion_notes": "Done"},
    )
    assert complete.status_code == 200

    activity = client.get(f"/api/tasks/{created['id']}/activity").json()
    assert any(a["type"] == "status_changed" for a in activity)
    assert any(a["message"] == "Done" for a in activity if a["type"] == "status_changed")

    comment = client.post(
        f"/api/tasks/{created['id']}/activity/comments",
        json={"message": "Extra context"},
    )
    assert comment.status_code == 200

    activity = client.get(f"/api/tasks/{created['id']}/activity").json()
    assert any(a["type"] == "comment" and a["message"] == "Extra context" for a in activity)

