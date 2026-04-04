from datetime import datetime, timezone


def test_calendar_feed(client):
    task = client.post(
        "/api/tasks",
        json={"name": "Feed Task", "due_date": "2026-04-01"},
    ).json()

    habit = client.post(
        "/api/habits",
        json={"name": "Feed Habit", "cadence_type": "daily"},
    ).json()

    event = client.post(
        "/api/events",
        json={
            "title": "Feed Event",
            "start_time": "2026-04-01T10:00:00+00:00",
            "end_time": "2026-04-01T11:00:00+00:00",
        },
    ).json()

    feed = client.get("/api/calendar/feed", params={"start": "2026-04-01", "end": "2026-04-02"}).json()
    types = {item["extendedProps"]["type"] for item in feed}
    assert "task" in types
    assert "habit" in types
    assert "event" in types
