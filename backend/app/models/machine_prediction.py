from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    ForeignKeyConstraint,
    Index,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from app.database import Base

if TYPE_CHECKING:
    from app.models.scenario import Scenario, ScenarioOption


class MachinePrediction(Base):
    """Prediction produced by one machine model for one scenario."""

    __tablename__ = "machine_predictions"

    __table_args__ = (
        ForeignKeyConstraint(
            ["scenario_id"],
            ["scenarios.id"],
            name="fk_machine_predictions_scenario_id_scenarios",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["scenario_id", "selected_option_id"],
            ["scenario_options.scenario_id", "scenario_options.id"],
            name="fk_machine_predictions_scenario_option",
            ondelete="RESTRICT",
        ),
        UniqueConstraint(
            "scenario_id",
            "model_name",
            "model_version",
            name="uq_machine_predictions_scenario_model_version",
        ),
        CheckConstraint(
            "confidence >= 0 AND confidence <= 1",
            name="ck_machine_predictions_confidence_range",
        ),
        Index(
            "ix_machine_predictions_scenario_id",
            "scenario_id",
        ),
        Index(
            "ix_machine_predictions_selected_option_id",
            "selected_option_id",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    scenario_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        nullable=False,
    )

    selected_option_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        nullable=False,
    )

    model_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    model_version: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    confidence: Mapped[Decimal] = mapped_column(
        Numeric(5, 4),
        nullable=False,
    )

    raw_output: Mapped[dict[str, object] | None] = mapped_column(
        JSON,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    scenario: Mapped["Scenario"] = relationship(
        back_populates="machine_predictions",
        foreign_keys=[scenario_id],
    )

    selected_option: Mapped["ScenarioOption"] = relationship(
        primaryjoin=("MachinePrediction.selected_option_id == ScenarioOption.id"),
        foreign_keys=[selected_option_id],
        viewonly=True,
    )
