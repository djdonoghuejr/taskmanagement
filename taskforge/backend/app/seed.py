from datetime import date, datetime, timezone

import os
from .config import SYSTEM_USER_ID
from .database import SessionLocal
from .models.project import Project
from .models.task import Task
from .models.habits import Habit
from .models.event import CalendarEvent
from .models.enums import CadenceType


def seed():
    if os.getenv("SEED_DATA", "false").lower() not in {"1", "true", "yes"}:
        return
    db = SessionLocal()
    try:
        existing = db.query(Project).count()
        if existing > 0:
            return

        project = Project(
            user_id=SYSTEM_USER_ID,
            name="Personal",
            color="#3B82F6",
            description="Default project",
        )
        db.add(project)
        db.flush()

        task = Task(
            user_id=SYSTEM_USER_ID,
            project_id=project.id,
            name="Welcome to TaskForge",
            description="Edit or complete this task.",
            due_date=date.today(),
            tags=["welcome"],
        )
        db.add(task)

        habit = Habit(
            user_id=SYSTEM_USER_ID,
            project_id=project.id,
            name="Daily check-in",
            description="Mark this each day.",
            cadence_type=CadenceType.daily,
            is_active=True,
        )
        db.add(habit)

        event = CalendarEvent(
            user_id=SYSTEM_USER_ID,
            title="Sample event",
            description="You can delete this.",
            start_time=datetime.now(tz=timezone.utc),
            end_time=datetime.now(tz=timezone.utc),
            all_day=False,
            color="#F59E0B",
        )
        db.add(event)

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
