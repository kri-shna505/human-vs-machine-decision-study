# Release-readiness report

Target release candidate: `v0.1.0-rc.1`

## Automated repository audit

| Check | Result | Evidence |
|---|---|---|
| Required release files | **PASS** | All required files exist. |
| Version consistency | **PASS** | All version metadata equals 0.1.0-rc.1. |
| Workflow status-check names | **PASS** | Required check names are stable. |
| README command alignment | **PASS** | README documents every supported validation path. |
| Release documentation | **PASS** | Release, rollback, and closeout commands are documented. |
| Tracked artifact and credential hygiene | **PASS** | No generated artifacts or private credential files are tracked. |
| High-confidence secret signatures | **PASS** | No private keys or high-confidence tokens found. |
| UTF-8 text encoding | **PASS** | No UTF-8 BOM markers found. |
| Git whitespace validation | **PASS** | git diff HEAD --check passed. |
| Stale local files | **PASS** | No extracted installer or diagnostic leftovers found. |

Automated result: **10 passed, 0 failed**.

## Manual GitHub controls

- [ ] PR #3 (`Add security and dependency automation`) is closed after Step 10.18 supersedes it.
- [ ] `main` requires exactly one instance of each check:
  - `Test, build, and lint`
  - `Test, migrate, and lint`
  - `Playwright end-to-end`
  - `Frontend, API, and PostgreSQL`
  - `Build images and smoke test`
  - `Repository audit`
- [ ] No duplicate or obsolete required checks remain.
- [ ] All workflows are green on the final `main` commit.
- [ ] No stale `feature/*` or `fix/*` branches remain.
- [ ] Dependency graph and Dependabot alerts are enabled.
- [ ] Secret scanning and push protection are enabled when available.

## Release-candidate closeout

- [ ] Create tag `v0.1.0-rc.1` from audited `main`.
- [ ] Publish GitHub prerelease `v0.1.0-rc.1`.
- [ ] Confirm `Publish release images` succeeds.
- [ ] Confirm versioned backend and frontend images appear in GHCR.

The project is release-ready only when every automated check passes and every manual checkbox is complete.
