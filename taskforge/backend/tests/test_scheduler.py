from datetime import date, datetime, timezone

from app.models.enums import CadenceType
from app.models.recurring import RecurringItem
from app.services.recurring_scheduler import is_due_on


def test_recurring_scheduler_monthly_clamp():
    item = RecurringItem(
        cadence_type=CadenceType.monthly,
        cadence_day_of_month=31,
        is_active=True,
        created_at=datetime.now(tz=timezone.utc),
    )
    assert is_due_on(date(2026, 4, 30), item) is True


def test_recurring_scheduler_custom_interval():
    item = RecurringItem(
        cadence_type=CadenceType.custom,
        cadence_days=[3],
        is_active=True,
        created_at=datetime(2026, 3, 31, tzinfo=timezone.utc),
    )
    assert is_due_on(date(2026, 4, 3), item) is True
    assert is_due_on(date(2026, 4, 4), item) is False
