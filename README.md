# Human vs Machine Decision Study

[![Frontend CI](https://github.com/kri-shna505/human-vs-machine-decision-study/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/kri-shna505/human-vs-machine-decision-study/actions/workflows/frontend-ci.yml)
[![Backend CI](https://github.com/kri-shna505/human-vs-machine-decision-study/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/kri-shna505/human-vs-machine-decision-study/actions/workflows/backend-ci.yml)
[![E2E CI](https://github.com/kri-shna505/human-vs-machine-decision-study/actions/workflows/e2e-ci.yml/badge.svg)](https://github.com/kri-shna505/human-vs-machine-decision-study/actions/workflows/e2e-ci.yml)
[![Full-stack CI](https://github.com/kri-shna505/human-vs-machine-decision-study/actions/workflows/full-stack-ci.yml/badge.svg)](https://github.com/kri-shna505/human-vs-machine-decision-study/actions/workflows/full-stack-ci.yml)
[![Release CI](https://github.com/kri-shna505/human-vs-machine-decision-study/actions/workflows/release-ci.yml/badge.svg)](https://github.com/kri-shna505/human-vs-machine-decision-study/actions/workflows/release-ci.yml)
[![Security](https://github.com/kri-shna505/human-vs-machine-decision-study/actions/workflows/security.yml/badge.svg)](https://github.com/kri-shna505/human-vs-machine-decision-study/actions/workflows/security.yml)
[![Readiness CI](https://github.com/kri-shna505/human-vs-machine-decision-study/actions/workflows/readiness-ci.yml/badge.svg)](https://github.com/kri-shna505/human-vs-machine-decision-study/actions/workflows/readiness-ci.yml)

A full-stack research application for comparing human decision-making with
computational models under uncertainty.

Current release candidate: **v0.1.0-rc.1**.

Participants complete decision scenarios, select answers, report confidence,
and submit anonymous responses. The application records response timing,
prevents duplicate submissions, restores interrupted sessions, and persists
completed study sessions in PostgreSQL.

## Implemented system

- anonymous consent, participant, and study-session creation
- randomized active-scenario loading
- answer, confidence, and response-time collection
- duplicate-response protection and browser-refresh recovery
- guarded study and completion routes
- FastAPI service, PostgreSQL persistence, and Alembic migrations
- deterministic scenario seeding
- frontend and backend quality gates
- mocked and real-stack Playwright browser tests
- Dependabot, dependency review, secret scanning, and CodeQL
- Docker release images and Nginx same-origin reverse proxy
- release smoke testing and GHCR publication
- deterministic repository release-readiness audit

## Technology

Frontend: React, TypeScript, Vite, React Router, Vitest, Testing Library,
ESLint, and Playwright.

Backend: FastAPI, Pydantic, SQLAlchemy, Alembic, PostgreSQL, Pytest, Ruff, and
coverage.py.

Delivery: Docker, Docker Compose, Nginx, GitHub Actions, Dependabot, CodeQL,
Gitleaks, and GitHub Container Registry.

## Prerequisites

- Git
- Python 3.12
- Node.js 22
- npm
- PostgreSQL 17 or Docker Desktop

## Local development

```powershell
Copy-Item .env.example .env

docker compose `
  --env-file .env `
  -f infrastructure/docker-compose.yml `
  up --detach
```

Set up and start the backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
python -m alembic upgrade head
python -m app.seeds.scenarios
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Start the frontend in another terminal:

```powershell
cd frontend
Copy-Item .env.example .env.local
npm ci
npm run dev -- --port 5173 --strictPort
```

Open `http://localhost:5173`.

## Validation commands

Frontend quality gate:

```powershell
cd frontend
npm run verify
```

Mocked browser tests:

```powershell
cd frontend
npm run test:e2e
```

Real frontend, API, and PostgreSQL browser tests:

```powershell
cd frontend
npm run test:e2e:full-stack
```

Backend quality gate:

```powershell
cd backend
python -m ruff check app tests
python -m ruff format --check app tests
python -m alembic upgrade head
python -m alembic check
python -m pytest --cov=app --cov-report=term-missing --cov-report=xml
```

Repository release-readiness audit:

```powershell
python scripts/audit_repository.py `
  --strict `
  --output docs/release-readiness-report.md
```

## Required `main` checks

Branch protection requires these unique checks:

```text
Test, build, and lint
Test, migrate, and lint
Playwright end-to-end
Frontend, API, and PostgreSQL
Build images and smoke test
Repository audit
```

No duplicate or obsolete checks should remain.

## Release deployment

The production-style stack is defined in
`infrastructure/docker-compose.release.yml`.

Follow [docs/release.md](docs/release.md) for Docker build, deployment, smoke
testing, image publication, and rollback commands.

Follow [docs/release-readiness.md](docs/release-readiness.md) for the final
repository audit, branch-protection closeout, and first release-candidate
procedure.

## Research and privacy

- Anonymous identifiers are used instead of participant identity fields.
- Participants should not submit names, email addresses, phone numbers, or
  other identifying information.
- Research deployments require the relevant protocol, institutional approval,
  data-retention policy, access controls, backups, and incident procedures.
- Demonstration mode is not an approved research deployment.

## Contributing

Create a feature branch rather than committing directly to `main`. Run the
checks relevant to the changed area. Every required `main` status check must
pass before merge.
