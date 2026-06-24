from collections.abc import Iterator

from sqlalchemy.orm import Session

from app.database import engine


def get_database_session() -> Iterator[Session]:
    """
    Provide one SQLAlchemy session for a FastAPI request.

    The service layer owns commit and rollback decisions. This dependency
    guarantees that the session is closed after the request finishes.
    """

    with Session(engine) as database_session:
        yield database_session