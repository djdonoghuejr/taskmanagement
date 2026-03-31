from datetime import date


def test_recurring_complete_and_undo(client):
    item = client.post(
        "/api/recurring",
        json={"name": "Habit", "cadence_type": "daily"},
    ).json()

    complete = client.post(f"/api/recurring/{item['id']}/complete")
    assert complete.status_code == 200

    completions = client.get("/api/recurring/completions").json()
    assert any(c["recurring_item_id"] == item["id"] for c in completions)

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
