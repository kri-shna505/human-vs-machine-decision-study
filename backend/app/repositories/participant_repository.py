from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Participant


def create_participant(
    database_session: Session,
    *,
    participant_code: str,
) -> Participant:
    """
    Create an anonymous participant.

    The caller is responsible for committing or rolling back the
    surrounding transaction.
    """

    participant = Participant(
        participant_code=participant_code,
    )

    database_session.add(participant)
    database_session.flush()
    database_session.refresh(participant)

    return participant


def get_participant_by_id(
    database_session: Session,
    participant_id: UUID,
) -> Participant | None:
    """Return a participant by primary key."""

    return database_session.get(Participant, participant_id)


def get_participant_by_code(
    database_session: Session,
    participant_code: str,
) -> Participant | None:
    """Return a participant by its public anonymous code."""

    statement = select(Participant).where(
        Participant.participant_code == participant_code,
    )

    return database_session.scalar(statement)