from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class OrmSchema(BaseModel):
    """
    Base schema that allows Pydantic to read SQLAlchemy model attributes.
    """

    model_config = ConfigDict(from_attributes=True)


class ScenarioOptionRead(OrmSchema):
    """One selectable option belonging to a study scenario."""

    id: UUID
    code: str
    label: str
    display_order: int


class ScenarioRead(OrmSchema):
    """Public representation of an active study scenario."""

    id: UUID
    slug: str
    version: int
    title: str
    category: str
    prompt: str
    options: list[ScenarioOptionRead]


class ParticipantCreate(BaseModel):
    """
    Request used to create an anonymous participant.

    The API accepts only an explicit true value. A false value is rejected
    before any participant record is created.
    """

    consent: Literal[True]


class ParticipantRead(OrmSchema):
    """Anonymous participant returned by the API."""

    id: UUID
    participant_code: str
    consented_at: datetime
    created_at: datetime


class StudySessionCreate(BaseModel):
    """Request used to start a study session for one participant."""

    participant_id: UUID


class StudySessionRead(OrmSchema):
    """Study session returned by the API."""

    id: UUID
    participant_id: UUID
    status: str
    randomization_seed: int
    started_at: datetime
    completed_at: datetime | None
    created_at: datetime


class HumanResponseCreate(BaseModel):
    """Answer submitted for one scenario during a study session."""

    scenario_id: UUID
    selected_option_id: UUID

    confidence: int = Field(
        ge=0,
        le=100,
        description="Participant confidence from 0 to 100.",
    )

    response_time_ms: int = Field(
        ge=0,
        description="Time taken to answer, measured in milliseconds.",
    )


class HumanResponseRead(OrmSchema):
    """Stored participant response returned by the API."""

    id: UUID
    session_id: UUID
    scenario_id: UUID
    selected_option_id: UUID
    confidence: int
    response_time_ms: int
    answered_at: datetime


class StudySessionDetail(StudySessionRead):
    """Study session with all responses already submitted."""

    responses: list[HumanResponseRead] = Field(default_factory=list)


class StudySessionCompleteRead(OrmSchema):
    """Result returned after completing a study session."""

    id: UUID
    status: Literal["completed"]
    completed_at: datetime
    response_count: int
