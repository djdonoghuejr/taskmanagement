from datetime import date, datetime, timezone

import os
from .database import SessionLocal
from .models.user import User
from .models.auth_identity import AuthIdentity
from .models.project import Project
from .models.task import Task
from .models.habits import Habit
from .models.event import CalendarEvent
from .models.enums import CadenceType
from .services.auth import hash_password, normalize_email, utcnow


def seed():
    if os.getenv("SEED_DATA", "false").lower() not in {"1", "true", "yes"}:
        return
    db = SessionLocal()
    try:
        seed_email = normalize_email(os.getenv("SEED_EMAIL", "demo@taskforge.local"))
        seed_password = os.getenv("SEED_PASSWORD", "taskforge-demo-password")

        existing_user = db.query(User).filter(User.email == seed_email).first()
        if existing_user:
            return

        user = User(email=seed_email, email_verified_at=utcnow())
        db.add(user)
        db.flush()

        db.add(
            AuthIdentity(
                user_id=user.id,
                provider="local",
                provider_subject=seed_email,
                password_hash=hash_password(seed_password),
            )
        )

        project = Project(
            user_id=user.id,
            name="Personal",
            color="#3B82F6",
            description="Default project",
        )
        db.add(project)
        db.flush()

        task = Task(
            user_id=user.id,
            project_id=project.id,
            name="Welcome to TaskForge",
            description="Edit or complete this task.",
            due_date=date.today(),
            tags=["welcome"],
        )
        db.add(task)

        habit = Habit(
            user_id=user.id,
            project_id=project.id,
            name="Daily check-in",
            description="Mark this each day.",
            cadence_type=CadenceType.daily,
            is_active=True,
        )
        db.add(habit)

        event = CalendarEvent(
            user_id=user.id,
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
