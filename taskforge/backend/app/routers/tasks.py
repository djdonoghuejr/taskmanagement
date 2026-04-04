from datetime import datetime, timezone, date, time, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session
from sqlalchemy.sql import nullslast
from sqlalchemy import text

from ..config import SYSTEM_USER_ID
from ..database import get_db
from ..models.task import Task
from ..models.task_activity import TaskActivity
from ..models.task_dependency import TaskDependency
from ..models.enums import TaskStatus
from ..schemas.task import TaskCreate, TaskRead, TaskUpdate, TaskComplete
from ..schemas.task_activity import TaskActivityRead, TaskActivityCommentCreate
from ..schemas.task_dependency import TaskDependenciesRead, TaskSummary

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

def _create_activity(
    db: Session,
    *,
    task_id: UUID,
    type: str,
    message: Optional[str] = None,
    meta: Optional[dict] = None,
) -> TaskActivity:
    activity = TaskActivity(
        task_id=task_id,
        actor_user_id=SYSTEM_USER_ID,
        type=type,
        message=message,
        meta=meta,
    )
    db.add(activity)
    return activity


def _task_summary(task: Task) -> TaskSummary:
    return TaskSummary(
        id=task.id,
        name=task.name,
        status=task.status,
        due_date=task.due_date,
        project_id=task.project_id,
    )


def _get_blocked_by_ids(db: Session, task_id: UUID) -> set[UUID]:
    rows = (
        db.query(TaskDependency.blocker_task_id)
        .filter(TaskDependency.blocked_task_id == task_id)
        .all()
    )
    return {r[0] for r in rows}


def _get_blocking_ids(db: Session, task_id: UUID) -> set[UUID]:
    rows = (
        db.query(TaskDependency.blocked_task_id)
        .filter(TaskDependency.blocker_task_id == task_id)
        .all()
    )
    return {r[0] for r in rows}


def _validate_dependency_candidates(db: Session, ids: set[UUID]) -> dict[UUID, Task]:
    if not ids:
        return {}
    tasks = (
        db.query(Task)
        .filter(Task.id.in_(list(ids)), Task.user_id == SYSTEM_USER_ID)
        .all()
    )
    found = {t.id: t for t in tasks}
    missing = ids - set(found.keys())
    if missing:
        raise HTTPException(status_code=400, detail="One or more tasks not found")
    completed = [t.id for t in tasks if t.status == TaskStatus.completed]
    if completed:
        raise HTTPException(status_code=400, detail="Cannot depend on completed tasks")
    return found


def _has_path(db: Session, start_id: UUID, target_id: UUID) -> bool:
    # Returns True if there is a path start_id -> ... -> target_id in task_dependencies.
    stmt = text(
        """
        WITH RECURSIVE walk(id) AS (
            SELECT td.blocked_task_id
            FROM task_dependencies td
            WHERE td.blocker_task_id = :start
            UNION
            SELECT td.blocked_task_id
            FROM task_dependencies td
            JOIN walk w ON td.blocker_task_id = w.id
        )
        SELECT 1 FROM walk WHERE id = :target LIMIT 1
        """
    )
    return db.execute(stmt, {"start": str(start_id), "target": str(target_id)}).scalar() is not None


def _ensure_no_cycles_for_new_edges(db: Session, edges: list[tuple[UUID, UUID]]) -> None:
    # edges are (blocker_id, blocked_id)
    for blocker_id, blocked_id in edges:
        if blocker_id == blocked_id:
            raise HTTPException(status_code=400, detail="Task cannot depend on itself")
        # Adding blocker -> blocked is invalid if blocked can already reach blocker.
        if _has_path(db, blocked_id, blocker_id):
            raise HTTPException(status_code=400, detail="Dependency cycle detected")


def _recompute_task_status(db: Session, task: Task) -> bool:
    """Returns True if status changed."""
    if task.status == TaskStatus.completed:
        return False

    blockers = (
        db.query(Task)
        .join(TaskDependency, TaskDependency.blocker_task_id == Task.id)
        .filter(TaskDependency.blocked_task_id == task.id, Task.user_id == SYSTEM_USER_ID)
        .all()
    )
    has_incomplete_blockers = any(b.status != TaskStatus.completed for b in blockers)
    next_status = TaskStatus.blocked if has_incomplete_blockers else TaskStatus.pending
    if task.status != next_status:
        old = task.status
        task.status = next_status
        _create_activity(
            db,
            task_id=task.id,
            type="status_changed",
            meta={"old_status": old.value, "new_status": next_status.value},
        )
        return True
    return False


def _recompute_task_statuses(db: Session, task_ids: set[UUID]) -> None:
    if not task_ids:
        return
    tasks = (
        db.query(Task)
        .filter(Task.id.in_(list(task_ids)), Task.user_id == SYSTEM_USER_ID)
        .all()
    )
    for task in tasks:
        _recompute_task_status(db, task)


