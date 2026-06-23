from app.api.health import router as health_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings


settings = get_settings()


app = FastAPI(
    title=settings.app_name,
    description=(
        "Backend API for the Human vs Machine Decision-Making Study."
    ),
    version="0.1.0",
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

app.include_router(health_router)

@app.get("/", tags=["System"])
def read_root() -> dict[str, str]:
    """Return basic application information."""

    return {
        "name": settings.app_name,
        "mode": settings.app_mode,
        "status": "running",
    }