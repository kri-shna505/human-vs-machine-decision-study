from collections.abc import Iterator
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.dependencies import get_database_session
from app.database import engine
from app.main import app
from app.seeds.scenarios import seed_baseline_scenarios


@pytest.fixture
def api_client() -> Iterator[TestClient]:
    """
    Provide an API client with isolated PostgreSQL transactions.

    The application services may call commit or rollback, but every
    database change created during the test is still removed when the
    outer transaction is rolled back.
    """

    connection = engine.connect()
    outer_transaction = connection.begin()

    # Guarantee that the three deterministic baseline scenarios exist
    # inside the same transaction used by this test.
    seed_session = Session(
        bind=connection,
        join_transaction_mode="create_savepoint",
    )

    try:
        seed_baseline_scenarios(seed_session)
        seed_session.commit()
    finally:
        seed_session.close()

    def override_database_session() -> Iterator[Session]:
        """
        Replace the production database dependency for API requests.
        """

        with Session(
            bind=connection,
            join_transaction_mode="create_savepoint",
        ) as database_session:
            yield database_session

    app.dependency_overrides[
        get_database_session
    ] = override_database_session

    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.pop(
            get_database_session,
            None,
        )

        if outer_transaction.is_active:
            outer_transaction.rollback()

        connection.close()


def register_participant(
    client: TestClient,
) -> dict[str, Any]:
    """Register and return one anonymous participant."""

    response = client.post(
        "/api/v1/participants",
        json={
            "consent": True,
        },
    )

    assert response.status_code == 201

    participant = response.json()

    assert participant["participant_code"].startswith("P-")
    assert participant["consented_at"] is not None
    assert participant["created_at"] is not None

    return participant


def start_session(
    client: TestClient,
    *,
    participant_id: str,
) -> dict[str, Any]:
    """Start and return one study session."""

    response = client.post(
        "/api/v1/sessions",
        json={
            "participant_id": participant_id,
        },
    )

    assert response.status_code == 201

    study_session = response.json()

    assert study_session["participant_id"] == participant_id
    assert study_session["status"] == "started"
    assert study_session["completed_at"] is None
    assert study_session["randomization_seed"] >= 0

    return study_session


def get_scenarios(
    client: TestClient,
) -> list[dict[str, Any]]:
    """Load and validate the three baseline study scenarios."""

    response = client.get("/api/v1/scenarios")

    assert response.status_code == 200

    scenarios = response.json()

    assert len(scenarios) == 3

    assert {
        scenario["slug"]
        for scenario in scenarios
    } == {
        "conjunction-fallacy",
        "framing-effect",
        "risk-preference",
    }

    for scenario in scenarios:
        assert scenario["version"] == 1
        assert len(scenario["options"]) == 2

        display_orders = [
            option["display_order"]
            for option in scenario["options"]
        ]

        assert display_orders == sorted(display_orders)
        assert display_orders == [0, 1]

    return scenarios


def submit_response(
    client: TestClient,
    *,
    session_id: str,
    scenario: dict[str, Any],
    option_index: int = 0,
    confidence: int = 75,
    response_time_ms: int = 1200,
):
    """Submit one response for a scenario."""

    return client.post(
        f"/api/v1/sessions/{session_id}/responses",
        json={
            "scenario_id": scenario["id"],
            "selected_option_id": (
                scenario["options"][option_index]["id"]
            ),
            "confidence": confidence,
            "response_time_ms": response_time_ms,
        },
    )


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"consent": False},
    ],
)
def test_participant_requires_explicit_consent(
    api_client: TestClient,
    payload: dict[str, object],
) -> None:
    """A participant must explicitly consent before registration."""

    response = api_client.post(
        "/api/v1/participants",
        json=payload,
    )

    assert response.status_code == 422


def test_participant_session_and_scenario_retrieval(
    api_client: TestClient,
) -> None:
    """
    Register a participant, start a session, and retrieve scenarios.
    """

    participant = register_participant(api_client)

    study_session = start_session(
        api_client,
        participant_id=participant["id"],
    )

    get_scenarios(api_client)

    detail_response = api_client.get(
        f"/api/v1/sessions/{study_session['id']}",
    )

    assert detail_response.status_code == 200

    session_detail = detail_response.json()

    assert session_detail["id"] == study_session["id"]
    assert session_detail["status"] == "started"
    assert session_detail["responses"] == []


def test_unknown_participant_cannot_start_session(
    api_client: TestClient,
) -> None:
    """A session cannot be created for a missing participant."""

    response = api_client.post(
        "/api/v1/sessions",
        json={
            "participant_id": str(uuid4()),
        },
    )

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Participant was not found.",
    }


@pytest.mark.parametrize(
    ("field_name", "invalid_value"),
    [
        ("confidence", -1),
        ("confidence", 101),
        ("response_time_ms", -1),
    ],
)
def test_invalid_response_payload_is_rejected(
    api_client: TestClient,
    field_name: str,
    invalid_value: int,
) -> None:
    """Pydantic rejects invalid response measurements."""

    participant = register_participant(api_client)

    study_session = start_session(
        api_client,
        participant_id=participant["id"],
    )

    scenario = get_scenarios(api_client)[0]

    payload = {
        "scenario_id": scenario["id"],
        "selected_option_id": scenario["options"][0]["id"],
        "confidence": 75,
        "response_time_ms": 1200,
    }

    payload[field_name] = invalid_value

    response = api_client.post(
        (
            f"/api/v1/sessions/"
            f"{study_session['id']}/responses"
        ),
        json=payload,
    )

    assert response.status_code == 422


