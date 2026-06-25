from secrets import token_hex

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Participant
from app.repositories import create_participant
from app.services.exceptions import ResourceConflictError

PARTICIPANT_CODE_ATTEMPTS = 5


def _generate_participant_code() -> str:
    """
    Generate a public anonymous participant code.

    The generated value contains no personal information.
    """

    random_part = token_hex(10).upper()

    return f"P-{random_part}"


def register_anonymous_participant(
    database_session: Session,
) -> Participant:
    """
    Create and commit an anonymous participant.

    PostgreSQL's unique participant-code constraint provides the final
    protection against an extremely unlikely generated-code collision.
    """

    for _ in range(PARTICIPANT_CODE_ATTEMPTS):
        participant_code = _generate_participant_code()

        try:
            participant = create_participant(
                database_session,
                participant_code=participant_code,
            )

            database_session.commit()
            database_session.refresh(participant)

            return participant
        except IntegrityError:
            database_session.rollback()

    raise ResourceConflictError(
        "A unique participant code could not be generated.",
    )
