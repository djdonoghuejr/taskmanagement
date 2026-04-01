"""add completion notes

Revision ID: 0002_add_completion_notes
Revises: 0001_init
Create Date: 2026-03-31
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_add_completion_notes"
down_revision = "0001_init"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("tasks", sa.Column("completion_notes", sa.Text(), nullable=True))
    op.add_column(
        "recurring_completions", sa.Column("completion_notes", sa.Text(), nullable=True)
    )


def downgrade():
    op.drop_column("recurring_completions", "completion_notes")
    op.drop_column("tasks", "completion_notes")
