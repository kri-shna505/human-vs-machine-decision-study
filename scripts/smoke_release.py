"""Exercise the deployed release through its public HTTP entry point."""

from __future__ import annotations

import argparse
import json
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen


def request_json(
    base_url: str,
    path: str,
    *,
    method: str = "GET",
    payload: dict[str, Any] | None = None,
    timeout: float = 10,
) -> Any:
    url = urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))
    data = None

    if payload is not None:
        data = json.dumps(payload).encode("utf-8")

    request = Request(
        url,
        method=method,
        data=data,
        headers={
            "Accept": "application/json",
            **(
                {"Content-Type": "application/json"}
                if payload is not None
                else {}
            ),
        },
    )

    try:
        with urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8")

            if not body:
                return None

            return json.loads(body)
    except HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"{method} {url} returned HTTP {error.code}: {body}"
        ) from error
    except URLError as error:
        raise RuntimeError(
            f"{method} {url} could not be reached: {error.reason}"
        ) from error


def wait_until_ready(
    base_url: str,
    *,
    attempts: int,
    delay_seconds: float,
) -> None:
    last_error: Exception | None = None

    for _ in range(attempts):
        try:
            health = request_json(
                base_url,
                "/health/database",
                timeout=4,
            )

            if (
                isinstance(health, dict)
                and health.get("status") == "healthy"
            ):
                return
        except RuntimeError as error:
            last_error = error

        time.sleep(delay_seconds)

    raise RuntimeError(
        "Release did not become healthy before the timeout."
    ) from last_error


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--base-url",
        default="http://127.0.0.1:8080",
    )
    parser.add_argument("--attempts", type=int, default=45)
    parser.add_argument(
        "--delay-seconds",
        type=float,
        default=2,
    )
    args = parser.parse_args()

    wait_until_ready(
        args.base_url,
        attempts=args.attempts,
        delay_seconds=args.delay_seconds,
    )

    scenarios = request_json(
        args.base_url,
        "/api/v1/scenarios",
    )

    if not isinstance(scenarios, list) or len(scenarios) != 3:
        raise RuntimeError(
            "Expected exactly three active release scenarios."
        )

    participant = request_json(
        args.base_url,
        "/api/v1/participants",
        method="POST",
        payload={"consent": True},
    )

    session = request_json(
        args.base_url,
        "/api/v1/sessions",
        method="POST",
        payload={"participant_id": participant["id"]},
    )

    session_id = session["id"]

    for index, scenario in enumerate(scenarios):
        options = scenario.get("options", [])

        if len(options) < 2:
            raise RuntimeError(
                f"Scenario {scenario['id']} has fewer than two options."
            )

        request_json(
            args.base_url,
            f"/api/v1/sessions/{session_id}/responses",
            method="POST",
            payload={
                "scenario_id": scenario["id"],
                "selected_option_id": options[0]["id"],
                "confidence": 70 + (index * 10),
                "response_time_ms": 1000 + (index * 100),
            },
        )

    completed = request_json(
        args.base_url,
        f"/api/v1/sessions/{session_id}/complete",
        method="POST",
    )

    if completed.get("status") != "completed":
        raise RuntimeError(
            "Completion endpoint did not return completed status."
        )

    persisted = request_json(
        args.base_url,
        f"/api/v1/sessions/{session_id}",
    )

    responses = persisted.get("responses", [])

    if persisted.get("status") != "completed":
        raise RuntimeError(
            "Persisted session is not marked completed."
        )

    if len(responses) != len(scenarios):
        raise RuntimeError(
            "Persisted response count does not match scenario count."
        )

    print(
        "Release smoke test passed through the public frontend: "
        f"session {session_id}, {len(responses)} persisted responses."
    )


if __name__ == "__main__":
    main()
