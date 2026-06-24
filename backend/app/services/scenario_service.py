from uuid import UUID

from sqlalchemy.orm import Session

from app.models import Scenario
from app.repositories import (
    get_active_scenario_by_id,
    list_active_scenarios,
)
from app.services.exceptions import ResourceNotFoundError


def get_public_scenarios(
    database_session: Session,
) -> list[Scenario]:
    """
    Return all currently active study scenarios.

    Returning an empty list is valid when the database has not yet been
    populated with baseline scenario data.
    """

    return list_active_scenarios(database_session)


def get_public_scenario(
    database_session: Session,
    scenario_id: UUID,
) -> Scenario:
    """Return one active scenario or raise a domain-level 404 error."""

    scenario = get_active_scenario_by_id(
        database_session,
        scenario_id,
    )

    if scenario is None:
        raise ResourceNotFoundError(
            "Active study scenario was not found.",
        )

    return scenario