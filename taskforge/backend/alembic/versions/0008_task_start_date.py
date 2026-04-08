"""add task start date

Revision ID: 0008_task_start_date
Revises: 0007_task_expected_minutes
Create Date: 2026-04-06
"""

from alembic import op
import sqlalchemy as sa

revision = "0008_task_start_date"
down_revision = "0007_task_expected_minutes"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("tasks", sa.Column("start_date", sa.Date(), nullable=True))


def downgrade():
    op.drop_column("tasks", "start_date")
