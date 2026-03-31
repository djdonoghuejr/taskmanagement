from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..config import SYSTEM_USER_ID
from ..database import get_db
from ..models.event import CalendarEvent
from ..schemas.event import EventCreate, EventRead, EventUpdate
from ..services.time_utils import ensure_utc

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=List[EventRead])
def list_events(
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(CalendarEvent).filter(CalendarEvent.user_id == SYSTEM_USER_ID)
    if start:
        query = query.filter(CalendarEvent.end_time >= start)
    if end:
        query = query.filter(CalendarEvent.start_time <= end)
    return query.order_by(CalendarEvent.start_time.asc()).all()


@router.post("", response_model=EventRead)
def create_event(payload: EventCreate, db: Session = Depends(get_db)):
    event = CalendarEvent(
        user_id=SYSTEM_USER_ID,
        title=payload.title,
        description=payload.description,
        start_time=ensure_utc(payload.start_time),
        end_time=ensure_utc(payload.end_time),
        all_day=payload.all_day,
        color=payload.color,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.put("/{event_id}", response_model=EventRead)
def update_event(event_id: UUID, payload: EventUpdate, db: Session = Depends(get_db)):
    event = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.id == event_id, CalendarEvent.user_id == SYSTEM_USER_ID)
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    data = payload.model_dump(exclude_unset=True)
    if "start_time" in data:
        data["start_time"] = ensure_utc(data["start_time"])
    if "end_time" in data:
        data["end_time"] = ensure_utc(data["end_time"])

    for field, value in data.items():
        setattr(event, field, value)

    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}")
def delete_event(event_id: UUID, db: Session = Depends(get_db)):
    event = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.id == event_id, CalendarEvent.user_id == SYSTEM_USER_ID)
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(event)
    db.commit()
    return {"ok": True}
