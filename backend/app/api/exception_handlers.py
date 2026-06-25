from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.services import (
    InvalidSelectionError,
    ResourceConflictError,
    ResourceNotFoundError,
)


async def resource_not_found_handler(
    _request: Request,
    error: ResourceNotFoundError,
) -> JSONResponse:
    """Convert a missing domain resource into HTTP 404."""

    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "detail": error.message,
        },
    )


async def resource_conflict_handler(
    _request: Request,
    error: ResourceConflictError,
) -> JSONResponse:
    """Convert a domain-state conflict into HTTP 409."""

    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={
            "detail": error.message,
        },
    )


async def invalid_selection_handler(
    _request: Request,
    error: InvalidSelectionError,
) -> JSONResponse:
    """Convert an invalid scenario option into HTTP 422."""

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={
            "detail": error.message,
        },
    )


def register_service_exception_handlers(app: FastAPI) -> None:
    """Register all service-layer exception handlers."""

    app.add_exception_handler(
        ResourceNotFoundError,
        resource_not_found_handler,
    )

    app.add_exception_handler(
        ResourceConflictError,
        resource_conflict_handler,
    )

    app.add_exception_handler(
        InvalidSelectionError,
        invalid_selection_handler,
    )
