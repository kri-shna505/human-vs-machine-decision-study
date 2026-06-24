from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import StudySession


def create_study_session(
    database_session: Session,
    *,
    participant_id: UUID,
    randomization_seed: int,
) -> StudySession:
    """
    Create a new active study session for a participant.

    The service layer validates the participant before calling this
    repository function.
    """

    study_session = StudySession(
        participant_id=participant_id,
        randomization_seed=randomization_seed,
    )

    database_session.add(study_session)
    database_session.flush()
    database_session.refresh(study_session)

    return study_session


def get_study_session_by_id(
    database_session: Session,
    session_id: UUID,
) -> StudySession | None:
    """Return one study session with its submitted responses."""

    statement = (
        select(StudySession)
        .where(StudySession.id == session_id)
        .options(selectinload(StudySession.responses))
    )

    study_session = database_session.scalar(statement)

    if study_session is not None:
        study_session.responses.sort(
            key=lambda response: response.answered_at,
        )

    return study_session


def get_study_session_for_update(
    database_session: Session,
    session_id: UUID,
) -> StudySession | None:
    """
    Lock and return a study session for a state-changing operation.

    PostgreSQL holds the row lock until the surrounding transaction
    commits or rolls back.
    """

    statement = (
        select(StudySession)
        .where(StudySession.id == session_id)
        .with_for_update()
    )

    return database_session.scalar(statement)


def mark_study_session_completed(
    database_session: Session,
    *,
    study_session: StudySession,
    completed_at: datetime,
) -> StudySession:
    """Mark a study session as completed."""

    study_session.status = "completed"
    study_session.completed_at = completed_at

    database_session.flush()
    database_session.refresh(study_session)

    return study_session