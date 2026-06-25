from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Scenario, ScenarioOption


def list_active_scenarios(database_session: Session) -> list[Scenario]:
    """
    Return all active scenarios with their options eagerly loaded.

    Scenarios are ordered consistently so participants receive a stable
    baseline ordering before the service layer applies randomization.
    """

    statement = (
        select(Scenario)
        .where(Scenario.is_active.is_(True))
        .options(selectinload(Scenario.options))
        .order_by(
            Scenario.category.asc(),
            Scenario.title.asc(),
            Scenario.version.asc(),
        )
    )

    scenarios = list(database_session.scalars(statement).all())

    # The relationship itself currently has no ORM-level order_by rule.
    # Sort loaded options explicitly before returning the scenarios.
    for scenario in scenarios:
        scenario.options.sort(key=lambda option: option.display_order)

    return scenarios


def get_active_scenario_by_id(
    database_session: Session,
    scenario_id: UUID,
) -> Scenario | None:
    """Return one active scenario with its options eagerly loaded."""

    statement = (
        select(Scenario)
        .where(
            Scenario.id == scenario_id,
            Scenario.is_active.is_(True),
        )
        .options(selectinload(Scenario.options))
    )

    scenario = database_session.scalar(statement)

    if scenario is not None:
        scenario.options.sort(key=lambda option: option.display_order)

    return scenario


def get_scenario_by_id(
    database_session: Session,
    scenario_id: UUID,
) -> Scenario | None:
    """
    Return one scenario regardless of whether it is active.

    This is useful for internal checks where historical scenarios must
    remain accessible.
    """

    statement = (
        select(Scenario)
        .where(Scenario.id == scenario_id)
        .options(selectinload(Scenario.options))
    )

    scenario = database_session.scalar(statement)

    if scenario is not None:
        scenario.options.sort(key=lambda option: option.display_order)

    return scenario


def get_option_for_scenario(
    database_session: Session,
    *,
    scenario_id: UUID,
    option_id: UUID,
) -> ScenarioOption | None:
    """
    Return an option only when it belongs to the specified scenario.

    This performs an application-level validation before PostgreSQL's
    composite foreign-key constraint performs the final integrity check.
    """

    statement = select(ScenarioOption).where(
        ScenarioOption.id == option_id,
        ScenarioOption.scenario_id == scenario_id,
    )

    return database_session.scalar(statement)


def count_active_scenarios(database_session: Session) -> int:
    """Return the number of active scenarios."""

    statement = (
        select(func.count(Scenario.id))
        .select_from(Scenario)
        .where(Scenario.is_active.is_(True))
    )

    return int(database_session.scalar(statement) or 0)
