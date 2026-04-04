"""task activity task fk cascade

Revision ID: 0006_task_activity_fk
Revises: 0005_auth_fks
Create Date: 2026-04-04
"""

from alembic import op

revision = "0006_task_activity_fk"
down_revision = "0005_auth_fks"
branch_labels = None
depends_on = None


def upgrade():
    # Default constraint name from Postgres for FK created without explicit name.
    op.drop_constraint("task_activities_task_id_fkey", "task_activities", type_="foreignkey")
    op.create_foreign_key(
        "task_activities_task_id_fkey",
        "task_activities",
        "tasks",
        ["task_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade():
    op.drop_constraint("task_activities_task_id_fkey", "task_activities", type_="foreignkey")
    op.create_foreign_key(
        "task_activities_task_id_fkey",
        "task_activities",
        "tasks",
        ["task_id"],
        ["id"],
    )

