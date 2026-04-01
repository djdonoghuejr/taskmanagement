from datetime import datetime, timezone, date, time, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session
from sqlalchemy.sql import nullslast

from ..config import SYSTEM_USER_ID
from ..database import get_db
from ..models.task import Task
from ..models.enums import TaskStatus
from ..schemas.task import TaskCreate, TaskRead, TaskUpdate, TaskComplete

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=List[TaskRead])
def list_tasks(
    status: Optional[TaskStatus] = None,
    project_id: Optional[UUID] = None,
    tag: Optional[str] = None,
    due_before: Optional[date] = Query(None),
    due_after: Optional[date] = Query(None),
    completed_before: Optional[date] = Query(None),
    completed_after: Optional[date] = Query(None),
    order_by: str = Query("due_date", pattern="^(due_date|completed_at|created_at)$"),
    sort: str = Query("asc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    query = db.query(Task).filter(Task.user_id == SYSTEM_USER_ID)
    if status:
        query = query.filter(Task.status == status)
    if project_id:
        query = query.filter(Task.project_id == project_id)
    if tag:
        query = query.filter(Task.tags.any(tag))
    if due_before is not None:
        query = query.filter(Task.due_date <= due_before)
    if due_after is not None:
        query = query.filter(Task.due_date >= due_after)

    if completed_after is not None:
        start_dt = datetime.combine(completed_after, time.min, tzinfo=timezone.utc)
        query = query.filter(Task.completed_at.isnot(None), Task.completed_at >= start_dt)
    if completed_before is not None:
        end_dt = datetime.combine(completed_before, time.max, tzinfo=timezone.utc)
        query = query.filter(Task.completed_at.isnot(None), Task.completed_at <= end_dt)

    is_desc = sort == "desc"
    if order_by == "due_date":
        due_order = desc(Task.due_date) if is_desc else asc(Task.due_date)
        query = query.order_by(Task.due_date.is_(None), nullslast(due_order))
    elif order_by == "completed_at":
        completed_order = desc(Task.completed_at) if is_desc else asc(Task.completed_at)
        query = query.order_by(nullslast(completed_order))
    else:
        created_order = desc(Task.created_at) if is_desc else asc(Task.created_at)
        query = query.order_by(created_order)

    return query.all()


@router.post("", response_model=TaskRead)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    task = Task(
        user_id=SYSTEM_USER_ID,
        name=payload.name,
        description=payload.description,
        project_id=payload.project_id,
        due_date=payload.due_date,
        tags=payload.tags or [],
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskRead)
def get_task(task_id: UUID, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == SYSTEM_USER_ID).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskRead)
def update_task(task_id: UUID, payload: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == SYSTEM_USER_ID).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}/complete", response_model=TaskRead)
def complete_task(
    task_id: UUID, payload: TaskComplete = TaskComplete(), db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == SYSTEM_USER_ID).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = TaskStatus.completed
    task.completed_at = datetime.now(tz=timezone.utc)
    task.completion_notes = payload.completion_notes
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}/reopen", response_model=TaskRead)
def reopen_task(task_id: UUID, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == SYSTEM_USER_ID).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = TaskStatus.pending
    task.completed_at = None
    db.commit()
    db.refresh(task)
    return task


@router.post("/{task_id}/duplicate", response_model=TaskRead)
def duplicate_task(task_id: UUID, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == SYSTEM_USER_ID).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    duplicate = Task(
        user_id=SYSTEM_USER_ID,
        project_id=task.project_id,
        name=task.name,
        description=task.description,
        due_date=task.due_date,
        tags=list(task.tags or []),
        status=TaskStatus.pending,
        completed_at=None,
    )
    db.add(duplicate)
    db.commit()
    db.refresh(duplicate)
    return duplicate


@router.delete("/{task_id}")
def delete_task(task_id: UUID, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == SYSTEM_USER_ID).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"ok": True}
