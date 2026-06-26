# Final release-readiness closeout

This document defines Step 10.18, the final repository audit and first release
candidate closeout.

## Important recovered gap

PR #3, `Add security and dependency automation`, remained open and was never
merged into `main`. Therefore `.github/dependabot.yml` and
`.github/workflows/security.yml` were absent from the protected branch.

The Step 10.18 pull request supersedes those missing files. Close PR #3 only
after the Step 10.18 pull request is merged.

## Automated audit

Run from the repository root:

```powershell
python scripts/set_version.py 0.1.0-rc.1

python scripts/audit_repository.py `
  --strict `
  --output docs/release-readiness-report.md
```

The audit checks required workflows, stable check names, version consistency,
documentation alignment, tracked artifacts, credential files, secret
signatures, UTF-8 encoding, whitespace, and stale extracted files.

The `Readiness CI / Repository audit` workflow regenerates the report and
compares it with the committed snapshot.

## Branch protection

The `main` rule must require exactly one instance of each check:

```text
Test, build, and lint
Test, migrate, and lint
Playwright end-to-end
Frontend, API, and PostgreSQL
Build images and smoke test
Repository audit
```

Also require pull requests, up-to-date branches, and conversation resolution.
Do not allow bypassing, force pushes, or branch deletion. Remove duplicate,
obsolete, or renamed required checks.

## GitHub repository controls

Confirm all workflows are green on the final `main` commit, Dependency graph
and Dependabot alerts are enabled, secret scanning and push protection are
enabled when available, PR #3 is closed as superseded, and no stale
`feature/*` or `fix/*` branches remain.

## First release candidate

After the Step 10.18 pull request is merged and `main` is clean:

1. Open **Releases**.
2. Choose **Draft a new release**.
3. Create tag `v0.1.0-rc.1` from `main`.
4. Use release title `v0.1.0-rc.1`.
5. Select **Set as a pre-release**.
6. Generate release notes.
7. Publish the prerelease.

Publishing triggers `Release CI / Publish release images`. Confirm both images:

```text
ghcr.io/kri-shna505/human-vs-machine-decision-study-backend:0.1.0-rc.1
ghcr.io/kri-shna505/human-vs-machine-decision-study-frontend:0.1.0-rc.1
```