def _set_task_dependencies(
    db: Session,
    *,
    task_id: UUID,
    blocked_by_ids: Optional[list[UUID]],
    blocking_ids: Optional[list[UUID]],
    activity_comment: Optional[str],
) -> None:
    current_blocked_by = _get_blocked_by_ids(db, task_id)
    current_blocking = _get_blocking_ids(db, task_id)

    next_blocked_by = current_blocked_by if blocked_by_ids is None else set(blocked_by_ids)
    next_blocking = current_blocking if blocking_ids is None else set(blocking_ids)

    _validate_dependency_candidates(db, next_blocked_by | next_blocking)

    edges_to_add: list[tuple[UUID, UUID]] = []
    edges_to_remove: list[tuple[UUID, UUID]] = []

    # blocked_by: blocker -> this
    for blocker_id in next_blocked_by - current_blocked_by:
        edges_to_add.append((blocker_id, task_id))
    for blocker_id in current_blocked_by - next_blocked_by:
        edges_to_remove.append((blocker_id, task_id))

    # blocking: this -> blocked
    for blocked_id in next_blocking - current_blocking:
        edges_to_add.append((task_id, blocked_id))
    for blocked_id in current_blocking - next_blocking:
        edges_to_remove.append((task_id, blocked_id))

    _ensure_no_cycles_for_new_edges(db, edges_to_add)

    if edges_to_remove:
        for blocker_id, blocked_id in edges_to_remove:
            (
                db.query(TaskDependency)
                .filter(
                    TaskDependency.blocker_task_id == blocker_id,
                    TaskDependency.blocked_task_id == blocked_id,
                )
                .delete(synchronize_session=False)
            )

    if edges_to_add:
        db.add_all(
            [TaskDependency(blocker_task_id=a, blocked_task_id=b) for (a, b) in edges_to_add]
        )

    if edges_to_add or edges_to_remove:
        _create_activity(
            db,
            task_id=task_id,
            type="dependencies_changed",
            message=activity_comment,
            meta={
                "blocked_by_added": [str(x) for x in (next_blocked_by - current_blocked_by)],
                "blocked_by_removed": [str(x) for x in (current_blocked_by - next_blocked_by)],
                "blocking_added": [str(x) for x in (next_blocking - current_blocking)],
                "blocking_removed": [str(x) for x in (current_blocking - next_blocking)],
            },
        )

    affected: set[UUID] = {task_id}
    # tasks that this task blocks can become blocked/unblocked based on this task's completion state.
    affected |= next_blocking | current_blocking
    _recompute_task_statuses(db, affected)


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
    db.flush()
    _create_activity(
        db,
        task_id=task.id,
        type="created",
        meta={
            "due_date": payload.due_date.isoformat() if payload.due_date else None,
            "assigned_to": "You",
        },
    )

    _set_task_dependencies(
        db,
        task_id=task.id,
        blocked_by_ids=payload.blocked_by_ids,
        blocking_ids=payload.blocking_ids,
        activity_comment=None,
    )
    db.commit()
    db.refresh(task)
    return task


