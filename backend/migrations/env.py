from logging.config import fileConfig

from alembic import context

# Importing the models package registers every ORM model with Base.metadata.
# Alembic needs this import before it performs schema comparisons.
from app import models as registered_models  # noqa: F401
from app.database import Base, engine


# Alembic's Config object provides access to alembic.ini.
config = context.config

# Configure Python logging using the logging sections in alembic.ini.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


# Alembic compares the live database schema against this metadata.
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations without opening a live database connection."""

    # Convert the SQLAlchemy URL into a string Alembic can use.
    database_url = engine.url.render_as_string(hide_password=False)

    context.configure(
        url=database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations using the configured SQLAlchemy engine."""

    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()