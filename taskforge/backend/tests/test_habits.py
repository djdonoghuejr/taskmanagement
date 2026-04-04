from datetime import date

from app.config import SYSTEM_USER_ID
from app.models.enums import CadenceType
from app.models.habits import Habit, HabitCompletion


def test_habits_complete_and_undo(client):
    habit = client.post(
        "/api/habits",
        json={"name": "Habit", "cadence_type": "daily"},
    ).json()

    complete = client.post(
        f"/api/habits/{habit['id']}/complete",
        json={"completion_notes": "Did it"},
    )
    assert complete.status_code == 200
    assert complete.json()["completion_notes"] == "Did it"

    completions = client.get("/api/habits/completions").json()
    assert any(c["habit_id"] == habit["id"] for c in completions)

    update_notes = client.patch(
        f"/api/habits/{habit['id']}/complete",
        params={"date": date.today().isoformat()},
        json={"completion_notes": "Updated"},
    )
    assert update_notes.status_code == 200
    assert update_notes.json()["completion_notes"] == "Updated"

    undo = client.delete(f"/api/habits/{habit['id']}/complete")
    assert undo.status_code == 200

    completions_after = client.get("/api/habits/completions").json()
    assert all(c["habit_id"] != habit["id"] for c in completions_after)


def test_habits_metrics_shape(client):
    habit = client.post(
        "/api/habits",
        json={"name": "Metric", "cadence_type": "daily"},
    ).json()
    metrics = client.get("/api/habits/metrics").json()
    assert any(m["habit_id"] == habit["id"] for m in metrics)


def test_habits_completions_range(client, db_session):
    habit = Habit(
        user_id=SYSTEM_USER_ID,
        name="Range",
        cadence_type=CadenceType.daily,
        is_active=True,
    )
    db_session.add(habit)
    db_session.commit()

    c1 = HabitCompletion(habit_id=habit.id, completed_date=date(2026, 1, 1), completion_notes="a")
    c2 = HabitCompletion(habit_id=habit.id, completed_date=date(2026, 1, 5), completion_notes="b")
    db_session.add_all([c1, c2])
    db_session.commit()

    resp = client.get("/api/habits/completions", params={"start": "2026-01-02", "end": "2026-01-10"})
    data = resp.json()
    assert len(data) == 1
    assert data[0]["completed_date"] == "2026-01-05"
