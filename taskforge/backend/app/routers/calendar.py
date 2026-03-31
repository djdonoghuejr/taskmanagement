from datetime import date, datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..config import SYSTEM_USER_ID
from ..database import get_db
from ..models.task import Task
from ..models.recurring import RecurringItem
from ..models.event import CalendarEvent
from ..services.recurring_scheduler import is_due_on

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


@router.get("/feed")
def calendar_feed(
    start: date = Query(...),
    end: date = Query(...),
    db: Session = Depends(get_db),
):
    events: List[dict] = []

    tasks = (
        db.query(Task)
        .filter(
            Task.user_id == SYSTEM_USER_ID,
            Task.due_date.isnot(None),
            Task.due_date >= start,
            Task.due_date <= end,
        )
        .all()
    )
    for task in tasks:
        events.append(
            {
                "id": f"task-{task.id}",
                "title": task.name,
                "start": task.due_date.isoformat(),
                "allDay": True,
                "color": "#10B981",
                "extendedProps": {"type": "task", "taskId": str(task.id)},
            }
        )

    recurring_items = (
        db.query(RecurringItem)
        .filter(RecurringItem.user_id == SYSTEM_USER_ID, RecurringItem.is_active == True)
        .all()
    )
    cursor = start
    while cursor <= end:
        for item in recurring_items:
            if is_due_on(cursor, item):
                events.append(
                    {
                        "id": f"recurring-{item.id}-{cursor.isoformat()}",
                        "title": item.name,
                        "start": cursor.isoformat(),
                        "allDay": True,
                        "color": "#6366F1",
                        "extendedProps": {"type": "recurring", "recurringItemId": str(item.id)},
                    }
                )
        cursor += timedelta(days=1)

    calendar_events = (
        db.query(CalendarEvent)
        .filter(
            CalendarEvent.user_id == SYSTEM_USER_ID,
            CalendarEvent.start_time <= datetime.combine(end, datetime.min.time(), tzinfo=timezone.utc),
            CalendarEvent.end_time >= datetime.combine(start, datetime.min.time(), tzinfo=timezone.utc),
        )
        .all()
    )
    for ev in calendar_events:
        events.append(
            {
                "id": f"event-{ev.id}",
                "title": ev.title,
                "start": ev.start_time.isoformat(),
                "end": ev.end_time.isoformat(),
                "allDay": ev.all_day,
                "color": ev.color or "#F59E0B",
                "extendedProps": {"type": "event", "eventId": str(ev.id)},
            }
        )

    return events
