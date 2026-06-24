from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import HumanResponse


def create_human_response(
    database_session: Session,
    *,
    session_id: UUID,
    scenario_id: UUID,
    selected_option_id: UUID,
    confidence: int,
    response_time_ms: int,
) -> HumanResponse:
    """
    Store one participant response.

    PostgreSQL still provides the final protection against duplicate
    responses and mismatched scenario options.
    """

    response = HumanResponse(
        session_id=session_id,
        scenario_id=scenario_id,
        selected_option_id=selected_option_id,
        confidence=confidence,
        response_time_ms=response_time_ms,
    )

    database_session.add(response)
    database_session.flush()
    database_session.refresh(response)

    return response


def get_response_for_session_and_scenario(
    database_session: Session,
    *,
    session_id: UUID,
    scenario_id: UUID,
) -> HumanResponse | None:
    """Return an existing response for one session and scenario."""

    statement = select(HumanResponse).where(
        HumanResponse.session_id == session_id,
        HumanResponse.scenario_id == scenario_id,
    )

    return database_session.scalar(statement)


def count_responses_for_session(
    database_session: Session,
    session_id: UUID,
) -> int:
    """Return the number of responses submitted in a study session."""

    statement = (
        select(func.count(HumanResponse.id))
        .select_from(HumanResponse)
        .where(HumanResponse.session_id == session_id)
    )

    return int(database_session.scalar(statement) or 0)


def list_responses_for_session(
    database_session: Session,
    session_id: UUID,
) -> list[HumanResponse]:
    """Return all responses belonging to one study session."""

    statement = (
        select(HumanResponse)
        .where(HumanResponse.session_id == session_id)
        .order_by(HumanResponse.answered_at.asc())
    )

    return list(database_session.scalars(statement).all())