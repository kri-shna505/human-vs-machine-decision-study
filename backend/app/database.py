from collections.abc import Generator

from sqlalchemy import URL, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()

database_url = URL.create(
    drivername="postgresql+psycopg",
    username=settings.postgres_user,
    password=settings.postgres_password,
    host=settings.postgres_host,
    port=settings.postgres_port,
    database=settings.postgres_db,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy database models."""


engine = create_engine(
    database_url,
    pool_pre_ping=True,
)


SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


def get_database_session() -> Generator[Session, None, None]:
    """Provide a database session and close it afterward."""

    database_session = SessionLocal()

    try:
        yield database_session
    finally:
        database_session.close()
