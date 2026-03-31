from typing import List
from uuid import UUID

from ..schemas.recurring import RecurringMetrics


def placeholder_metrics(recurring_item_ids: List[UUID]) -> List[RecurringMetrics]:
    metrics = []
    for rid in recurring_item_ids:
        metrics.append(
            RecurringMetrics(
                recurring_item_id=rid,
                completion_rate_7d=0.0,
                completion_rate_30d=0.0,
                completion_rate_all_time=0.0,
                current_streak=0,
                longest_streak=0,
                total_completions=0,
            )
        )
    return metrics
