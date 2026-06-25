from dataclasses import dataclass
from datetime import datetime, timezone
from secrets import randbits
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import StudySession
from app.repositories import (
    create_study_session,
    get_participant_by_id,
    get_study_session_by_id,
    get_study_session_for_update,
    list_active_scenarios,
    list_responses_for_session,
    mark_study_session_completed,
)
from app.services.exceptions import (
    ResourceConflictError,
    ResourceNotFoundError,
    ServiceError,
)


@dataclass(frozen=True)
class CompletedStudySession:
    """Result returned after a study session is completed."""

    study_session: StudySession
    response_count: int


def start_study_session(
    database_session: Session,
    *,
    participant_id: UUID,
) -> StudySession:
    """Create and commit a new study session for a participant."""

    participant = get_participant_by_id(
        database_session,
        participant_id,
    )

    if participant is None:
        database_session.rollback()

        raise ResourceNotFoundError(
            "Participant was not found.",
        )

    randomization_seed = randbits(63)

    try:
        study_session = create_study_session(
            database_session,
            participant_id=participant.id,
            randomization_seed=randomization_seed,
        )

        database_session.commit()
        database_session.refresh(study_session)

        return study_session

    except IntegrityError as error:
        database_session.rollback()

        raise ResourceConflictError(
            "The study session could not be created.",
        ) from error

    except Exception:
        database_session.rollback()
        raise


def get_study_session_detail(
    database_session: Session,
    *,
    session_id: UUID,
) -> StudySession:
    """Return one study session with its submitted responses."""

    study_session = get_study_session_by_id(
        database_session,
        session_id,
    )

    if study_session is None:
        raise ResourceNotFoundError(
            "Study session was not found.",
        )

    return study_session


def complete_study_session(
    database_session: Session,
    *,
    session_id: UUID,
) -> CompletedStudySession:
    """
    Complete a session only after every active scenario is answered.
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
                "Only a started session can be completed.",
            )

        active_scenarios = list_active_scenarios(
            database_session,
        )

        if not active_scenarios:
            raise ResourceConflictError(
                "The study cannot be completed because no "
                "active scenarios are available.",
            )

        responses = list_responses_for_session(
            database_session,
            session_id,
        )

        active_scenario_ids = {scenario.id for scenario in active_scenarios}

        answered_scenario_ids = {response.scenario_id for response in responses}

        missing_scenario_ids = active_scenario_ids - answered_scenario_ids

        unexpected_scenario_ids = answered_scenario_ids - active_scenario_ids

        if missing_scenario_ids:
            missing_count = len(missing_scenario_ids)

            raise ResourceConflictError(
                f"The session has {missing_count} unanswered active scenario(s).",
            )

        if unexpected_scenario_ids:
            raise ResourceConflictError(
                "The session contains responses for scenarios "
                "that are no longer active.",
            )

        completed_at = datetime.now(timezone.utc)

        completed_session = mark_study_session_completed(
            database_session,
            study_session=study_session,
            completed_at=completed_at,
        )

        response_count = len(responses)

        database_session.commit()
        database_session.refresh(completed_session)

        return CompletedStudySession(
            study_session=completed_session,
            response_count=response_count,
        )

    except ServiceError:
        database_session.rollback()
        raise

    except IntegrityError:
        database_session.rollback()
        raise

    except Exception:
        database_session.rollback()
        raise
