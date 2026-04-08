"""add mobile sessions

Revision ID: 0009_mobile_sessions
Revises: 0008_task_start_date
Create Date: 2026-04-07
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "0009_mobile_sessions"
down_revision = "0008_task_start_date"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "mobile_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("refresh_token_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("refresh_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("refresh_token_hash", name="uq_mobile_sessions_refresh_token_hash"),
    )
    op.create_index(op.f("ix_mobile_sessions_user_id"), "mobile_sessions", ["user_id"], unique=False)
    op.create_index(op.f("ix_mobile_sessions_refresh_expires_at"), "mobile_sessions", ["refresh_expires_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_mobile_sessions_refresh_expires_at"), table_name="mobile_sessions")
    op.drop_index(op.f("ix_mobile_sessions_user_id"), table_name="mobile_sessions")
    op.drop_table("mobile_sessions")
