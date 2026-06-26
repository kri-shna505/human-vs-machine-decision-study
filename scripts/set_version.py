"""Set the release version consistently across project metadata."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEMVER = re.compile(
    r"^(0|[1-9]\d*)\."
    r"(0|[1-9]\d*)\."
    r"(0|[1-9]\d*)"
    r"(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?"
    r"(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$"
)

def write_json(path: Path, payload: dict[str, object]) -> None:
    path.write_text(
        json.dumps(payload, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("version")
    args = parser.parse_args()
    version = args.version.strip()
    if not SEMVER.fullmatch(version):
        raise SystemExit(f"Invalid semantic version: {version!r}")
    (ROOT / "VERSION").write_text(version + "\n", encoding="utf-8", newline="\n")
    (ROOT / "backend" / "app" / "version.py").write_text(
        '"""Application version metadata."""\n\n'
        f'APP_VERSION = "{version}"\n',
        encoding="utf-8",
        newline="\n",
    )
    package_path = ROOT / "frontend" / "package.json"
    package = json.loads(package_path.read_text(encoding="utf-8"))
    package["version"] = version
    write_json(package_path, package)
    lock_path = ROOT / "frontend" / "package-lock.json"
    package_lock = json.loads(lock_path.read_text(encoding="utf-8"))
    package_lock["version"] = version
    root_package = package_lock.get("packages", {}).get("")
    if not isinstance(root_package, dict):
        raise SystemExit("frontend/package-lock.json has no root package metadata.")
    root_package["version"] = version
    write_json(lock_path, package_lock)
    print(f"Project version set to {version}.")

if __name__ == "__main__":
    main()