@router.get("/search", response_model=List[TaskSummary])
def search_tasks(
    q: str = Query(..., min_length=1),
    scope: str = Query("all", pattern="^(all|project)$"),
    project_id: Optional[UUID] = None,
    exclude_id: Optional[UUID] = None,
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    if scope == "project" and project_id is None:
        raise HTTPException(status_code=400, detail="project_id is required when scope=project")

    query = db.query(Task).filter(Task.user_id == SYSTEM_USER_ID, Task.status != TaskStatus.completed)
    if exclude_id is not None:
        query = query.filter(Task.id != exclude_id)
    if scope == "project":
        query = query.filter(Task.project_id == project_id)
    query = query.filter(Task.name.ilike(f"%{q}%")).order_by(Task.name.asc()).limit(limit)

    return [_task_summary(t) for t in query.all()]


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

    data = payload.model_dump(exclude_unset=True)
    activity_comment = data.pop("activity_comment", None)
    blocked_by_ids = data.pop("blocked_by_ids", None)
    blocking_ids = data.pop("blocking_ids", None)

    old_due_date = task.due_date
    old_status = task.status

    if "due_date" in data:
        task.due_date = data["due_date"]
    if "status" in data:
        # Status is auto-managed except for completed, which is allowed for backfills/tests.
        if data["status"] == TaskStatus.completed:
            task.status = TaskStatus.completed
        # ignore pending/blocked from clients
    for field, value in data.items():
        if field in {"due_date", "status"}:
            continue
        setattr(task, field, value)

    due_date_changed = "due_date" in data and data["due_date"] != old_due_date
    status_changed = "status" in data and task.status != old_status
    deps_provided = blocked_by_ids is not None or blocking_ids is not None

    deps_comment: Optional[str] = None
    if deps_provided and activity_comment and not due_date_changed and not status_changed:
        deps_comment = activity_comment
        activity_comment = None

    change_activities: List[TaskActivity] = []
    if due_date_changed:
        change_activities.append(
            _create_activity(
                db,
                task_id=task.id,
                type="due_date_changed",
                meta={
                    "old_due_date": old_due_date.isoformat() if old_due_date else None,
                    "new_due_date": task.due_date.isoformat() if task.due_date else None,
                },
            )
        )
    if status_changed:
        change_activities.append(
            _create_activity(
                db,
                task_id=task.id,
                type="status_changed",
                meta={
                    "old_status": old_status.value if hasattr(old_status, "value") else str(old_status),
                    "new_status": task.status.value if hasattr(task.status, "value") else str(task.status),
                },
            )
        )
        if task.status == TaskStatus.completed:
            blocked_task_ids = _get_blocking_ids(db, task.id)
            _recompute_task_statuses(db, blocked_task_ids)

    if activity_comment:
        if len(change_activities) == 1:
            change_activities[0].message = activity_comment
        elif len(change_activities) > 1:
            _create_activity(db, task_id=task.id, type="comment", message=activity_comment)
        else:
            _create_activity(db, task_id=task.id, type="comment", message=activity_comment)

    _set_task_dependencies(
        db,
        task_id=task.id,
        blocked_by_ids=blocked_by_ids,
        blocking_ids=blocking_ids,
        activity_comment=deps_comment,
    )

    # Status may change based on blockers; also status may have been set to completed above.
    _recompute_task_status(db, task)

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

    old_status = task.status
    task.status = TaskStatus.completed
    task.completed_at = datetime.now(tz=timezone.utc)
    task.completion_notes = payload.completion_notes
    _create_activity(
        db,
        task_id=task.id,
        type="status_changed",
        message=payload.completion_notes,
        meta={
            "old_status": old_status.value,
            "new_status": TaskStatus.completed.value,
        },
    )
    # tasks that were blocked by this task may become unblocked now
    blocked_task_ids = _get_blocking_ids(db, task.id)
    _recompute_task_statuses(db, blocked_task_ids)
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}/reopen", response_model=TaskRead)
def reopen_task(task_id: UUID, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == SYSTEM_USER_ID).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    old_status = task.status
    task.status = TaskStatus.pending
    task.completed_at = None
    _create_activity(
        db,
        task_id=task.id,
        type="status_changed",
        meta={
            "old_status": old_status.value,
            "new_status": TaskStatus.pending.value,
        },
    )
    # tasks blocked by this task may become blocked again
    blocked_task_ids = _get_blocking_ids(db, task.id)
    _recompute_task_statuses(db, blocked_task_ids)
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
    db.flush()
    _create_activity(
        db,
        task_id=duplicate.id,
        type="created",
        meta={
            "due_date": duplicate.due_date.isoformat() if duplicate.due_date else None,
            "assigned_to": "You",
            "duplicated_from": str(task.id),
        },
    )
    db.commit()
    db.refresh(duplicate)
    return duplicate


@router.delete("/{task_id}")
def delete_task(task_id: UUID, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == SYSTEM_USER_ID).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    blocked_task_ids = _get_blocking_ids(db, task.id)
    db.delete(task)
    db.flush()
    _recompute_task_statuses(db, blocked_task_ids)
    db.commit()
    return {"ok": True}


@router.get("/{task_id}/dependencies", response_model=TaskDependenciesRead)
def task_dependencies(task_id: UUID, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == SYSTEM_USER_ID).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    blocked_by = (
        db.query(Task)
        .join(TaskDependency, TaskDependency.blocker_task_id == Task.id)
        .filter(TaskDependency.blocked_task_id == task_id, Task.user_id == SYSTEM_USER_ID)
        .order_by(Task.name.asc())
        .all()
    )

    blocking = (
        db.query(Task)
        .join(TaskDependency, TaskDependency.blocked_task_id == Task.id)
        .filter(TaskDependency.blocker_task_id == task_id, Task.user_id == SYSTEM_USER_ID)
        .order_by(Task.name.asc())
        .all()
    )

    return TaskDependenciesRead(
        blocked_by=[_task_summary(t) for t in blocked_by],
        blocking=[_task_summary(t) for t in blocking],
    )


@router.get("/{task_id}/activity", response_model=List[TaskActivityRead])
def list_task_activity(task_id: UUID, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == SYSTEM_USER_ID).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return (
        db.query(TaskActivity)
        .filter(TaskActivity.task_id == task_id)
        .order_by(TaskActivity.created_at.asc())
        .all()
    )


@router.post("/{task_id}/activity/comments", response_model=TaskActivityRead)
def add_task_comment(task_id: UUID, payload: TaskActivityCommentCreate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == SYSTEM_USER_ID).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    activity = _create_activity(db, task_id=task_id, type="comment", message=payload.message)
    db.commit()
    db.refresh(activity)
    return activity
