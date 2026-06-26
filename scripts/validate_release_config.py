"""Validate release configuration before images or services are started."""

from __future__ import annotations

import argparse
from pathlib import Path
from urllib.parse import urlparse


ALLOWED_APP_MODES = {
    "demonstration",
    "supervisor_trial",
    "research",
}

REQUIRED_KEYS = {
    "APP_MODE",
    "POSTGRES_DB",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "FRONTEND_ORIGIN",
}

WEAK_PASSWORD_FRAGMENTS = {
    "change-me",
    "changeme",
    "password",
    "replace",
    "secret",
}


def parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}

    for line_number, raw_line in enumerate(
        path.read_text(encoding="utf-8").splitlines(),
        start=1,
    ):
        line = raw_line.strip()

        if not line or line.startswith("#"):
            continue

        if "=" not in line:
            raise ValueError(
                f"{path}:{line_number}: expected KEY=VALUE."
            )

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")

        if not key:
            raise ValueError(
                f"{path}:{line_number}: environment key is empty."
            )

        values[key] = value

    return values


def validate(values: dict[str, str]) -> list[str]:
    errors: list[str] = []

    missing = sorted(
        key
        for key in REQUIRED_KEYS
        if not values.get(key, "").strip()
    )

    if missing:
        errors.append(
            "Missing required values: " + ", ".join(missing)
        )

    app_mode = values.get("APP_MODE", "")

    if app_mode and app_mode not in ALLOWED_APP_MODES:
        errors.append(
            "APP_MODE must be one of: "
            + ", ".join(sorted(ALLOWED_APP_MODES))
        )

    password = values.get("POSTGRES_PASSWORD", "")
    lowered_password = password.lower()

    if password and len(password) < 16:
        errors.append(
            "POSTGRES_PASSWORD must contain at least 16 characters."
        )

    if password and any(
        fragment in lowered_password
        for fragment in WEAK_PASSWORD_FRAGMENTS
    ):
        errors.append(
            "POSTGRES_PASSWORD still looks like a placeholder "
            "or weak default."
        )

    if password and password == values.get("POSTGRES_USER"):
        errors.append(
            "POSTGRES_PASSWORD must not equal POSTGRES_USER."
        )

    frontend_origin = values.get("FRONTEND_ORIGIN", "")

    if frontend_origin:
        parsed_origin = urlparse(frontend_origin)

        if (
            parsed_origin.scheme not in {"http", "https"}
            or not parsed_origin.netloc
            or parsed_origin.path not in {"", "/"}
            or parsed_origin.params
            or parsed_origin.query
            or parsed_origin.fragment
        ):
            errors.append(
                "FRONTEND_ORIGIN must be a bare http(s) origin, "
                "for example https://study.example.org."
            )

    frontend_port = values.get("FRONTEND_PORT", "8080")

    try:
        port_number = int(frontend_port)

        if not 1 <= port_number <= 65535:
            raise ValueError
    except ValueError:
        errors.append(
            "FRONTEND_PORT must be an integer from 1 to 65535."
        )

    return errors


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--env-file",
        type=Path,
        default=Path(".env.release"),
    )
    args = parser.parse_args()

    if not args.env_file.is_file():
        raise SystemExit(
            f"Release environment file not found: {args.env_file}"
        )

    try:
        values = parse_env_file(args.env_file)
    except ValueError as error:
        raise SystemExit(str(error)) from error

    errors = validate(values)

    if errors:
        formatted_errors = "\n".join(
            f"- {error}" for error in errors
        )
        raise SystemExit(
            "Release configuration is invalid:\n"
            f"{formatted_errors}"
        )

    print(
        "Release configuration passed validation for "
        f"APP_MODE={values['APP_MODE']} and "
        f"FRONTEND_ORIGIN={values['FRONTEND_ORIGIN']}."
    )


if __name__ == "__main__":
    main()
