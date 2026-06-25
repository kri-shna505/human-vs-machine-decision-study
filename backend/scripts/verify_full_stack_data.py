"""Validate records written by the full-stack browser tests."""

from sqlalchemy import func, select

from app.database import SessionLocal
from app.models import HumanResponse, Scenario, StudySession


def _count(database_session, model) -> int:
    statement = select(func.count(model.id)).select_from(model)
    return int(database_session.scalar(statement) or 0)


def main() -> None:
    with SessionLocal() as database_session:
        scenario_count = _count(database_session, Scenario)
        response_count = _count(database_session, HumanResponse)

        latest_completed_session = database_session.scalar(
            select(StudySession)
            .where(StudySession.status == "completed")
            .order_by(StudySession.completed_at.desc())
            .limit(1)
        )

        if scenario_count != 3:
            raise RuntimeError(
                "Expected exactly 3 seeded scenarios, "
                f"found {scenario_count}."
            )

        if latest_completed_session is None:
            raise RuntimeError(
                "No completed study session was persisted."
            )

        completed_response_count = int(
            database_session.scalar(
                select(func.count(HumanResponse.id)).where(
                    HumanResponse.session_id
                    == latest_completed_session.id
                )
            )
            or 0
        )

        if completed_response_count != scenario_count:
            raise RuntimeError(
                "Completed session does not contain one response "
                "for every seeded scenario."
            )

        if response_count < scenario_count:
            raise RuntimeError(
                "The database contains fewer responses than the "
                "completed journey requires."
            )

    print(
        "Full-stack database verification passed: "
        f"{scenario_count} scenarios and "
        f"{completed_response_count} responses in the latest "
        "completed session."
    )


if __name__ == "__main__":
    main()
