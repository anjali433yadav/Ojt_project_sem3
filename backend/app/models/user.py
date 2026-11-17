import uuid
from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UUIDMixin, TimestampMixin


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    full_name: Mapped[str] = mapped_column(
        String(120),
        nullable=False
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    role_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("roles.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )

    role: Mapped["Role"] = relationship(
        back_populates="users"
    )

    created_campaigns: Mapped[list["Campaign"]] = relationship(
        back_populates="creator"
    )

    assigned_campaigns: Mapped[list["CampaignTarget"]] = relationship(
        back_populates="user"
    )

    created_simulations: Mapped[list["Simulation"]] = relationship(
        back_populates="creator",
        foreign_keys="[Simulation.created_by]"
    )

    created_trainings: Mapped[list["Training"]] = relationship(
        back_populates="creator"
    )

    audit_logs: Mapped[list["AuditLog"]] = relationship(
        back_populates="actor"
    )
