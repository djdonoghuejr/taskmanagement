"""auth and user foreign keys

Revision ID: 0005_auth_fks
Revises: 0004_task_deps
Create Date: 2026-04-04
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0005_auth_fks"
down_revision = "0004_task_deps"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "auth_identities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("provider_subject", sa.String(length=512), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("provider", "provider_subject", name="uq_auth_identity_provider_subject"),
    )
    op.create_index("ix_auth_identities_user_id", "auth_identities", ["user_id"], unique=False)

    op.create_table(
        "sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("token_hash", name="uq_sessions_token_hash"),
    )
    op.create_index("ix_sessions_user_id", "sessions", ["user_id"], unique=False)
    op.create_index("ix_sessions_expires_at", "sessions", ["expires_at"], unique=False)

    op.create_table(
        "email_verification_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("token_hash", name="uq_email_verification_tokens_token_hash"),
    )
    op.create_index("ix_email_verification_tokens_user_id", "email_verification_tokens", ["user_id"], unique=False)
    op.create_index("ix_email_verification_tokens_token_hash", "email_verification_tokens", ["token_hash"], unique=True)

    # Existing pre-auth domain rows are disposable; wipe so we can add real FKs safely.
    op.execute(
        """
        TRUNCATE
          task_dependencies,
          task_activities,
          tasks,
          recurring_completions,
          recurring_items,
          calendar_events,
          tags,
          projects
        CASCADE
        """
    )

    op.create_foreign_key(
        "fk_projects_user_id_users",
        "projects",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_projects_user_id", "projects", ["user_id"], unique=False)
    op.create_unique_constraint("uq_projects_user_name", "projects", ["user_id", "name"])

    op.create_foreign_key(
        "fk_tags_user_id_users",
        "tags",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_tags_user_id", "tags", ["user_id"], unique=False)

    op.create_foreign_key(
        "fk_tasks_user_id_users",
        "tasks",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_tasks_user_id", "tasks", ["user_id"], unique=False)

    op.create_foreign_key(
        "fk_recurring_items_user_id_users",
        "recurring_items",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_recurring_items_user_id", "recurring_items", ["user_id"], unique=False)
    op.create_unique_constraint("uq_habits_user_name", "recurring_items", ["user_id", "name"])

    op.create_foreign_key(
        "fk_calendar_events_user_id_users",
        "calendar_events",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_calendar_events_user_id", "calendar_events", ["user_id"], unique=False)

    op.create_foreign_key(
        "fk_task_activities_actor_user_id_users",
        "task_activities",
        "users",
        ["actor_user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_task_activities_actor_user_id", "task_activities", ["actor_user_id"], unique=False)


def downgrade():
    op.drop_index("ix_task_activities_actor_user_id", table_name="task_activities")
    op.drop_constraint("fk_task_activities_actor_user_id_users", "task_activities", type_="foreignkey")

    op.drop_index("ix_calendar_events_user_id", table_name="calendar_events")
    op.drop_constraint("fk_calendar_events_user_id_users", "calendar_events", type_="foreignkey")

    op.drop_constraint("uq_habits_user_name", "recurring_items", type_="unique")
    op.drop_index("ix_recurring_items_user_id", table_name="recurring_items")
    op.drop_constraint("fk_recurring_items_user_id_users", "recurring_items", type_="foreignkey")

    op.drop_index("ix_tasks_user_id", table_name="tasks")
    op.drop_constraint("fk_tasks_user_id_users", "tasks", type_="foreignkey")

    op.drop_index("ix_tags_user_id", table_name="tags")
    op.drop_constraint("fk_tags_user_id_users", "tags", type_="foreignkey")

    op.drop_constraint("uq_projects_user_name", "projects", type_="unique")
    op.drop_index("ix_projects_user_id", table_name="projects")
    op.drop_constraint("fk_projects_user_id_users", "projects", type_="foreignkey")

    op.drop_index("ix_email_verification_tokens_token_hash", table_name="email_verification_tokens")
    op.drop_index("ix_email_verification_tokens_user_id", table_name="email_verification_tokens")
    op.drop_table("email_verification_tokens")

    op.drop_index("ix_sessions_expires_at", table_name="sessions")
    op.drop_index("ix_sessions_user_id", table_name="sessions")
    op.drop_table("sessions")

    op.drop_index("ix_auth_identities_user_id", table_name="auth_identities")
    op.drop_table("auth_identities")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
