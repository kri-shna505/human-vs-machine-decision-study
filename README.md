# Human vs Machine Decision Study

[![Frontend CI](https://github.com/kri-shna505/human-vs-machine-decision-study/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/kri-shna505/human-vs-machine-decision-study/actions/workflows/frontend-ci.yml)

A full-stack research application for comparing human decision-making with computational models under uncertainty.

Participants complete a short sequence of decision scenarios, select an answer, report confidence, and submit anonymous responses. The application records response timing, prevents duplicate submissions, restores interrupted sessions, and completes each study session through a guarded workflow.

## Project status

Active development.

Implemented frontend functionality includes:

- participant consent and anonymous session creation
- randomized scenario loading
- answer selection and confidence collection
- response-time measurement
- duplicate-submission protection
- interrupted-session recovery from browser storage
- guarded `/study` and `/complete` routes
- completion-state cleanup
- automated frontend testing and coverage enforcement
- GitHub Actions continuous integration

## Technology stack

### Frontend

- React
- TypeScript
- Vite
- React Router
- Vitest
- Testing Library
- ESLint

### Backend

- FastAPI
- Pydantic
- SQLAlchemy
- Alembic
- PostgreSQL
- Pytest

## Repository structure

```text
human-vs-machine-decision-study/
├── .github/
│   └── workflows/
│       └── frontend-ci.yml
├── backend/
│   ├── app/
│   ├── migrations/
│   ├── tests/
│   ├── alembic.ini
│   └── requirements.txt
├── docs/
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vitest.config.ts
├── infrastructure/
├── ml/
└── .env.example
```

## Prerequisites

Install the following before running the project:

- Git
- Python 3.12 or newer
- Node.js 22
- PostgreSQL
- npm

## Local setup

### 1. Clone the repository

```powershell
git clone https://github.com/kri-shna505/human-vs-machine-decision-study.git
cd human-vs-machine-decision-study
```

### 2. Configure the backend environment

Create the root environment file:

```powershell
Copy-Item .env.example .env
```

Review `.env` and replace the example PostgreSQL password with a local value.

Default local configuration:

```dotenv
APP_NAME=Human vs Machine Decision Study
APP_MODE=demonstration

POSTGRES_DB=decision_study
POSTGRES_USER=decision_user
POSTGRES_PASSWORD=replace_with_local_password
POSTGRES_HOST=localhost
POSTGRES_PORT=55432

FRONTEND_ORIGIN=http://localhost:5173
```

Ensure PostgreSQL is running and that the configured database and user exist.

### 3. Start the backend

```powershell
cd backend

python -m venv .venv
.\.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip
python -m pip install -r requirements.txt

python -m alembic upgrade head

python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Backend endpoints:

- application root: `http://127.0.0.1:8000/`
- health endpoint: `http://127.0.0.1:8000/health`
- OpenAPI documentation: `http://127.0.0.1:8000/docs`
- ReDoc documentation: `http://127.0.0.1:8000/redoc`

Keep this terminal running.

### 4. Configure and start the frontend

Open a second terminal:

```powershell
cd frontend

Copy-Item .env.example .env.local
npm ci

npm run dev -- --port 5173 --strictPort
```

Open:

```text
http://localhost:5173/
```

The frontend expects the backend at:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Study workflow

```text
Landing page
    ↓
Participant consent
    ↓
Anonymous participant creation
    ↓
Study-session creation
    ↓
Scenario questions
    ↓
Answer + confidence + response time
    ↓
Response submission
    ↓
Session completion
    ↓
Completion page
```

Submitted answers cannot be changed. Browser storage is used only to recover the active anonymous study session and is cleared when the participant returns home after completion.

## Frontend commands

Run these commands from `frontend/`.

### Development server

```powershell
npm run dev
```

### Unit and component tests

```powershell
npm run test
```

### Watch mode

```powershell
npm run test:watch
```

### Coverage report

```powershell
npm run test:coverage
```

The HTML report is generated at:

```text
frontend/coverage/index.html
```

### Production build

```powershell
npm run build
```

### Lint

```powershell
npm run lint
```

### Full verification

```powershell
npm run verify
```

`npm run verify` runs coverage tests, the production build, and linting.

## Coverage quality gate

The frontend coverage run fails below these global thresholds:

| Metric | Minimum |
|---|---:|
| Statements | 80% |
| Branches | 65% |
| Functions | 85% |
| Lines | 80% |

## Backend tests

Run from `backend/` with the virtual environment active:

```powershell
python -m pytest
```

## Continuous integration

The `Frontend CI` GitHub Actions workflow runs on every push and pull request. It performs:

```text
npm ci
npm run test:coverage
npm run build
npm run lint
```

A change should not be merged into `main` unless this workflow succeeds.

## Research and privacy notes

- The application creates anonymous participant and session identifiers.
- Participants should not enter names, email addresses, telephone numbers, or other identifying information.
- Study responses should be handled according to the relevant research protocol, institutional approval, and data-retention policy.
- Demonstration mode is not a substitute for an approved production research deployment.

## Contributing

Use a feature branch rather than committing directly to `main`:

```powershell
git switch -c feature/short-description
```

Before opening a pull request:

```powershell
cd frontend
npm run verify
```

Push the branch and open a pull request targeting `main`. The required CI check must pass before merge.
