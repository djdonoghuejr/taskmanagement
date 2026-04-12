"""add task virtual flag

Revision ID: 0010_task_virtual_flag
Revises: 0009_mobile_sessions
Create Date: 2026-04-12 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0010_task_virtual_flag"
down_revision = "0009_mobile_sessions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tasks",
        sa.Column("can_be_done_virtually", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.alter_column("tasks", "can_be_done_virtually", server_default=None)


def downgrade() -> None:
    op.drop_column("tasks", "can_be_done_virtually")
