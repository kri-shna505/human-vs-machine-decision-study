from collections.abc import Iterator
from decimal import Decimal

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import Base, engine
from app.models import (
    HumanResponse,
    MachinePrediction,
    Participant,
    Scenario,
    ScenarioOption,
    StudySession,
)

EXPECTED_TABLES = {
    "human_responses",
    "machine_predictions",
    "participants",
    "scenario_options",
    "scenarios",
    "study_sessions",
}


@pytest.fixture
def db_session() -> Iterator[Session]:
    """
    Provide an isolated database session for one test.

    The outer transaction is always rolled back, so test data does not
    remain in the local PostgreSQL database.
    """

    connection = engine.connect()
    outer_transaction = connection.begin()

    session = Session(
        bind=connection,
        join_transaction_mode="create_savepoint",
    )

    try:
        yield session
    finally:
        session.close()

        if outer_transaction.is_active:
            outer_transaction.rollback()

        connection.close()


def create_participant(
    session: Session,
    *,
    code: str = "participant-001",
) -> Participant:
    """Create and flush one anonymous participant."""

    participant = Participant(participant_code=code)

    session.add(participant)
    session.flush()

    return participant


def create_scenario(
    session: Session,
    *,
    slug: str = "test-conjunction-fallacy",
    version: int = 1,
) -> tuple[Scenario, ScenarioOption, ScenarioOption]:
    """Create one scenario with two selectable options."""

    scenario = Scenario(
        slug=slug,
        version=version,
        title="Conjunction Fallacy",
        category="probability-estimation",
        prompt="Which statement is more likely?",
    )

    option_a = ScenarioOption(
        scenario=scenario,
        code="A",
        label="The broader event",
        display_order=0,
    )

    option_b = ScenarioOption(
        scenario=scenario,
        code="B",
        label="The detailed conjunction",
        display_order=1,
    )

    session.add_all([scenario, option_a, option_b])
    session.flush()

    return scenario, option_a, option_b


def create_study_session(
    session: Session,
    *,
    participant: Participant,
) -> StudySession:
    """Create one active study session."""

    study_session = StudySession(
        participant=participant,
        randomization_seed=123456,
    )

    session.add(study_session)
    session.flush()

    return study_session


def test_all_study_tables_are_registered() -> None:
    """All six ORM tables must be present in Base.metadata."""

    assert set(Base.metadata.tables) == EXPECTED_TABLES


def test_duplicate_participant_codes_fail(
    db_session: Session,
) -> None:
    """Participant codes must remain unique."""

    create_participant(
        db_session,
        code="duplicate-code",
    )

    duplicate = Participant(
        participant_code="duplicate-code",
    )

    db_session.add(duplicate)

    with pytest.raises(IntegrityError):
        db_session.flush()

    db_session.rollback()


def test_duplicate_scenario_slug_and_version_fail(
    db_session: Session,
) -> None:
    """The same scenario slug and version cannot be inserted twice."""

    create_scenario(
        db_session,
        slug="test-framing-effect",
        version=1,
    )

    duplicate = Scenario(
        slug="test-framing-effect",
        version=1,
        title="Duplicate framing scenario",
        category="contextual-bias",
        prompt="Duplicate prompt",
    )

    db_session.add(duplicate)

    with pytest.raises(IntegrityError):
        db_session.flush()

    db_session.rollback()


@pytest.mark.parametrize("confidence", [-1, 101])
def test_invalid_human_confidence_values_fail(
    db_session: Session,
    confidence: int,
) -> None:
    """Human confidence must remain between 0 and 100."""

    participant = create_participant(db_session)
    scenario, option_a, _ = create_scenario(db_session)

    study_session = create_study_session(
        db_session,
        participant=participant,
    )

    response = HumanResponse(
        session_id=study_session.id,
        scenario_id=scenario.id,
        selected_option_id=option_a.id,
        confidence=confidence,
        response_time_ms=1500,
    )

    db_session.add(response)

    with pytest.raises(IntegrityError):
        db_session.flush()

    db_session.rollback()


