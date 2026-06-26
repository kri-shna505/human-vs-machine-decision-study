from fastapi.testclient import TestClient

from app.main import app
from app.version import APP_VERSION

client = TestClient(app)


def test_root_endpoint() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "name": "Human vs Machine Decision Study",
        "version": APP_VERSION,
        "mode": "demonstration",
        "status": "running",
    }


def test_application_health_endpoint() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "service": "api",
    }


def test_database_health_endpoint() -> None:
    response = client.get("/health/database")

    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "database": "reachable",
    }
