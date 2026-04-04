from datetime import date, datetime, timezone

from app.models.enums import CadenceType
from app.models.habits import Habit
from app.services.habits_scheduler import is_due_on


def test_habits_scheduler_monthly_clamp():
    habit = Habit(
        cadence_type=CadenceType.monthly,
        cadence_day_of_month=31,
        is_active=True,
        created_at=datetime.now(tz=timezone.utc),
    )
    assert is_due_on(date(2026, 4, 30), habit) is True


def test_habits_scheduler_custom_interval():
    habit = Habit(
        cadence_type=CadenceType.custom,
        cadence_days=[3],
        is_active=True,
        created_at=datetime(2026, 3, 31, tzinfo=timezone.utc),
    )
    assert is_due_on(date(2026, 4, 3), habit) is True
    assert is_due_on(date(2026, 4, 4), habit) is False
