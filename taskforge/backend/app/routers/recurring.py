from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..config import SYSTEM_USER_ID
from ..database import get_db
from ..models.recurring import RecurringItem, RecurringCompletion
from ..schemas.recurring import (
    RecurringItemCreate,
    RecurringItemRead,
    RecurringItemUpdate,
    RecurringCompletionRead,
    RecurringMetrics,
)
from ..services.metrics import placeholder_metrics

router = APIRouter(prefix="/api/recurring", tags=["recurring"])


@router.get("", response_model=List[RecurringItemRead])
def list_recurring(db: Session = Depends(get_db)):
    return (
        db.query(RecurringItem)
        .filter(RecurringItem.user_id == SYSTEM_USER_ID)
        .order_by(RecurringItem.created_at.asc())
        .all()
    )


@router.post("", response_model=RecurringItemRead)
def create_recurring(payload: RecurringItemCreate, db: Session = Depends(get_db)):
    item = RecurringItem(
        user_id=SYSTEM_USER_ID,
        name=payload.name,
        description=payload.description,
        project_id=payload.project_id,
        cadence_type=payload.cadence_type,
        cadence_days=payload.cadence_days,
        cadence_day_of_month=payload.cadence_day_of_month,
        is_active=payload.is_active,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=RecurringItemRead)
def update_recurring(item_id: UUID, payload: RecurringItemUpdate, db: Session = Depends(get_db)):
    item = (
        db.query(RecurringItem)
        .filter(RecurringItem.id == item_id, RecurringItem.user_id == SYSTEM_USER_ID)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Recurring item not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item


@router.post("/{item_id}/complete", response_model=RecurringCompletionRead)
def complete_recurring(item_id: UUID, db: Session = Depends(get_db)):
    item = (
        db.query(RecurringItem)
        .filter(RecurringItem.id == item_id, RecurringItem.user_id == SYSTEM_USER_ID)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Recurring item not found")

    today = date.today()
    existing = (
        db.query(RecurringCompletion)
        .filter(
            RecurringCompletion.recurring_item_id == item_id,
            RecurringCompletion.completed_date == today,
        )
        .first()
    )
    if existing:
        return existing

    completion = RecurringCompletion(recurring_item_id=item_id, completed_date=today)
    db.add(completion)
    db.commit()
    db.refresh(completion)
    return completion


@router.delete("/{item_id}/complete", response_model=dict)
def undo_completion(
    item_id: UUID,
    date_str: Optional[str] = Query(None, alias="date"),
    db: Session = Depends(get_db),
):
    target_date = date.today() if date_str is None else date.fromisoformat(date_str)

    completion = (
        db.query(RecurringCompletion)
        .filter(
            RecurringCompletion.recurring_item_id == item_id,
            RecurringCompletion.completed_date == target_date,
        )
        .first()
    )
    if completion:
        db.delete(completion)
        db.commit()
    return {"ok": True}


@router.delete("/{item_id}")
def delete_recurring(item_id: UUID, db: Session = Depends(get_db)):
    item = (
        db.query(RecurringItem)
        .filter(RecurringItem.id == item_id, RecurringItem.user_id == SYSTEM_USER_ID)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Recurring item not found")
    db.delete(item)
    db.commit()
    return {"ok": True}


@router.get("/completions", response_model=List[RecurringCompletionRead])
def list_completions(date_str: Optional[str] = Query(None, alias="date"), db: Session = Depends(get_db)):
    target_date = date.today() if date_str is None else date.fromisoformat(date_str)
    return (
        db.query(RecurringCompletion)
        .join(RecurringItem, RecurringCompletion.recurring_item_id == RecurringItem.id)
        .filter(RecurringItem.user_id == SYSTEM_USER_ID, RecurringCompletion.completed_date == target_date)
        .all()
    )


@router.get("/metrics", response_model=List[RecurringMetrics])
def recurring_metrics(db: Session = Depends(get_db)):
    ids = [row.id for row in db.query(RecurringItem.id).filter(RecurringItem.is_active == True).all()]
    return placeholder_metrics(ids)
