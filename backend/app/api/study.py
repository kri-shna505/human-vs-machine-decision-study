from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_database_session
from app.schemas import (
    HumanResponseCreate,
    HumanResponseRead,
    ParticipantCreate,
    ParticipantRead,
    ScenarioRead,
    StudySessionCompleteRead,
    StudySessionCreate,
    StudySessionDetail,
    StudySessionRead,
)
from app.services import (
    complete_study_session,
    get_public_scenarios,
    get_study_session_detail,
    register_anonymous_participant,
    start_study_session,
    submit_human_response,
)


router = APIRouter(
    prefix="/api/v1",
    tags=["Study"],
)


DatabaseSession = Annotated[
    Session,
    Depends(get_database_session),
]


@router.get(
    "/scenarios",
    response_model=list[ScenarioRead],
    status_code=status.HTTP_200_OK,
    summary="List active study scenarios",
)
def list_scenarios(
    database_session: DatabaseSession,
) -> list[ScenarioRead]:
    """
    Return every active decision-making scenario.

    Scenario options are returned in display order.
    """

    scenarios = get_public_scenarios(database_session)

    return [
        ScenarioRead.model_validate(scenario)
        for scenario in scenarios
    ]


@router.post(
    "/participants",
    response_model=ParticipantRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register an anonymous participant",
)
def create_participant(
    _payload: ParticipantCreate,
    database_session: DatabaseSession,
) -> ParticipantRead:
    """
    Register an anonymous participant after consent is confirmed.

    ParticipantCreate accepts only consent=true, so no participant is
    created when consent is absent or false.
    """

    participant = register_anonymous_participant(
        database_session,
    )

    return ParticipantRead.model_validate(participant)


@router.post(
    "/sessions",
    response_model=StudySessionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Start a study session",
)
def create_session(
    payload: StudySessionCreate,
    database_session: DatabaseSession,
) -> StudySessionRead:
    """Start a new study session for an existing participant."""

    study_session = start_study_session(
        database_session,
        participant_id=payload.participant_id,
    )

    return StudySessionRead.model_validate(study_session)


@router.get(
    "/sessions/{session_id}",
    response_model=StudySessionDetail,
    status_code=status.HTTP_200_OK,
    summary="Get study session details",
)
def get_session(
    session_id: UUID,
    database_session: DatabaseSession,
) -> StudySessionDetail:
    """Return one study session and its submitted responses."""

    study_session = get_study_session_detail(
        database_session,
        session_id=session_id,
    )

    return StudySessionDetail.model_validate(study_session)


@router.post(
    "/sessions/{session_id}/responses",
    response_model=HumanResponseRead,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a scenario response",
)
def create_response(
    session_id: UUID,
    payload: HumanResponseCreate,
    database_session: DatabaseSession,
) -> HumanResponseRead:
    """Submit one response for a scenario in a started session."""

    response = submit_human_response(
        database_session,
        session_id=session_id,
        scenario_id=payload.scenario_id,
        selected_option_id=payload.selected_option_id,
        confidence=payload.confidence,
        response_time_ms=payload.response_time_ms,
    )

    return HumanResponseRead.model_validate(response)


@router.post(
    "/sessions/{session_id}/complete",
    response_model=StudySessionCompleteRead,
    status_code=status.HTTP_200_OK,
    summary="Complete a study session",
)
def complete_session(
    session_id: UUID,
    database_session: DatabaseSession,
) -> StudySessionCompleteRead:
    """
    Complete a study session after every active scenario is answered.
    """

    result = complete_study_session(
        database_session,
        session_id=session_id,
    )

    return StudySessionCompleteRead(
        id=result.study_session.id,
        status="completed",
        completed_at=result.study_session.completed_at,
        response_count=result.response_count,
    )