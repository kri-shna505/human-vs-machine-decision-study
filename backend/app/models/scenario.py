from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from app.database import Base

if TYPE_CHECKING:
    from app.models.human_response import HumanResponse
    from app.models.machine_prediction import MachinePrediction


class Scenario(Base):
    """Versioned decision-making question presented during the study."""

    __tablename__ = "scenarios"

    __table_args__ = (
        UniqueConstraint(
            "slug",
            "version",
            name="uq_scenarios_slug_version",
        ),
        CheckConstraint(
            "version > 0",
            name="ck_scenarios_version_positive",
        ),
        Index(
            "ix_scenarios_category",
            "category",
        ),
        Index(
            "ix_scenarios_is_active",
            "is_active",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    slug: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        server_default=text("1"),
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    category: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    prompt: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    options: Mapped[list["ScenarioOption"]] = relationship(
        back_populates="scenario",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    human_responses: Mapped[list["HumanResponse"]] = relationship(
        back_populates="scenario",
        passive_deletes=True,
    )

    machine_predictions: Mapped[list["MachinePrediction"]] = relationship(
        back_populates="scenario",
        passive_deletes=True,
    )


class ScenarioOption(Base):
    """Selectable answer belonging to one scenario."""

    __tablename__ = "scenario_options"

    __table_args__ = (
        UniqueConstraint(
            "scenario_id",
            "code",
            name="uq_scenario_options_scenario_code",
        ),
        UniqueConstraint(
            "scenario_id",
            "display_order",
            name="uq_scenario_options_scenario_display_order",
        ),
        UniqueConstraint(
            "scenario_id",
            "id",
            name="uq_scenario_options_scenario_id_id",
        ),
        CheckConstraint(
            "display_order >= 0",
            name="ck_scenario_options_display_order_nonnegative",
        ),
        Index(
            "ix_scenario_options_scenario_id",
            "scenario_id",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    scenario_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(
            "scenarios.id",
            name="fk_scenario_options_scenario_id_scenarios",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    code: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
    )

    label: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    display_order: Mapped[int] = mapped_column(
        SmallInteger,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    scenario: Mapped["Scenario"] = relationship(
        back_populates="options",
    )
