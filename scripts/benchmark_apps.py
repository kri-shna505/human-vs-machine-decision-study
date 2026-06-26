#!/usr/bin/env python3
"""Validate and score the four-application benchmark evidence."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

VALID_STATUSES = {"pending", "complete"}
STRONG_EVIDENCE_TYPES = {
    "automated_test",
    "ci_run",
    "audit_report",
    "deployment",
}


class BenchmarkError(ValueError):
    """Raised when benchmark configuration or evidence is invalid."""


@dataclass(frozen=True)
class CriterionDefinition:
    category_id: str
    category_label: str
    category_weight: float
    category_criterion_count: int
    criterion_id: str
    criterion_label: str


@dataclass(frozen=True)
class ApplicationResult:
    application_id: str
    label: str
    builder: str
    status: str
    total_score: float | None
    category_scores: dict[str, float]
    criterion_scores: dict[str, int]
    notes: str


def load_json(path: Path) -> dict[str, Any]:
    try:
        with path.open("r", encoding="utf-8") as file:
            value = json.load(file)
    except FileNotFoundError as error:
        raise BenchmarkError(f"Missing JSON file: {path}") from error
    except json.JSONDecodeError as error:
        raise BenchmarkError(
            f"Invalid JSON in {path}: line {error.lineno}, "
            f"column {error.colno}: {error.msg}"
        ) from error

    if not isinstance(value, dict):
        raise BenchmarkError(f"Expected an object in {path}")

    return value


def build_criterion_index(
    rubric: dict[str, Any],
) -> tuple[dict[str, CriterionDefinition], list[dict[str, Any]]]:
    categories = rubric.get("categories")

    if not isinstance(categories, list) or not categories:
        raise BenchmarkError("Rubric must define at least one category")

    criterion_index: dict[str, CriterionDefinition] = {}
    total_weight = 0.0

    for category in categories:
        if not isinstance(category, dict):
            raise BenchmarkError("Each rubric category must be an object")

        category_id = category.get("id")
        category_label = category.get("label")
        category_weight = category.get("weight")
        criteria = category.get("criteria")

        if not isinstance(category_id, str) or not category_id:
            raise BenchmarkError("Each category requires a non-empty id")
        if not isinstance(category_label, str) or not category_label:
            raise BenchmarkError(
                f"Category {category_id!r} requires a label"
            )
        if not isinstance(category_weight, (int, float)):
            raise BenchmarkError(
                f"Category {category_id!r} requires a numeric weight"
            )
        if category_weight <= 0:
            raise BenchmarkError(
                f"Category {category_id!r} weight must be positive"
            )
        if not isinstance(criteria, list) or not criteria:
            raise BenchmarkError(
                f"Category {category_id!r} requires criteria"
            )

        total_weight += float(category_weight)

        for criterion in criteria:
            if not isinstance(criterion, dict):
                raise BenchmarkError(
                    f"Category {category_id!r} has a non-object criterion"
                )

            criterion_id = criterion.get("id")
            criterion_label = criterion.get("label")

            if not isinstance(criterion_id, str) or not criterion_id:
                raise BenchmarkError(
                    f"Category {category_id!r} has a criterion without an id"
                )
            if criterion_id in criterion_index:
                raise BenchmarkError(
                    f"Duplicate criterion id: {criterion_id}"
                )
            if not isinstance(criterion_label, str) or not criterion_label:
                raise BenchmarkError(
                    f"Criterion {criterion_id!r} requires a label"
                )

            criterion_index[criterion_id] = CriterionDefinition(
                category_id=category_id,
                category_label=category_label,
                category_weight=float(category_weight),
                category_criterion_count=len(criteria),
                criterion_id=criterion_id,
                criterion_label=criterion_label,
            )

    if abs(total_weight - 100.0) > 0.0001:
        raise BenchmarkError(
            f"Rubric category weights must total 100, found {total_weight:g}"
        )

    return criterion_index, categories


def validate_evidence_entry(
    *,
    application_id: str,
    criterion_id: str,
    evidence: Any,
    allowed_evidence_types: set[str],
) -> list[dict[str, str]]:
    if not isinstance(evidence, list):
        raise BenchmarkError(
            f"{application_id}/{criterion_id}: evidence must be a list"
        )

    validated: list[dict[str, str]] = []

    for index, entry in enumerate(evidence):
        if not isinstance(entry, dict):
            raise BenchmarkError(
                f"{application_id}/{criterion_id}: "
                f"evidence entry {index} must be an object"
            )

        evidence_type = entry.get("type")
        reference = entry.get("reference")
        claim = entry.get("claim")

        if evidence_type not in allowed_evidence_types:
            raise BenchmarkError(
                f"{application_id}/{criterion_id}: unsupported evidence "
                f"type {evidence_type!r}"
            )
        if not isinstance(reference, str) or not reference.strip():
            raise BenchmarkError(
                f"{application_id}/{criterion_id}: evidence reference "
                "must be non-empty"
            )
        if not isinstance(claim, str) or not claim.strip():
            raise BenchmarkError(
                f"{application_id}/{criterion_id}: evidence claim "
                "must be non-empty"
            )

        validated.append(
            {
                "type": evidence_type,
                "reference": reference.strip(),
                "claim": claim.strip(),
            }
        )

    return validated


def evaluate_application(
    *,
    application: dict[str, Any],
    evidence: dict[str, Any],
    criterion_index: dict[str, CriterionDefinition],
    categories: list[dict[str, Any]],
    allowed_evidence_types: set[str],
) -> ApplicationResult:
    application_id = application.get("id")
    label = application.get("label")
    builder = application.get("builder")

    if evidence.get("application_id") != application_id:
        raise BenchmarkError(
            f"Evidence application_id mismatch for {application_id!r}"
        )

    status = evidence.get("status")

    if status not in VALID_STATUSES:
        raise BenchmarkError(
            f"{application_id}: status must be pending or complete"
        )

    evaluation = evidence.get("evaluation", {})
    notes = evaluation.get("notes", "") if isinstance(evaluation, dict) else ""

    if status == "pending":
        criteria = evidence.get("criteria")
        if criteria not in ({}, None):
            raise BenchmarkError(
                f"{application_id}: pending evidence must not contain scores"
            )

        return ApplicationResult(
            application_id=application_id,
            label=label,
            builder=builder,
            status=status,
            total_score=None,
            category_scores={},
            criterion_scores={},
            notes=notes,
        )

    criteria = evidence.get("criteria")

    if not isinstance(criteria, dict):
        raise BenchmarkError(
            f"{application_id}: complete evidence requires criteria"
        )

    expected_ids = set(criterion_index)
    actual_ids = set(criteria)

    missing = sorted(expected_ids - actual_ids)
    unexpected = sorted(actual_ids - expected_ids)

    if missing:
        raise BenchmarkError(
            f"{application_id}: missing criteria: {', '.join(missing)}"
        )
    if unexpected:
        raise BenchmarkError(
            f"{application_id}: unexpected criteria: "
            f"{', '.join(unexpected)}"
        )

    criterion_scores: dict[str, int] = {}

    for criterion_id, definition in criterion_index.items():
        record = criteria[criterion_id]

        if not isinstance(record, dict):
            raise BenchmarkError(
                f"{application_id}/{criterion_id}: record must be an object"
            )

        score = record.get("score")

        if not isinstance(score, int) or isinstance(score, bool):
            raise BenchmarkError(
                f"{application_id}/{criterion_id}: score must be an integer"
            )
        if score < 0 or score > 4:
            raise BenchmarkError(
                f"{application_id}/{criterion_id}: score must be 0 through 4"
            )

        validated_evidence = validate_evidence_entry(
            application_id=application_id,
            criterion_id=criterion_id,
            evidence=record.get("evidence", []),
            allowed_evidence_types=allowed_evidence_types,
        )

        if score > 0 and not validated_evidence:
            raise BenchmarkError(
                f"{application_id}/{criterion_id}: a score above zero "
                "requires evidence"
            )

        if score == 4 and not any(
            entry["type"] in STRONG_EVIDENCE_TYPES
            for entry in validated_evidence
        ):
            raise BenchmarkError(
                f"{application_id}/{criterion_id}: score 4 requires "
                "automated, CI, audit, or deployment evidence"
            )

        criterion_scores[criterion_id] = score

    category_scores: dict[str, float] = {}
    total_score = 0.0

    for category in categories:
        category_id = category["id"]
        category_weight = float(category["weight"])
        category_criterion_ids = [
            criterion["id"] for criterion in category["criteria"]
        ]
        category_average = sum(
            criterion_scores[criterion_id]
            for criterion_id in category_criterion_ids
        ) / len(category_criterion_ids)
        weighted_score = category_average / 4.0 * category_weight

        category_scores[category_id] = weighted_score
        total_score += weighted_score

    return ApplicationResult(
        application_id=application_id,
        label=label,
        builder=builder,
        status=status,
        total_score=round(total_score, 2),
        category_scores={
            category_id: round(score, 2)
            for category_id, score in category_scores.items()
        },
        criterion_scores=criterion_scores,
        notes=notes,
    )


def evaluate_benchmark(
    *,
    rubric: dict[str, Any],
    applications: dict[str, Any],
    evidence_dir: Path,
) -> tuple[list[ApplicationResult], list[dict[str, Any]]]:
    rubric_id = rubric.get("benchmark_id")
    applications_id = applications.get("benchmark_id")

    if rubric_id != applications_id:
        raise BenchmarkError(
            "Rubric and application manifest benchmark_id values differ"
        )

    criterion_index, categories = build_criterion_index(rubric)

    evidence_types = rubric.get("evidence_types")
    if not isinstance(evidence_types, list) or not all(
        isinstance(value, str) for value in evidence_types
    ):
        raise BenchmarkError("rubric evidence_types must be a string list")

    application_records = applications.get("applications")
    if not isinstance(application_records, list):
        raise BenchmarkError("applications must be a list")
    if len(application_records) != 4:
        raise BenchmarkError(
            f"Exactly four applications are required, found "
            f"{len(application_records)}"
        )

    seen_ids: set[str] = set()
    results: list[ApplicationResult] = []

    for application in application_records:
        if not isinstance(application, dict):
            raise BenchmarkError("Each application must be an object")

        application_id = application.get("id")
        evidence_file = application.get("evidence_file")

        if not isinstance(application_id, str) or not application_id:
            raise BenchmarkError("Each application requires an id")
        if application_id in seen_ids:
            raise BenchmarkError(
                f"Duplicate application id: {application_id}"
            )
        seen_ids.add(application_id)

        if not isinstance(evidence_file, str) or not evidence_file:
            raise BenchmarkError(
                f"{application_id}: evidence_file is required"
            )

        evidence_path = Path(evidence_file)
        if not evidence_path.is_absolute():
            if evidence_path.parts[:2] == ("benchmark", "evidence"):
                evidence_path = evidence_dir / evidence_path.name
            else:
                evidence_path = evidence_dir / evidence_path

        evidence = load_json(evidence_path)

        if evidence.get("benchmark_id") != rubric_id:
            raise BenchmarkError(
                f"{application_id}: evidence benchmark_id mismatch"
            )

        results.append(
            evaluate_application(
                application=application,
                evidence=evidence,
                criterion_index=criterion_index,
                categories=categories,
                allowed_evidence_types=set(evidence_types),
            )
        )

    return results, categories


def format_score(score: float | None) -> str:
    return "Pending" if score is None else f"{score:.2f}"


def render_report(
    *,
    rubric: dict[str, Any],
    applications: dict[str, Any],
    results: list[ApplicationResult],
    categories: list[dict[str, Any]],
) -> str:
    complete_results = [
        result for result in results if result.status == "complete"
    ]
    all_complete = len(complete_results) == len(results)

    lines = [
        "# Four-application benchmark report",
        "",
        f"Benchmark: `{rubric['benchmark_id']}`",
        "",
        "## Benchmark state",
        "",
    ]

    if all_complete:
        lines.extend(
            [
                "**Complete.** All four applications have evidence-backed "
                "scores, so ranking is permitted.",
                "",
            ]
        )
    else:
        pending_labels = [
            result.label
            for result in results
            if result.status != "complete"
        ]
        lines.extend(
            [
                "**Incomplete. No final ranking is permitted.**",
                "",
                "Pending evidence:",
                "",
                *[f"- {label}" for label in pending_labels],
                "",
            ]
        )

    lines.extend(
        [
            "## Score summary",
            "",
            "| Application | Builder | Status | Score / 100 |",
            "|---|---|---:|---:|",
        ]
    )

    ranking = sorted(
        results,
        key=lambda result: (
            result.total_score is not None,
            result.total_score if result.total_score is not None else -1,
        ),
        reverse=True,
    )

    for result in ranking:
        lines.append(
            f"| {result.label} | {result.builder} | "
            f"{result.status.title()} | {format_score(result.total_score)} |"
        )

    lines.extend(
        [
            "",
            "## Category weights",
            "",
            "| Category | Weight |",
            "|---|---:|",
        ]
    )

    for category in categories:
        lines.append(
            f"| {category['label']} | {category['weight']} |"
        )

    for result in results:
        lines.extend(
            [
                "",
                f"## {result.label}",
                "",
                f"Status: **{result.status.title()}**",
                "",
            ]
        )

        if result.total_score is None:
            lines.extend(
                [
                    "No score is available because evidence collection is "
                    "incomplete.",
                    "",
                ]
            )
            if result.notes:
                lines.extend([result.notes, ""])
            continue

        lines.extend(
            [
                f"Provisional score: **{result.total_score:.2f} / 100**",
                "",
                "| Category | Weighted score | Maximum |",
                "|---|---:|---:|",
            ]
        )

        for category in categories:
            category_id = category["id"]
            lines.append(
                f"| {category['label']} | "
                f"{result.category_scores[category_id]:.2f} | "
                f"{float(category['weight']):.2f} |"
            )

        if result.notes:
            lines.extend(["", result.notes])

    lines.extend(
        [
            "",
            "## Interpretation rules",
            "",
            "- A missing application is not scored as zero; it remains pending.",
            "- No winner is declared until all four applications are complete.",
            "- Every non-zero criterion score requires cited evidence.",
            "- A score of 4 requires automated, CI, audit, or deployment evidence.",
            "- The same frozen prompt and evaluation conditions must be used.",
            "- Scores describe the captured application snapshot, not the tool "
            "vendor in general.",
            "",
        ]
    )

    if all_complete:
        lines.extend(
            [
                "## Final ranking",
                "",
            ]
        )
        for index, result in enumerate(ranking, start=1):
            lines.append(
                f"{index}. **{result.label}** — "
                f"{result.total_score:.2f} / 100"
            )
        lines.append("")

    return "\n".join(lines)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Validate benchmark evidence, calculate weighted scores, and "
            "generate a Markdown report."
        )
    )
    parser.add_argument(
        "--rubric",
        type=Path,
        default=Path("benchmark/rubric.json"),
    )
    parser.add_argument(
        "--applications",
        type=Path,
        default=Path("benchmark/applications.json"),
    )
    parser.add_argument(
        "--evidence-dir",
        type=Path,
        default=Path("benchmark/evidence"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("docs/application-benchmark-report.md"),
    )
    parser.add_argument(
        "--compare",
        type=Path,
        help="Fail when the generated report differs from this file.",
    )
    parser.add_argument(
        "--require-complete",
        action="store_true",
        help="Fail unless all four applications have complete evidence.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    try:
        rubric = load_json(args.rubric)
        applications = load_json(args.applications)
        results, categories = evaluate_benchmark(
            rubric=rubric,
            applications=applications,
            evidence_dir=args.evidence_dir,
        )
        report = render_report(
            rubric=rubric,
            applications=applications,
            results=results,
            categories=categories,
        )

        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(report, encoding="utf-8", newline="\n")

        if args.compare:
            expected = args.compare.read_text(encoding="utf-8")
            if expected != report:
                raise BenchmarkError(
                    f"Generated report differs from {args.compare}"
                )

        pending = [
            result.label
            for result in results
            if result.status != "complete"
        ]

        print(f"Wrote benchmark report to {args.output}")
        for result in results:
            print(
                f"- {result.label}: "
                f"{format_score(result.total_score)}"
            )

        if args.require_complete and pending:
            raise BenchmarkError(
                "Benchmark is incomplete: " + ", ".join(pending)
            )

        return 0
    except (BenchmarkError, OSError) as error:
        print(f"Benchmark validation failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
