"""Generate a deterministic repository release-readiness report."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = (
    ".github/dependabot.yml",
    ".github/workflows/backend-ci.yml",
    ".github/workflows/e2e-ci.yml",
    ".github/workflows/frontend-ci.yml",
    ".github/workflows/full-stack-ci.yml",
    ".github/workflows/readiness-ci.yml",
    ".github/workflows/release-ci.yml",
    ".github/workflows/security.yml",
    ".gitignore",
    "CHANGELOG.md",
    "README.md",
    "VERSION",
    "backend/Dockerfile",
    "backend/app/main.py",
    "backend/app/version.py",
    "docs/release-readiness.md",
    "docs/release-readiness-report.md",
    "docs/release.md",
    "frontend/Dockerfile",
    "frontend/package-lock.json",
    "frontend/package.json",
    "infrastructure/docker-compose.release.yml",
)

WORKFLOW_JOBS = {
    ".github/workflows/frontend-ci.yml": "name: Test, build, and lint",
    ".github/workflows/backend-ci.yml": "name: Test, migrate, and lint",
    ".github/workflows/e2e-ci.yml": "name: Playwright end-to-end",
    ".github/workflows/full-stack-ci.yml": "name: Frontend, API, and PostgreSQL",
    ".github/workflows/release-ci.yml": "name: Build images and smoke test",
    ".github/workflows/readiness-ci.yml": "name: Repository audit",
    ".github/workflows/security.yml": "name: Secret scan",
}

README_TOKENS = (
    "npm run verify",
    "npm run test:e2e",
    "npm run test:e2e:full-stack",
    "python -m pytest",
    "docker-compose.release.yml",
    "docs/release.md",
    "docs/release-readiness.md",
    "Test, build, and lint",
    "Test, migrate, and lint",
    "Playwright end-to-end",
    "Frontend, API, and PostgreSQL",
    "Build images and smoke test",
    "Repository audit",
)

ALLOWED_ENV_FILES = {".env.example", ".env.release.example", "frontend/.env.example"}
PROHIBITED_PARTS = {
    ".pytest_cache", ".ruff_cache", ".mypy_cache", ".venv", "__pycache__",
    "blob-report", "coverage", "dist", "htmlcov", "node_modules",
    "playwright-report", "test-results",
}
PROHIBITED_SUFFIXES = {".jks", ".key", ".log", ".p12", ".pem", ".pfx", ".pyc"}
SECRET_PATTERNS = {
    "private key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "GitHub token": re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{20,}\b"),
    "AWS access key": re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
}
TEXT_SUFFIXES = {
    ".css", ".dockerignore", ".env", ".example", ".html", ".ini",
    ".js", ".json", ".md", ".mjs", ".ps1", ".py", ".toml",
    ".ts", ".tsx", ".txt", ".yaml", ".yml",
}


@dataclass(frozen=True)
class Check:
    name: str
    passed: bool
    details: str


def git(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args], cwd=ROOT, check=False, capture_output=True,
        text=True, encoding="utf-8"
    )


def git_files(*args: str) -> list[str]:
    result = git("ls-files", *args)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip())
    return [line for line in result.stdout.splitlines() if line]


def is_text(path: Path) -> bool:
    return path.name in {"Dockerfile", "VERSION", ".gitignore", ".dockerignore"} or path.suffix.lower() in TEXT_SUFFIXES


def required_files_check() -> Check:
    missing = [name for name in REQUIRED_FILES if not (ROOT / name).is_file()]
    return Check("Required release files", not missing, "All required files exist." if not missing else "Missing: " + ", ".join(missing))


def version_check() -> Check:
    try:
        version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
        package = json.loads((ROOT / "frontend/package.json").read_text(encoding="utf-8"))
        lock = json.loads((ROOT / "frontend/package-lock.json").read_text(encoding="utf-8"))
        backend = (ROOT / "backend/app/version.py").read_text(encoding="utf-8")
    except (OSError, json.JSONDecodeError) as error:
        return Check("Version consistency", False, str(error))
    match = re.search(r'APP_VERSION\s*=\s*"([^"]+)"', backend)
    values = {
        "VERSION": version,
        "package.json": package.get("version"),
        "package-lock.json": lock.get("version"),
        "lock root": lock.get("packages", {}).get("", {}).get("version"),
        "backend": match.group(1) if match else None,
    }
    bad = {key: value for key, value in values.items() if value != version}
    return Check("Version consistency", not bad, f"All version metadata equals {version}." if not bad else "Mismatch: " + ", ".join(f"{k}={v!r}" for k, v in bad.items()))


def workflow_check() -> Check:
    failures = []
    for name, token in WORKFLOW_JOBS.items():
        path = ROOT / name
        if not path.is_file() or token not in path.read_text(encoding="utf-8"):
            failures.append(f"{name} lacks {token!r}")
    return Check("Workflow status-check names", not failures, "Required check names are stable." if not failures else "; ".join(failures))


def readme_check() -> Check:
    text = (ROOT / "README.md").read_text(encoding="utf-8") if (ROOT / "README.md").is_file() else ""
    missing = [token for token in README_TOKENS if token not in text]
    return Check("README command alignment", not missing, "README documents every supported validation path." if not missing else "Missing: " + ", ".join(missing))


def docs_check() -> Check:
    requirements = {
        "docs/release.md": (".env.release", "docker-compose.release.yml", "smoke_release.py", "v0.1.0-rc.1", "Rollback"),
        "docs/release-readiness.md": ("Branch protection", "Repository audit", "v0.1.0-rc.1", "PR #3"),
    }
    failures = []
    for name, tokens in requirements.items():
        path = ROOT / name
        if not path.is_file():
            failures.append(f"{name} missing")
            continue
        text = path.read_text(encoding="utf-8")
        missing = [token for token in tokens if token not in text]
        if missing:
            failures.append(f"{name} missing {', '.join(missing)}")
    return Check("Release documentation", not failures, "Release, rollback, and closeout commands are documented." if not failures else "; ".join(failures))


def hygiene_check(files: Iterable[str]) -> Check:
    violations = []
    for raw in files:
        normalized = raw.replace("\\", "/")
        path = Path(normalized)
        if (normalized.startswith(".env") or "/.env" in normalized) and normalized not in ALLOWED_ENV_FILES:
            violations.append(normalized)
        elif set(path.parts).intersection(PROHIBITED_PARTS) or path.suffix.lower() in PROHIBITED_SUFFIXES:
            violations.append(normalized)
    return Check("Tracked artifact and credential hygiene", not violations, "No generated artifacts or private credential files are tracked." if not violations else "Prohibited: " + ", ".join(sorted(violations)))


def secret_check(files: Iterable[str]) -> Check:
    findings = []
    for raw in files:
        path = ROOT / raw
        if not path.is_file() or not is_text(path):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for label, pattern in SECRET_PATTERNS.items():
            if pattern.search(text):
                findings.append(f"{raw}: {label}")
    return Check("High-confidence secret signatures", not findings, "No private keys or high-confidence tokens found." if not findings else "Potential secrets: " + ", ".join(findings))


def bom_check(files: Iterable[str]) -> Check:
    findings = []
    for raw in files:
        path = ROOT / raw
        if path.is_file() and is_text(path) and path.read_bytes().startswith(b"\xef\xbb\xbf"):
            findings.append(raw)
    return Check("UTF-8 text encoding", not findings, "No UTF-8 BOM markers found." if not findings else "BOM found in: " + ", ".join(findings))


def whitespace_check() -> Check:
    result = git("diff", "HEAD", "--check")
    passed = result.returncode == 0 and not result.stdout.strip()
    return Check("Git whitespace validation", passed, "git diff HEAD --check passed." if passed else (result.stdout + result.stderr).strip())


def stale_check() -> Check:
    stale = [name for name in ("INSTALL.txt", "backend-full-stack.pid", "release-stack.log") if (ROOT / name).exists()]
    return Check("Stale local files", not stale, "No extracted installer or diagnostic leftovers found." if not stale else "Remove: " + ", ".join(stale))


def render(checks: list[Check]) -> str:
    version = (ROOT / "VERSION").read_text(encoding="utf-8").strip() if (ROOT / "VERSION").is_file() else "unknown"
    passed = sum(item.passed for item in checks)
    lines = [
        "# Release-readiness report", "", f"Target release candidate: `v{version}`", "",
        "## Automated repository audit", "", "| Check | Result | Evidence |", "|---|---|---|",
    ]
    for item in checks:
        evidence = item.details.replace("|", "\\|").replace("\n", " ")
        lines.append(f"| {item.name} | **{'PASS' if item.passed else 'FAIL'}** | {evidence} |")
    lines += [
        "", f"Automated result: **{passed} passed, {len(checks)-passed} failed**.", "",
        "## Manual GitHub controls", "",
        "- [ ] PR #3 (`Add security and dependency automation`) is closed after Step 10.18 supersedes it.",
        "- [ ] `main` requires exactly one instance of each check:",
        "  - `Test, build, and lint`", "  - `Test, migrate, and lint`", "  - `Playwright end-to-end`",
        "  - `Frontend, API, and PostgreSQL`", "  - `Build images and smoke test`", "  - `Repository audit`",
        "- [ ] No duplicate or obsolete required checks remain.",
        "- [ ] All workflows are green on the final `main` commit.",
        "- [ ] No stale `feature/*` or `fix/*` branches remain.",
        "- [ ] Dependency graph and Dependabot alerts are enabled.",
        "- [ ] Secret scanning and push protection are enabled when available.", "",
        "## Release-candidate closeout", "",
        "- [ ] Create tag `v0.1.0-rc.1` from audited `main`.",
        "- [ ] Publish GitHub prerelease `v0.1.0-rc.1`.",
        "- [ ] Confirm `Publish release images` succeeds.",
        "- [ ] Confirm versioned backend and frontend images appear in GHCR.", "",
        "The project is release-ready only when every automated check passes and every manual checkbox is complete.", "",
    ]
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("docs/release-readiness-report.md"))
    parser.add_argument("--compare", type=Path)
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args()
    tracked = git_files()
    candidates = git_files("--cached", "--others", "--exclude-standard")
    checks = [required_files_check(), version_check(), workflow_check(), readme_check(), docs_check(), hygiene_check(tracked), secret_check(candidates), bom_check(candidates), whitespace_check(), stale_check()]
    report = render(checks)
    output = args.output if args.output.is_absolute() else ROOT / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(report, encoding="utf-8", newline="\n")
    compare_failed = False
    if args.compare:
        compare = args.compare if args.compare.is_absolute() else ROOT / args.compare
        if not compare.is_file() or compare.read_text(encoding="utf-8") != report:
            print("Committed release-readiness report is missing or stale.", file=sys.stderr)
            compare_failed = True
    for item in checks:
        print(f"[{'PASS' if item.passed else 'FAIL'}] {item.name}: {item.details}")
    if args.strict and (any(not item.passed for item in checks) or compare_failed):
        raise SystemExit(1)

if __name__ == "__main__":
    main()
