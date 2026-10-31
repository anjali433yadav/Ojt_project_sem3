import uuid
import enum

from sqlalchemy import ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UUIDMixin, TimestampMixin


class TargetStatus(str, enum.Enum):
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class CampaignTarget(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "campaign_targets"

    __table_args__ = (
        UniqueConstraint(
            "campaign_id",
            "user_id",
            name="uq_campaign_target_user"
        ),
    )

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )

    status: Mapped[TargetStatus] = mapped_column(
        Enum(
            TargetStatus,
            name="target_status",
            native_enum=False
        ),
        default=TargetStatus.ASSIGNED,
        nullable=False
    )

    campaign: Mapped["Campaign"] = relationship(
        back_populates="targets"
    )

    user: Mapped["User"] = relationship(
        back_populates="assigned_campaigns"
    )

    results: Mapped[list["CampaignResult"]] = relationship(
        back_populates="target",
        cascade="all, delete-orphan"
    )
