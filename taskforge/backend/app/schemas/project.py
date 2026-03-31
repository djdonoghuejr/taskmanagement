from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class ProjectBase(BaseModel):
    name: str
    color: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    is_archived: Optional[bool] = None

class ProjectRead(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    is_archived: bool
    created_at: datetime
    updated_at: datetime
