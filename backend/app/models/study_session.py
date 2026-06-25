from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from app.database import Base

if TYPE_CHECKING:
    from app.models.human_response import HumanResponse
    from app.models.participant import Participant


class StudySession(Base):
    """One attempt by a participant to complete the study."""

    __tablename__ = "study_sessions"

    __table_args__ = (
        CheckConstraint(
            "status IN ('started', 'completed', 'abandoned')",
            name="ck_study_sessions_status",
        ),
        CheckConstraint(
            "randomization_seed >= 0",
            name="ck_study_sessions_randomization_seed_nonnegative",
        ),
        CheckConstraint(
            "completed_at IS NULL OR completed_at >= started_at",
            name="ck_study_sessions_completed_after_started",
        ),
        Index(
            "ix_study_sessions_participant_id",
            "participant_id",
        ),
        Index(
            "ix_study_sessions_status",
            "status",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    participant_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(
            "participants.id",
            name="fk_study_sessions_participant_id_participants",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="started",
        server_default=text("'started'"),
    )

    randomization_seed: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    participant: Mapped["Participant"] = relationship(
        back_populates="sessions",
    )

    responses: Mapped[list["HumanResponse"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