def test_option_from_another_scenario_is_rejected(
    api_client: TestClient,
) -> None:
    """An option cannot be submitted for the wrong scenario."""

    participant = register_participant(api_client)

    study_session = start_session(
        api_client,
        participant_id=participant["id"],
    )

    scenarios = get_scenarios(api_client)

    first_scenario = scenarios[0]
    second_scenario = scenarios[1]

    response = api_client.post(
        (
            f"/api/v1/sessions/"
            f"{study_session['id']}/responses"
        ),
        json={
            "scenario_id": first_scenario["id"],
            "selected_option_id": (
                second_scenario["options"][0]["id"]
            ),
            "confidence": 60,
            "response_time_ms": 900,
        },
    )

    assert response.status_code == 422
    assert response.json() == {
        "detail": (
            "The selected option does not belong "
            "to the scenario."
        ),
    }


def test_duplicate_response_is_rejected(
    api_client: TestClient,
) -> None:
    """A session can answer a scenario only once."""

    participant = register_participant(api_client)

    study_session = start_session(
        api_client,
        participant_id=participant["id"],
    )

    scenario = get_scenarios(api_client)[0]

    first_response = submit_response(
        api_client,
        session_id=study_session["id"],
        scenario=scenario,
    )

    assert first_response.status_code == 201

    duplicate_response = submit_response(
        api_client,
        session_id=study_session["id"],
        scenario=scenario,
        option_index=1,
    )

    assert duplicate_response.status_code == 409
    assert duplicate_response.json() == {
        "detail": (
            "A response for this scenario already exists."
        ),
    }


def test_incomplete_session_cannot_be_completed(
    api_client: TestClient,
) -> None:
    """Every active scenario must be answered before completion."""

    participant = register_participant(api_client)

    study_session = start_session(
        api_client,
        participant_id=participant["id"],
    )

    scenarios = get_scenarios(api_client)

    response = submit_response(
        api_client,
        session_id=study_session["id"],
        scenario=scenarios[0],
    )

    assert response.status_code == 201

    completion_response = api_client.post(
        (
            f"/api/v1/sessions/"
            f"{study_session['id']}/complete"
        ),
    )

    assert completion_response.status_code == 409
    assert completion_response.json() == {
        "detail": (
            "The session has 2 unanswered "
            "active scenario(s)."
        ),
    }


def test_complete_study_workflow_and_completed_restrictions(
    api_client: TestClient,
) -> None:
    """
    Complete the full study and enforce completed-session restrictions.
    """

    participant = register_participant(api_client)

    study_session = start_session(
        api_client,
        participant_id=participant["id"],
    )

    scenarios = get_scenarios(api_client)

    for index, scenario in enumerate(scenarios):
        response = submit_response(
            api_client,
            session_id=study_session["id"],
            scenario=scenario,
            option_index=index % 2,
            confidence=70 + index,
            response_time_ms=1000 + (index * 100),
        )

        assert response.status_code == 201

        stored_response = response.json()

        assert stored_response["session_id"] == study_session["id"]
        assert stored_response["scenario_id"] == scenario["id"]
        assert stored_response["confidence"] == 70 + index

    detail_before_completion = api_client.get(
        f"/api/v1/sessions/{study_session['id']}",
    )

    assert detail_before_completion.status_code == 200
    assert len(
        detail_before_completion.json()["responses"],
    ) == 3

    completion_response = api_client.post(
        (
            f"/api/v1/sessions/"
            f"{study_session['id']}/complete"
        ),
    )

    assert completion_response.status_code == 200

    completion = completion_response.json()

    assert completion["id"] == study_session["id"]
    assert completion["status"] == "completed"
    assert completion["completed_at"] is not None
    assert completion["response_count"] == 3

    # Completed sessions cannot accept another response.
    extra_response = submit_response(
        api_client,
        session_id=study_session["id"],
        scenario=scenarios[0],
    )

    assert extra_response.status_code == 409
    assert extra_response.json() == {
        "detail": (
            "Responses can only be submitted "
            "to a started session."
        ),
    }

    # Completed sessions cannot be completed a second time.
    second_completion = api_client.post(
        (
            f"/api/v1/sessions/"
            f"{study_session['id']}/complete"
        ),
    )

    assert second_completion.status_code == 409
    assert second_completion.json() == {
        "detail": (
            "Only a started session can be completed."
        ),
    }

    detail_after_completion = api_client.get(
        f"/api/v1/sessions/{study_session['id']}",
    )

    assert detail_after_completion.status_code == 200

    completed_session = detail_after_completion.json()

    assert completed_session["status"] == "completed"
    assert completed_session["completed_at"] is not None
    assert len(completed_session["responses"]) == 3