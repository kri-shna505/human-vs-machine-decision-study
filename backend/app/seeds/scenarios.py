from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID, uuid5

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import engine
from app.models import Scenario, ScenarioOption

# Fixed UUID namespace used to produce stable IDs in every environment.
SEED_NAMESPACE = UUID("a597be37-d810-4c55-8685-66ec6b817631")


@dataclass(frozen=True)
class OptionSeed:
    """Deterministic definition of one scenario option."""

    code: str
    label: str
    display_order: int


@dataclass(frozen=True)
class ScenarioSeed:
    """Deterministic definition of one baseline scenario."""

    slug: str
    version: int
    title: str
    category: str
    prompt: str
    options: tuple[OptionSeed, ...]


@dataclass(frozen=True)
class SeedSummary:
    """Summary returned after synchronizing baseline scenarios."""

    scenario_count: int
    option_count: int
    created_scenarios: int
    created_options: int


BASELINE_SCENARIOS: tuple[ScenarioSeed, ...] = (
    ScenarioSeed(
        slug="conjunction-fallacy",
        version=1,
        title="Conjunction Fallacy",
        category="probability-estimation",
        prompt=(
            "Asha is 31 years old, analytical, socially engaged, and "
            "concerned about environmental issues. Which statement is "
            "more probable?"
        ),
        options=(
            OptionSeed(
                code="A",
                label="Asha works as a bank teller.",
                display_order=0,
            ),
            OptionSeed(
                code="B",
                label=(
                    "Asha works as a bank teller and volunteers for an "
                    "environmental organization."
                ),
                display_order=1,
            ),
        ),
    ),
    ScenarioSeed(
        slug="framing-effect",
        version=1,
        title="Framing Effect",
        category="contextual-bias",
        prompt=(
            "A public-health emergency is expected to affect 600 people. "
            "Which response program would you choose?"
        ),
        options=(
            OptionSeed(
                code="A",
                label="A program that will save 200 people.",
                display_order=0,
            ),
            OptionSeed(
                code="B",
                label=(
                    "A program with a one-third probability of saving all "
                    "600 people and a two-thirds probability of saving no one."
                ),
                display_order=1,
            ),
        ),
    ),
    ScenarioSeed(
        slug="risk-preference",
        version=1,
        title="Risk Preference",
        category="expected-value",
        prompt=(
            "Choose one of the following payment options. Assume the "
            "random outcome is fair and independently determined."
        ),
        options=(
            OptionSeed(
                code="A",
                label="Receive $40 with certainty.",
                display_order=0,
            ),
            OptionSeed(
                code="B",
                label=(
                    "Receive $100 with a 50% probability and $0 with a 50% probability."
                ),
                display_order=1,
            ),
        ),
    ),
)


def _scenario_uuid(seed: ScenarioSeed) -> UUID:
    """Return the stable UUID for a baseline scenario."""

    name = f"scenario:{seed.slug}:version:{seed.version}"

    return uuid5(SEED_NAMESPACE, name)


def _option_uuid(
    scenario_seed: ScenarioSeed,
    option_seed: OptionSeed,
) -> UUID:
    """Return the stable UUID for one baseline scenario option."""

    name = (
        f"scenario:{scenario_seed.slug}:"
        f"version:{scenario_seed.version}:"
        f"option:{option_seed.code}"
    )

    return uuid5(SEED_NAMESPACE, name)


def _get_existing_scenario(
    database_session: Session,
    seed: ScenarioSeed,
) -> Scenario | None:
    """Load an existing scenario and its options by slug and version."""

    statement = (
        select(Scenario)
        .where(
            Scenario.slug == seed.slug,
            Scenario.version == seed.version,
        )
        .options(selectinload(Scenario.options))
    )

    return database_session.scalar(statement)


def _validate_existing_option_codes(
    scenario: Scenario,
    seed: ScenarioSeed,
) -> None:
    """
    Refuse to silently remove unexpected options.

    Removing an option could invalidate existing participant responses.
    A baseline-definition change should therefore be handled explicitly.
    """

    expected_codes = {option.code for option in seed.options}

    existing_codes = {option.code for option in scenario.options}

    unexpected_codes = existing_codes - expected_codes

    if unexpected_codes:
        formatted_codes = ", ".join(sorted(unexpected_codes))

        raise RuntimeError(
            f"Scenario '{seed.slug}' contains unexpected option code(s): "
            f"{formatted_codes}. Resolve them before running the seed again."
        )


def _synchronize_options(
    database_session: Session,
    *,
    scenario: Scenario,
    scenario_seed: ScenarioSeed,
) -> int:
    """Create or update every expected option for one scenario."""

    _validate_existing_option_codes(
        scenario,
        scenario_seed,
    )

    existing_options = {option.code: option for option in scenario.options}

    created_options = 0

    # Move existing options temporarily out of the final display-order range.
    # This prevents unique-constraint collisions if their order has changed.
    temporary_order_start = (
        max(
            (option.display_order for option in scenario.options),
            default=0,
        )
        + 1000
    )

    for index, option in enumerate(scenario.options):
        option.display_order = temporary_order_start + index

    if scenario.options:
        database_session.flush()

    for option_seed in scenario_seed.options:
        option = existing_options.get(option_seed.code)

        if option is None:
            option = ScenarioOption(
                id=_option_uuid(
                    scenario_seed,
                    option_seed,
                ),
                scenario=scenario,
                code=option_seed.code,
                label=option_seed.label,
                display_order=option_seed.display_order,
            )

            database_session.add(option)
            created_options += 1
        else:
            option.label = option_seed.label
            option.display_order = option_seed.display_order

    database_session.flush()

    return created_options


def seed_baseline_scenarios(
    database_session: Session,
) -> SeedSummary:
    """
    Create or synchronize all Phase 1 baseline scenarios.

    This function flushes database changes but does not commit them.
    The caller owns the surrounding transaction.
    """

    created_scenarios = 0
    created_options = 0
    option_count = 0

    for seed in BASELINE_SCENARIOS:
        scenario = _get_existing_scenario(
            database_session,
            seed,
        )

        if scenario is None:
            scenario = Scenario(
                id=_scenario_uuid(seed),
                slug=seed.slug,
                version=seed.version,
                title=seed.title,
                category=seed.category,
                prompt=seed.prompt,
                is_active=True,
            )

            database_session.add(scenario)
            database_session.flush()

            created_scenarios += 1
        else:
            scenario.title = seed.title
            scenario.category = seed.category
            scenario.prompt = seed.prompt
            scenario.is_active = True

        created_options += _synchronize_options(
            database_session,
            scenario=scenario,
            scenario_seed=seed,
        )

        option_count += len(seed.options)

    database_session.flush()

    return SeedSummary(
        scenario_count=len(BASELINE_SCENARIOS),
        option_count=option_count,
        created_scenarios=created_scenarios,
        created_options=created_options,
    )


def main() -> None:
    """Run the baseline scenario seed from the command line."""

    with Session(engine) as database_session:
        with database_session.begin():
            summary = seed_baseline_scenarios(
                database_session,
            )

    print(
        "Baseline scenarios synchronized: "
        f"{summary.scenario_count} scenario(s), "
        f"{summary.option_count} option(s)."
    )

    print(
        "New records created: "
        f"{summary.created_scenarios} scenario(s), "
        f"{summary.created_options} option(s)."
    )


if __name__ == "__main__":
    main()
