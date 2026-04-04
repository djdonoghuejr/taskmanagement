import uuid
from sqlalchemy import Column, String, Text, DateTime, Enum, ForeignKey, Boolean, Integer, Date
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.sql import func

from ..database import Base
from .enums import CadenceType

class Habit(Base):
    __tablename__ = "recurring_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    cadence_type = Column(Enum(CadenceType), nullable=False)
    cadence_days = Column(ARRAY(Integer), nullable=True)
    cadence_day_of_month = Column(Integer, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class HabitCompletion(Base):
    __tablename__ = "recurring_completions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    habit_id = Column("recurring_item_id", UUID(as_uuid=True), ForeignKey("recurring_items.id"), nullable=False)
    completed_date = Column(Date, nullable=False)
    completed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completion_notes = Column(Text, nullable=True)
