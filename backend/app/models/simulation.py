import uuid
import enum

from sqlalchemy import String, Text, ForeignKey, Enum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UUIDMixin, TimestampMixin



class SimulationStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class Simulation(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "simulations"

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False
    )

    subject: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    difficulty: Mapped[str] = mapped_column(
        String(50),
        default="beginner",
        nullable=False
    )

    ai_generated: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )

    status: Mapped[SimulationStatus] = mapped_column(
        Enum(
            SimulationStatus,
            name="simulation_status",
            native_enum=False
        ),
        default=SimulationStatus.DRAFT,
        nullable=False
    )

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    campaign: Mapped["Campaign"] = relationship(
        back_populates="simulations"
    )

    creator: Mapped["User | None"] = relationship(
        back_populates="created_simulations"
    )

    results: Mapped[list["CampaignResult"]] = relationship(
        back_populates="simulation"
    )
