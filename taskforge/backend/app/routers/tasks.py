from datetime import datetime, timezone, date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..config import SYSTEM_USER_ID
from ..database import get_db
from ..models.task import Task
from ..models.enums import TaskStatus
from ..schemas.task import TaskCreate, TaskRead, TaskUpdate

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=List[TaskRead])
def list_tasks(
    status: Optional[TaskStatus] = None,
    project_id: Optional[UUID] = None,
    tag: Optional[str] = None,
    due_before: Optional[date] = Query(None),
    due_after: Optional[date] = Query(None),
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
    return query.order_by(Task.due_date.is_(None), Task.due_date.asc()).all()


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
def complete_task(task_id: UUID, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == SYSTEM_USER_ID).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = TaskStatus.completed
    task.completed_at = datetime.now(tz=timezone.utc)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}")
def delete_task(task_id: UUID, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == SYSTEM_USER_ID).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"ok": True}
