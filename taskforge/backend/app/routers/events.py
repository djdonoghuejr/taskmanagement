from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps.auth import get_current_user
from ..models.event import CalendarEvent
from ..models.user import User
from ..schemas.event import EventCreate, EventRead, EventUpdate
from ..services.time_utils import ensure_utc

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=List[EventRead])
def list_events(
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(CalendarEvent).filter(CalendarEvent.user_id == user.id)
    if start:
        query = query.filter(CalendarEvent.end_time >= start)
    if end:
        query = query.filter(CalendarEvent.start_time <= end)
    return query.order_by(CalendarEvent.start_time.asc()).all()


@router.post("", response_model=EventRead)
def create_event(payload: EventCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    event = CalendarEvent(
        user_id=user.id,
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
def update_event(
    event_id: UUID, payload: EventUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    event = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.id == event_id, CalendarEvent.user_id == user.id)
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
def delete_event(event_id: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    event = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.id == event_id, CalendarEvent.user_id == user.id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(event)
    db.commit()
    return {"ok": True}
