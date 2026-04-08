from datetime import date
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from ..models.enums import TaskStatus


class TaskSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    status: TaskStatus
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    project_id: Optional[UUID] = None


class TaskDependenciesRead(BaseModel):
    blocked_by: List[TaskSummary]
    blocking: List[TaskSummary]
