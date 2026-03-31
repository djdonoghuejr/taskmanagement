from datetime import datetime, timezone


def test_events_crud(client):
    payload = {
        "title": "Meeting",
        "start_time": "2026-03-31T10:00:00+00:00",
        "end_time": "2026-03-31T11:00:00+00:00",
        "all_day": False,
    }
    event = client.post("/api/events", json=payload).json()

    listed = client.get("/api/events", params={"start": "2026-03-30T00:00:00+00:00"}).json()
    assert any(ev["id"] == event["id"] for ev in listed)

    updated = client.put(
        f"/api/events/{event['id']}", json={"title": "Updated"}
    ).json()
    assert updated["title"] == "Updated"

    deleted = client.delete(f"/api/events/{event['id']}")
    assert deleted.status_code == 200
