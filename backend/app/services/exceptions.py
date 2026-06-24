"""Domain-level errors raised by the service layer."""


class ServiceError(Exception):
    """Base class for predictable application-service errors."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class ResourceNotFoundError(ServiceError):
    """Raised when a requested database resource does not exist."""


class ResourceConflictError(ServiceError):
    """Raised when an operation conflicts with the current data state."""


class InvalidSelectionError(ServiceError):
    """Raised when a submitted option is invalid for a scenario."""