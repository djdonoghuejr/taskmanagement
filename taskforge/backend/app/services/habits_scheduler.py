import calendar
from datetime import date

from ..models.enums import CadenceType
from ..models.habits import Habit


def is_due_on(target_date: date, item: Habit) -> bool:
    if not item.is_active:
        return False

    if item.cadence_type == CadenceType.daily:
        return True

    if item.cadence_type == CadenceType.weekly:
        if not item.cadence_days:
            return False
        # cadence_days: 0=Mon, 6=Sun
        return target_date.weekday() in item.cadence_days

    if item.cadence_type == CadenceType.monthly:
        if not item.cadence_day_of_month:
            return False
        last_day = calendar.monthrange(target_date.year, target_date.month)[1]
        day = min(item.cadence_day_of_month, last_day)
        return target_date.day == day

    if item.cadence_type == CadenceType.custom:
        if not item.cadence_days:
            return False
        interval = item.cadence_days[0]
        if interval <= 0:
            return False
        start_date = item.created_at.date()
        delta_days = (target_date - start_date).days
        return delta_days >= 0 and delta_days % interval == 0

    return False
