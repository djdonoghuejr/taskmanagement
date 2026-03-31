from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class TagBase(BaseModel):
    name: str
    color: str

class TagCreate(TagBase):
    pass

class TagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    is_archived: Optional[bool] = None

class TagRead(TagBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    is_archived: bool
    created_at: datetime
    updated_at: datetime
