from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..config import SYSTEM_USER_ID
from ..database import get_db
from ..models.habits import Habit, HabitCompletion
from ..schemas.habits import (
    HabitCreate,
    HabitRead,
    HabitUpdate,
    HabitCompletionRead,
    HabitCompletionCreate,
    HabitCompletionUpdate,
    HabitMetrics,
)
from ..services.metrics import placeholder_metrics

router = APIRouter(prefix="/api/habits", tags=["habits"])


@router.get("", response_model=List[HabitRead])
def list_habits(db: Session = Depends(get_db)):
    return (
        db.query(Habit)
        .filter(Habit.user_id == SYSTEM_USER_ID)
        .order_by(Habit.created_at.asc())
        .all()
    )


@router.post("", response_model=HabitRead)
def create_habit(payload: HabitCreate, db: Session = Depends(get_db)):
    habit = Habit(
        user_id=SYSTEM_USER_ID,
        name=payload.name,
        description=payload.description,
        project_id=payload.project_id,
        cadence_type=payload.cadence_type,
        cadence_days=payload.cadence_days,
        cadence_day_of_month=payload.cadence_day_of_month,
        is_active=payload.is_active,
    )
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit


@router.put("/{habit_id}", response_model=HabitRead)
def update_habit(habit_id: UUID, payload: HabitUpdate, db: Session = Depends(get_db)):
    habit = (
        db.query(Habit)
        .filter(Habit.id == habit_id, Habit.user_id == SYSTEM_USER_ID)
        .first()
    )
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(habit, field, value)

    db.commit()
    db.refresh(habit)
    return habit


@router.post("/{habit_id}/complete", response_model=HabitCompletionRead)
def complete_habit(
    habit_id: UUID,
    payload: HabitCompletionCreate = HabitCompletionCreate(),
    db: Session = Depends(get_db),
):
    habit = (
        db.query(Habit)
        .filter(Habit.id == habit_id, Habit.user_id == SYSTEM_USER_ID)
        .first()
    )
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")

    today = date.today()
    existing = (
        db.query(HabitCompletion)
        .filter(
            HabitCompletion.habit_id == habit_id,
            HabitCompletion.completed_date == today,
        )
        .first()
    )
    if existing:
        return existing

    completion = HabitCompletion(
        habit_id=habit_id,
        completed_date=today,
        completion_notes=payload.completion_notes,
    )
    db.add(completion)
    db.commit()
    db.refresh(completion)
    return completion


@router.patch("/{habit_id}/complete", response_model=HabitCompletionRead)
def update_completion(
    habit_id: UUID,
    payload: HabitCompletionUpdate,
    date_str: Optional[str] = Query(None, alias="date"),
    db: Session = Depends(get_db),
):
    target_date = date.today() if date_str is None else date.fromisoformat(date_str)
    completion = (
        db.query(HabitCompletion)
        .join(Habit, HabitCompletion.habit_id == Habit.id)
        .filter(
            HabitCompletion.habit_id == habit_id,
            HabitCompletion.completed_date == target_date,
            Habit.user_id == SYSTEM_USER_ID,
        )
        .first()
    )
    if not completion:
        raise HTTPException(status_code=404, detail="Completion not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(completion, field, value)

    db.commit()
    db.refresh(completion)
    return completion


@router.delete("/{habit_id}/complete", response_model=dict)
def undo_completion(
    habit_id: UUID,
    date_str: Optional[str] = Query(None, alias="date"),
    db: Session = Depends(get_db),
):
    target_date = date.today() if date_str is None else date.fromisoformat(date_str)

    completion = (
        db.query(HabitCompletion)
        .filter(
            HabitCompletion.habit_id == habit_id,
            HabitCompletion.completed_date == target_date,
        )
        .first()
    )
    if completion:
        db.delete(completion)
        db.commit()
    return {"ok": True}


@router.delete("/{habit_id}")
def delete_habit(habit_id: UUID, db: Session = Depends(get_db)):
    habit = (
        db.query(Habit)
        .filter(Habit.id == habit_id, Habit.user_id == SYSTEM_USER_ID)
        .first()
    )
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    db.delete(habit)
    db.commit()
    return {"ok": True}


@router.get("/completions", response_model=List[HabitCompletionRead])
def list_completions(
    date_str: Optional[str] = Query(None, alias="date"),
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    if (start is None) != (end is None):
        raise HTTPException(status_code=400, detail="start and end must be provided together")

    query = (
        db.query(HabitCompletion)
        .join(Habit, HabitCompletion.habit_id == Habit.id)
        .filter(Habit.user_id == SYSTEM_USER_ID)
    )

    if start is not None and end is not None:
        start_date = date.fromisoformat(start)
        end_date = date.fromisoformat(end)
        if end_date < start_date:
            raise HTTPException(status_code=400, detail="end must be on or after start")
        query = query.filter(
            HabitCompletion.completed_date >= start_date,
            HabitCompletion.completed_date <= end_date,
        )
        return query.order_by(HabitCompletion.completed_date.desc()).all()

    target_date = date.today() if date_str is None else date.fromisoformat(date_str)
    return query.filter(HabitCompletion.completed_date == target_date).all()


@router.get("/metrics", response_model=List[HabitMetrics])
def habit_metrics(db: Session = Depends(get_db)):
    ids = [row.id for row in db.query(Habit.id).filter(Habit.is_active == True).all()]
    return placeholder_metrics(ids)
