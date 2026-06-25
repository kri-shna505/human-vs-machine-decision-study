from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    SmallInteger,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from app.database import Base

if TYPE_CHECKING:
    from app.models.scenario import Scenario, ScenarioOption
    from app.models.study_session import StudySession


class HumanResponse(Base):
    """Answer submitted by a participant during one study session."""

    __tablename__ = "human_responses"

    __table_args__ = (
        ForeignKeyConstraint(
            ["scenario_id"],
            ["scenarios.id"],
            name="fk_human_responses_scenario_id_scenarios",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["scenario_id", "selected_option_id"],
            ["scenario_options.scenario_id", "scenario_options.id"],
            name="fk_human_responses_scenario_option",
            ondelete="RESTRICT",
        ),
        UniqueConstraint(
            "session_id",
            "scenario_id",
            name="uq_human_responses_session_scenario",
        ),
        CheckConstraint(
            "confidence >= 0 AND confidence <= 100",
            name="ck_human_responses_confidence_range",
        ),
        CheckConstraint(
            "response_time_ms >= 0",
            name="ck_human_responses_response_time_nonnegative",
        ),
        Index(
            "ix_human_responses_session_id",
            "session_id",
        ),
        Index(
            "ix_human_responses_scenario_id",
            "scenario_id",
        ),
        Index(
            "ix_human_responses_selected_option_id",
            "selected_option_id",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    session_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(
            "study_sessions.id",
            name="fk_human_responses_session_id_study_sessions",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    scenario_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        nullable=False,
    )

    selected_option_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        nullable=False,
    )

    confidence: Mapped[int] = mapped_column(
        SmallInteger,
        nullable=False,
    )

    response_time_ms: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    answered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    session: Mapped["StudySession"] = relationship(
        back_populates="responses",
    )

    scenario: Mapped["Scenario"] = relationship(
        back_populates="human_responses",
        foreign_keys=[scenario_id],
    )

    selected_option: Mapped["ScenarioOption"] = relationship(
        primaryjoin=("HumanResponse.selected_option_id == ScenarioOption.id"),
        foreign_keys=[selected_option_id],
        viewonly=True,
    )
