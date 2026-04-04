from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TaskActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    task_id: UUID
    actor_user_id: UUID
    type: str
    message: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None
    created_at: datetime


class TaskActivityCommentCreate(BaseModel):
    message: str

