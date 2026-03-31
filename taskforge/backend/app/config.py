import os
from uuid import UUID

SYSTEM_USER_ID = UUID(os.getenv("SYSTEM_USER_ID", "00000000-0000-0000-0000-000000000001"))

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://taskforge:taskforge@db:5432/taskforge",
)
