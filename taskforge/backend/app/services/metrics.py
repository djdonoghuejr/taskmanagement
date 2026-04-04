from typing import List
from uuid import UUID

from ..schemas.habits import HabitMetrics


def placeholder_metrics(habit_ids: List[UUID]) -> List[HabitMetrics]:
    metrics = []
    for habit_id in habit_ids:
        metrics.append(
            HabitMetrics(
                habit_id=habit_id,
                completion_rate_7d=0.0,
                completion_rate_30d=0.0,
                completion_rate_all_time=0.0,
                current_streak=0,
                longest_streak=0,
                total_completions=0,
            )
        )
    return metrics
