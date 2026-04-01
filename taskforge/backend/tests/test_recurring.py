from datetime import date

from app.config import SYSTEM_USER_ID
from app.models.enums import CadenceType
from app.models.recurring import RecurringItem, RecurringCompletion


def test_recurring_complete_and_undo(client):
    item = client.post(
        "/api/recurring",
        json={"name": "Habit", "cadence_type": "daily"},
    ).json()

    complete = client.post(
        f"/api/recurring/{item['id']}/complete",
        json={"completion_notes": "Did it"},
    )
    assert complete.status_code == 200
    assert complete.json()["completion_notes"] == "Did it"

    completions = client.get("/api/recurring/completions").json()
    assert any(c["recurring_item_id"] == item["id"] for c in completions)

    update_notes = client.patch(
        f"/api/recurring/{item['id']}/complete",
        params={"date": date.today().isoformat()},
        json={"completion_notes": "Updated"},
    )
    assert update_notes.status_code == 200
    assert update_notes.json()["completion_notes"] == "Updated"

    undo = client.delete(f"/api/recurring/{item['id']}/complete")
    assert undo.status_code == 200

    completions_after = client.get("/api/recurring/completions").json()
    assert all(c["recurring_item_id"] != item["id"] for c in completions_after)


def test_recurring_metrics_shape(client):
    item = client.post(
        "/api/recurring",
        json={"name": "Metric", "cadence_type": "daily"},
    ).json()
    metrics = client.get("/api/recurring/metrics").json()
    assert any(m["recurring_item_id"] == item["id"] for m in metrics)


def test_recurring_completions_range(client, db_session):
    item = RecurringItem(
        user_id=SYSTEM_USER_ID,
        name="Range",
        cadence_type=CadenceType.daily,
        is_active=True,
    )
    db_session.add(item)
    db_session.commit()

    c1 = RecurringCompletion(recurring_item_id=item.id, completed_date=date(2026, 1, 1), completion_notes="a")
    c2 = RecurringCompletion(recurring_item_id=item.id, completed_date=date(2026, 1, 5), completion_notes="b")
    db_session.add_all([c1, c2])
    db_session.commit()

    resp = client.get("/api/recurring/completions", params={"start": "2026-01-02", "end": "2026-01-10"})
    data = resp.json()
    assert len(data) == 1
    assert data[0]["completed_date"] == "2026-01-05"
