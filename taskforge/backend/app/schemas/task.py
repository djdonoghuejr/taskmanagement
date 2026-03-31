from datetime import date, datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict

from ..models.enums import TaskStatus

class TaskBase(BaseModel):
    name: str
    description: Optional[str] = None
    project_id: Optional[UUID] = None
    due_date: Optional[date] = None
    tags: List[str] = []

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    project_id: Optional[UUID] = None
    due_date: Optional[date] = None
    tags: Optional[List[str]] = None
    status: Optional[TaskStatus] = None
    completed_at: Optional[datetime] = None

class TaskRead(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    status: TaskStatus
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
