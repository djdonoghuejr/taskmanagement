import enum

class TaskStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"

class CadenceType(str, enum.Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"
    custom = "custom"
