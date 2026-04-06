"""add task expected minutes

Revision ID: 0007_task_expected_minutes
Revises: 0006_task_activity_fk
Create Date: 2026-04-05
"""

from alembic import op
import sqlalchemy as sa

revision = "0007_task_expected_minutes"
down_revision = "0006_task_activity_fk"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("tasks", sa.Column("expected_minutes", sa.Integer(), nullable=True))


def downgrade():
    op.drop_column("tasks", "expected_minutes")
