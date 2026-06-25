from fastapi import APIRouter, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.database import engine

router = APIRouter(
    prefix="/health",
    tags=["Health"],
)


@router.get("")
def application_health() -> dict[str, str]:
    """Confirm that the FastAPI application is running."""

    return {
        "status": "healthy",
        "service": "api",
    }


@router.get("/database")
def database_health() -> dict[str, str]:
    """Confirm that PostgreSQL is reachable."""

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is unavailable",
        ) from error

    return {
        "status": "healthy",
        "database": "reachable",
    }