def test_negative_response_time_fails(
    db_session: Session,
) -> None:
    """Response time cannot be negative."""

    participant = create_participant(db_session)
    scenario, option_a, _ = create_scenario(db_session)

    study_session = create_study_session(
        db_session,
        participant=participant,
    )

    response = HumanResponse(
        session_id=study_session.id,
        scenario_id=scenario.id,
        selected_option_id=option_a.id,
        confidence=75,
        response_time_ms=-1,
    )

    db_session.add(response)

    with pytest.raises(IntegrityError):
        db_session.flush()

    db_session.rollback()


def test_duplicate_session_scenario_responses_fail(
    db_session: Session,
) -> None:
    """A session may submit only one response per scenario."""

    participant = create_participant(db_session)
    scenario, option_a, option_b = create_scenario(db_session)

    study_session = create_study_session(
        db_session,
        participant=participant,
    )

    first_response = HumanResponse(
        session_id=study_session.id,
        scenario_id=scenario.id,
        selected_option_id=option_a.id,
        confidence=80,
        response_time_ms=1200,
    )

    db_session.add(first_response)
    db_session.flush()

    duplicate_response = HumanResponse(
        session_id=study_session.id,
        scenario_id=scenario.id,
        selected_option_id=option_b.id,
        confidence=60,
        response_time_ms=1800,
    )

    db_session.add(duplicate_response)

    with pytest.raises(IntegrityError):
        db_session.flush()

    db_session.rollback()


def test_option_from_another_scenario_fails(
    db_session: Session,
) -> None:
    """
    The selected option must belong to the scenario being answered.
    """

    participant = create_participant(db_session)

    first_scenario, _, _ = create_scenario(
        db_session,
        slug="first-scenario",
    )

    _, second_option, _ = create_scenario(
        db_session,
        slug="second-scenario",
    )

    study_session = create_study_session(
        db_session,
        participant=participant,
    )

    invalid_response = HumanResponse(
        session_id=study_session.id,
        scenario_id=first_scenario.id,
        selected_option_id=second_option.id,
        confidence=50,
        response_time_ms=1000,
    )

    db_session.add(invalid_response)

    with pytest.raises(IntegrityError):
        db_session.flush()

    db_session.rollback()


@pytest.mark.parametrize(
    "confidence",
    [
        Decimal("-0.0001"),
        Decimal("1.0001"),
    ],
)
def test_invalid_machine_confidence_values_fail(
    db_session: Session,
    confidence: Decimal,
) -> None:
    """Machine confidence must remain between 0 and 1."""

    scenario, option_a, _ = create_scenario(db_session)

    prediction = MachinePrediction(
        scenario_id=scenario.id,
        selected_option_id=option_a.id,
        model_name="baseline-model",
        model_version="1.0.0",
        confidence=confidence,
        raw_output={"source": "test"},
    )

    db_session.add(prediction)

    with pytest.raises(IntegrityError):
        db_session.flush()

    db_session.rollback()


def test_duplicate_machine_predictions_fail(
    db_session: Session,
) -> None:
    """
    One model version may create only one prediction per scenario.
    """

    scenario, option_a, option_b = create_scenario(db_session)

    first_prediction = MachinePrediction(
        scenario_id=scenario.id,
        selected_option_id=option_a.id,
        model_name="baseline-model",
        model_version="1.0.0",
        confidence=Decimal("0.7500"),
        raw_output={"choice": "A"},
    )

    db_session.add(first_prediction)
    db_session.flush()

    duplicate_prediction = MachinePrediction(
        scenario_id=scenario.id,
        selected_option_id=option_b.id,
        model_name="baseline-model",
        model_version="1.0.0",
        confidence=Decimal("0.6500"),
        raw_output={"choice": "B"},
    )

    db_session.add(duplicate_prediction)

    with pytest.raises(IntegrityError):
        db_session.flush()

    db_session.rollback()
