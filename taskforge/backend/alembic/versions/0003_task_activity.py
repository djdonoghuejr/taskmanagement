"""task activity

Revision ID: 0003_task_activity
Revises: 0002_add_completion_notes
Create Date: 2026-04-04
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0003_task_activity"
down_revision = "0002_add_completion_notes"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "task_activities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tasks.id"), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_task_activities_task_id", "task_activities", ["task_id"])


def downgrade():
    op.drop_index("ix_task_activities_task_id", table_name="task_activities")
    op.drop_table("task_activities")

