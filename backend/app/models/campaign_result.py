import uuid
import enum

from datetime import datetime

from sqlalchemy import (
    ForeignKey,
    Enum,
    DateTime,
    Text,
    UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UUIDMixin, TimestampMixin


class ResultOutcome(str, enum.Enum):
    ASSIGNED = "assigned"
    OPENED = "opened"
    REPORTED = "reported"
    COMPLETED = "completed"


class CampaignResult(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "campaign_results"

    __table_args__ = (
        UniqueConstraint(
            "target_id",
            "simulation_id",
            name="uq_target_simulation_result"
        ),
    )

    target_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("campaign_targets.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    simulation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("simulations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )

    outcome: Mapped[ResultOutcome] = mapped_column(
        Enum(
            ResultOutcome,
            name="result_outcome",
            native_enum=False
        ),
        default=ResultOutcome.ASSIGNED,
        nullable=False
    )

    feedback: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    opened_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    reported_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    target: Mapped["CampaignTarget"] = relationship(
        back_populates="results"
    )

    simulation: Mapped["Simulation"] = relationship(
        back_populates="results"
    )
