#!/usr/bin/env python3
"""Validate the frozen benchmark prompt and evaluation protocol."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any


class ProtocolError(ValueError):
    """Raised when frozen benchmark protocol state is invalid."""


def load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise ProtocolError(f"Missing file: {path}") from error
    except json.JSONDecodeError as error:
        raise ProtocolError(
            f"Invalid JSON in {path}: line {error.lineno}, "
            f"column {error.colno}: {error.msg}"
        ) from error

    if not isinstance(value, dict):
        raise ProtocolError(f"Expected a JSON object in {path}")

    return value


def normalized_sha256(path: Path) -> str:
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError as error:
        raise ProtocolError(f"Missing file: {path}") from error

    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def require_non_empty_string(
    value: Any,
    *,
    field: str,
) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ProtocolError(f"{field} must be a non-empty string")

    return value.strip()


def validate_protocol(
    *,
    repository_root: Path,
    protocol_path: Path,
    applications_path: Path,
) -> dict[str, str]:
    protocol = load_json(protocol_path)
    applications = load_json(applications_path)

    protocol_id = require_non_empty_string(
        protocol.get("protocol_id"),
        field="protocol.protocol_id",
    )
    protocol_version = require_non_empty_string(
        protocol.get("protocol_version"),
        field="protocol.protocol_version",
    )

    if protocol.get("status") != "frozen":
        raise ProtocolError("protocol.status must be frozen")

    benchmark_id = require_non_empty_string(
        protocol.get("benchmark_id"),
        field="protocol.benchmark_id",
    )

    if applications.get("benchmark_id") != benchmark_id:
        raise ProtocolError(
            "applications benchmark_id does not match the protocol"
        )

    prompt = protocol.get("prompt")
    rubric = protocol.get("rubric")

    if not isinstance(prompt, dict) or not isinstance(rubric, dict):
        raise ProtocolError("protocol prompt and rubric objects are required")

    prompt_path = repository_root / require_non_empty_string(
        prompt.get("path"),
        field="protocol.prompt.path",
    )
    rubric_path = repository_root / require_non_empty_string(
        rubric.get("path"),
        field="protocol.rubric.path",
    )

    expected_prompt_sha = require_non_empty_string(
        prompt.get("normalized_sha256"),
        field="protocol.prompt.normalized_sha256",
    )
    expected_rubric_sha = require_non_empty_string(
        rubric.get("normalized_sha256"),
        field="protocol.rubric.normalized_sha256",
    )

    actual_prompt_sha = normalized_sha256(prompt_path)
    actual_rubric_sha = normalized_sha256(rubric_path)
    actual_protocol_sha = normalized_sha256(protocol_path)

    if actual_prompt_sha != expected_prompt_sha:
        raise ProtocolError(
            "Frozen prompt hash mismatch: "
            f"expected {expected_prompt_sha}, found {actual_prompt_sha}"
        )
    if actual_rubric_sha != expected_rubric_sha:
        raise ProtocolError(
            "Frozen rubric hash mismatch: "
            f"expected {expected_rubric_sha}, found {actual_rubric_sha}"
        )

    manifest_prompt = applications.get("shared_prompt")
    manifest_protocol = applications.get("protocol")

    if not isinstance(manifest_prompt, dict):
        raise ProtocolError("applications.shared_prompt is required")
    if not isinstance(manifest_protocol, dict):
        raise ProtocolError("applications.protocol is required")

    prompt_checks = {
        "id": prompt.get("id"),
        "version": prompt.get("version"),
        "status": "frozen",
        "path": prompt.get("path"),
        "normalized_sha256": actual_prompt_sha,
    }
    for field, expected in prompt_checks.items():
        if manifest_prompt.get(field) != expected:
            raise ProtocolError(
                f"applications.shared_prompt.{field} does not match "
                "the frozen protocol"
            )

    protocol_checks = {
        "id": protocol_id,
        "version": protocol_version,
        "status": "frozen",
        "path": str(protocol_path.relative_to(repository_root)).replace(
            "\\", "/"
        ),
        "normalized_sha256": actual_protocol_sha,
    }
    for field, expected in protocol_checks.items():
        if manifest_protocol.get(field) != expected:
            raise ProtocolError(
                f"applications.protocol.{field} does not match "
                "the frozen protocol"
            )

    policy = applications.get("evaluation_policy")
    required_policy_flags = (
        "same_requirements",
        "same_evaluation_environment",
        "same_evaluation_time_limit",
        "same_allowed_fixes",
        "same_required_screenshots",
        "same_required_test_cases",
        "same_evidence_rules",
        "ranking_blocked_until_complete",
    )

    if not isinstance(policy, dict):
        raise ProtocolError("applications.evaluation_policy is required")

    for flag in required_policy_flags:
        if policy.get(flag) is not True:
            raise ProtocolError(
                f"applications.evaluation_policy.{flag} must be true"
            )

    time_limits = protocol.get("time_limits")
    allowed_fixes = protocol.get("allowed_fixes")
    screenshots = protocol.get("required_screenshots")
    tests = protocol.get("required_test_cases")
    evidence_rules = protocol.get("evidence_rules")

    if not isinstance(time_limits, dict):
        raise ProtocolError("protocol.time_limits is required")
    if time_limits.get("maximum_total_minutes_per_application") != 120:
        raise ProtocolError(
            "maximum_total_minutes_per_application must remain 120"
        )

    if not isinstance(allowed_fixes, dict):
        raise ProtocolError("protocol.allowed_fixes is required")
    if allowed_fixes.get("source_code_changes") != []:
        raise ProtocolError(
            "source code changes must remain prohibited during evaluation"
        )

    if not isinstance(screenshots, list) or len(screenshots) != 9:
        raise ProtocolError("exactly 9 required screenshots are required")
    screenshot_ids = [entry.get("id") for entry in screenshots]
    if len(set(screenshot_ids)) != len(screenshot_ids):
        raise ProtocolError("required screenshot ids must be unique")

    if not isinstance(tests, list) or len(tests) < 13:
        raise ProtocolError("at least 13 required test cases are required")
    test_ids = [entry.get("id") for entry in tests]
    if len(set(test_ids)) != len(test_ids):
        raise ProtocolError("required test case ids must be unique")

    if not isinstance(evidence_rules, dict):
        raise ProtocolError("protocol.evidence_rules is required")

    application_records = applications.get("applications")
    if not isinstance(application_records, list) or len(application_records) != 4:
        raise ProtocolError("exactly four applications are required")

    seen_application_ids: set[str] = set()

    for application in application_records:
        if not isinstance(application, dict):
            raise ProtocolError("each application must be an object")

        application_id = require_non_empty_string(
            application.get("id"),
            field="application.id",
        )
        if application_id in seen_application_ids:
            raise ProtocolError(
                f"duplicate application id: {application_id}"
            )
        seen_application_ids.add(application_id)

        evidence_file = repository_root / require_non_empty_string(
            application.get("evidence_file"),
            field=f"{application_id}.evidence_file",
        )
        evidence = load_json(evidence_file)
        evaluation = evidence.get("evaluation")

        if not isinstance(evaluation, dict):
            raise ProtocolError(
                f"{application_id}: evaluation metadata is required"
            )

        evidence_checks = {
            "protocol_id": protocol_id,
            "protocol_version": protocol_version,
            "protocol_sha256": actual_protocol_sha,
            "prompt_id": prompt.get("id"),
            "prompt_version": prompt.get("version"),
            "shared_prompt_sha256": actual_prompt_sha,
        }

        for field, expected in evidence_checks.items():
            if evaluation.get(field) != expected:
                raise ProtocolError(
                    f"{application_id}: evaluation.{field} does not match "
                    "the frozen protocol"
                )

        conformance = evaluation.get("protocol_conformance")
        status = evidence.get("status")

        if status == "complete" and conformance != "complete":
            raise ProtocolError(
                f"{application_id}: complete evidence requires complete "
                "protocol conformance"
            )
        if status == "pending" and conformance not in {"pending", "complete"}:
            raise ProtocolError(
                f"{application_id}: invalid protocol_conformance"
            )

    return {
        "protocol_id": protocol_id,
        "protocol_version": protocol_version,
        "prompt_sha256": actual_prompt_sha,
        "rubric_sha256": actual_rubric_sha,
        "protocol_sha256": actual_protocol_sha,
    }


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate the frozen four-application benchmark protocol."
    )
    parser.add_argument(
        "--repository-root",
        type=Path,
        default=Path("."),
    )
    parser.add_argument(
        "--protocol",
        type=Path,
        default=Path("benchmark/protocol.json"),
    )
    parser.add_argument(
        "--applications",
        type=Path,
        default=Path("benchmark/applications.json"),
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate and print the frozen hashes.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    repository_root = args.repository_root.resolve()
    protocol_path = (
        args.protocol
        if args.protocol.is_absolute()
        else repository_root / args.protocol
    )
    applications_path = (
        args.applications
        if args.applications.is_absolute()
        else repository_root / args.applications
    )

    try:
        result = validate_protocol(
            repository_root=repository_root,
            protocol_path=protocol_path,
            applications_path=applications_path,
        )
    except (ProtocolError, OSError) as error:
        print(f"Benchmark protocol validation failed: {error}", file=sys.stderr)
        return 1

    print(
        "Frozen benchmark protocol passed validation for "
        f"{result['protocol_id']} {result['protocol_version']}."
    )
    print(f"Prompt SHA-256:   {result['prompt_sha256']}")
    print(f"Rubric SHA-256:   {result['rubric_sha256']}")
    print(f"Protocol SHA-256: {result['protocol_sha256']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
