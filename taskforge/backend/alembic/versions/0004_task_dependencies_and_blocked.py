"""task dependencies + blocked status

Revision ID: 0004_task_deps
Revises: 0003_task_activity
Create Date: 2026-04-04
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0004_task_deps"
down_revision = "0003_task_activity"
branch_labels = None
depends_on = None


def upgrade():
    # Add new enum value. Postgres requires autocommit for ALTER TYPE ... ADD VALUE.
    op.execute("COMMIT")
    op.execute("ALTER TYPE taskstatus ADD VALUE IF NOT EXISTS 'blocked'")

    op.create_table(
        "task_dependencies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "blocker_task_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tasks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "blocked_task_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tasks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("blocker_task_id", "blocked_task_id", name="uq_task_dependencies_edge"),
        sa.CheckConstraint("blocker_task_id <> blocked_task_id", name="ck_task_dependencies_not_self"),
    )

    op.create_index("ix_task_dependencies_blocker", "task_dependencies", ["blocker_task_id"])
    op.create_index("ix_task_dependencies_blocked", "task_dependencies", ["blocked_task_id"])


def downgrade():
    op.drop_index("ix_task_dependencies_blocked", table_name="task_dependencies")
    op.drop_index("ix_task_dependencies_blocker", table_name="task_dependencies")
    op.drop_table("task_dependencies")
    # Note: removing values from Postgres enums is non-trivial; we intentionally don't attempt it.
