from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..config import SYSTEM_USER_ID
from ..database import get_db
from ..models.project import Project
from ..models.task import Task
from ..models.habits import Habit
from ..schemas.project import ProjectCreate, ProjectRead, ProjectUpdate

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=List[ProjectRead])
def list_projects(db: Session = Depends(get_db)):
    return (
        db.query(Project)
        .filter(Project.user_id == SYSTEM_USER_ID, Project.is_archived == False)
        .order_by(Project.created_at.asc())
        .all()
    )


@router.post("", response_model=ProjectRead)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(
        user_id=SYSTEM_USER_ID,
        name=payload.name,
        color=payload.color,
        description=payload.description,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.put("/{project_id}", response_model=ProjectRead)
def update_project(project_id: UUID, payload: ProjectUpdate, db: Session = Depends(get_db)):
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == SYSTEM_USER_ID)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}")
def delete_project(project_id: UUID, db: Session = Depends(get_db)):
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == SYSTEM_USER_ID)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db.query(Task).filter(Task.project_id == project_id).update({"project_id": None})
    db.query(Habit).filter(Habit.project_id == project_id).update({"project_id": None})
    project.is_archived = True

    db.commit()
    return {"ok": True}
