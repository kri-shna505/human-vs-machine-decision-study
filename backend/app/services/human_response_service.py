from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import HumanResponse
from app.repositories import (
    create_human_response,
    get_active_scenario_by_id,
    get_option_for_scenario,
    get_response_for_session_and_scenario,
    get_study_session_for_update,
)
from app.services.exceptions import (
    InvalidSelectionError,
    ResourceConflictError,
    ResourceNotFoundError,
    ServiceError,
)


DUPLICATE_RESPONSE_CONSTRAINT = (
    "uq_human_responses_session_scenario"
)

SCENARIO_OPTION_CONSTRAINT = (
    "fk_human_responses_scenario_option"
)


def _get_constraint_name(
    error: IntegrityError,
) -> str | None:
    """
    Extract PostgreSQL's violated constraint name when available.
    """

    diagnostic = getattr(error.orig, "diag", None)

    return getattr(diagnostic, "constraint_name", None)


def submit_human_response(
    database_session: Session,
    *,
    session_id: UUID,
    scenario_id: UUID,
    selected_option_id: UUID,
    confidence: int,
    response_time_ms: int,
) -> HumanResponse:
    """
    Validate, store, and commit one human response.

    This operation locks the study-session row so concurrent requests
    cannot safely submit or complete the same session simultaneously.
    """

    try:
        study_session = get_study_session_for_update(
            database_session,
            session_id,
        )

        if study_session is None:
            raise ResourceNotFoundError(
                "Study session was not found.",
            )

        if study_session.status != "started":
            raise ResourceConflictError(
                "Responses can only be submitted to a started session.",
            )

        scenario = get_active_scenario_by_id(
            database_session,
            scenario_id,
        )

        if scenario is None:
            raise ResourceNotFoundError(
                "Active study scenario was not found.",
            )

        selected_option = get_option_for_scenario(
            database_session,
            scenario_id=scenario_id,
            option_id=selected_option_id,
        )

        if selected_option is None:
            raise InvalidSelectionError(
                "The selected option does not belong to the scenario.",
            )

        existing_response = (
            get_response_for_session_and_scenario(
                database_session,
                session_id=session_id,
                scenario_id=scenario_id,
            )
        )

        if existing_response is not None:
            raise ResourceConflictError(
                "A response for this scenario already exists.",
            )

        response = create_human_response(
            database_session,
            session_id=session_id,
            scenario_id=scenario_id,
            selected_option_id=selected_option_id,
            confidence=confidence,
            response_time_ms=response_time_ms,
        )

        database_session.commit()
        database_session.refresh(response)

        return response

    except IntegrityError as error:
        database_session.rollback()

        constraint_name = _get_constraint_name(error)

        if constraint_name == DUPLICATE_RESPONSE_CONSTRAINT:
            raise ResourceConflictError(
                "A response for this scenario already exists.",
            ) from error

        if constraint_name == SCENARIO_OPTION_CONSTRAINT:
            raise InvalidSelectionError(
                "The selected option does not belong to the scenario.",
            ) from error

        raise

    except ServiceError:
        database_session.rollback()
        raise

    except Exception:
        database_session.rollback()
        raise