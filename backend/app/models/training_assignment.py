import enum
import uuid
from datetime import datetime
from sqlalchemy import (
    ForeignKey, Enum, DateTime, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UUIDMixin, TimestampMixin

from sqlalchemy.orm import Mapped, mapped_column, relationship

class TrainingAssignmentStatus(str, enum.Enum):
    ASSIGNED = "assigned"
    COMPLETED = "completed"


class TrainingAssignment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "training_assignments"

    __table_args__ = (
        UniqueConstraint(
            "training_id",
            "employee_id",
            name="unique_training_employee"
        ),
    )

    training_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("trainings.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    training: Mapped["Training"] = relationship()

    employee_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    employee: Mapped["User"] = relationship()

    status: Mapped[TrainingAssignmentStatus] = mapped_column(
        Enum(
            TrainingAssignmentStatus,
            name="training_assignment_status",
            native_enum=False
        ),
        default=TrainingAssignmentStatus.ASSIGNED,
        nullable=False
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
  )
