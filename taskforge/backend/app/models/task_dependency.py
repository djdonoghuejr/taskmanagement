import uuid

from sqlalchemy import Column, DateTime, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from ..database import Base


class TaskDependency(Base):
    __tablename__ = "task_dependencies"
    __table_args__ = (
        UniqueConstraint("blocker_task_id", "blocked_task_id", name="uq_task_dependencies_edge"),
        CheckConstraint("blocker_task_id <> blocked_task_id", name="ck_task_dependencies_not_self"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    blocker_task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    blocked_task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

