from logging.config import fileConfig
import os
import sys

from alembic import context
from sqlalchemy import create_engine, pool

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.config import DATABASE_URL
from app.database import Base, sanitize_database_url
from app import models  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url():
    # Prefer an explicitly overridden sqlalchemy.url (useful for tests).
    # Ignore the default placeholder value in alembic.ini.
    url = config.get_main_option("sqlalchemy.url")
    if url and not url.startswith("driver://"):
        return url
    return DATABASE_URL


def run_migrations_offline() -> None:
    raw_url = get_url()
    url, _ = sanitize_database_url(raw_url)
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    raw_url = get_url()
    clean_url, connect_args = sanitize_database_url(raw_url)
    connectable = create_engine(
        clean_url,
        poolclass=pool.NullPool,
        pool_pre_ping=True,
        connect_args=connect_args,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
