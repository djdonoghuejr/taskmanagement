import uuid
from sqlalchemy import Boolean, Column, String, Text, Date, DateTime, Enum, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.sql import func

from ..database import Base
from .enums import TaskStatus

class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    can_be_done_virtually = Column(Boolean, nullable=False, default=False, server_default="false")
    expected_minutes = Column(Integer, nullable=True)
    start_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)
    tags = Column(ARRAY(String), nullable=False, default=list)
    status = Column(Enum(TaskStatus), nullable=False, default=TaskStatus.pending)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    completion_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
