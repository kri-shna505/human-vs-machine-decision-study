from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health_router, study_router
from app.api.exception_handlers import register_service_exception_handlers
from app.config import get_settings
from app.version import APP_VERSION

# Load and cache the application configuration.
settings = get_settings()


app = FastAPI(
    title=settings.app_name,
    description=("Backend API for the Human vs Machine Decision-Making Study."),
    version=APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Convert predictable service-layer exceptions into HTTP responses.
register_service_exception_handlers(app)


# Register application routers.
app.include_router(health_router)
app.include_router(study_router)


@app.get(
    "/",
    tags=["System"],
    summary="Read application information",
)
def read_root() -> dict[str, str]:
    """Return basic application information."""

    return {
        "name": settings.app_name,
        "version": APP_VERSION,
        "mode": settings.app_mode,
        "status": "running",
    }
