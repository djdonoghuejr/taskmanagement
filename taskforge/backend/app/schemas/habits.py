from datetime import datetime, date
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict

from ..models.enums import CadenceType

class HabitBase(BaseModel):
    name: str
    description: Optional[str] = None
    project_id: Optional[UUID] = None
    cadence_type: CadenceType
    cadence_days: Optional[List[int]] = None
    cadence_day_of_month: Optional[int] = None
    is_active: bool = True

class HabitCreate(HabitBase):
    pass

class HabitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    project_id: Optional[UUID] = None
    cadence_type: Optional[CadenceType] = None
    cadence_days: Optional[List[int]] = None
    cadence_day_of_month: Optional[int] = None
    is_active: Optional[bool] = None

class HabitRead(HabitBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

class HabitCompletionCreate(BaseModel):
    completion_notes: Optional[str] = None

class HabitCompletionUpdate(BaseModel):
    completion_notes: Optional[str] = None

class HabitCompletionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    habit_id: UUID
    completed_date: date
    completed_at: datetime
    completion_notes: Optional[str] = None

class HabitMetrics(BaseModel):
    habit_id: UUID
    completion_rate_7d: float
    completion_rate_30d: float
    completion_rate_all_time: float
    current_streak: int
    longest_streak: int
    total_completions: int
