# Changelog

All notable changes to this project are documented in this file.

The project follows semantic versioning.

## [Unreleased]

No unreleased changes.

## [0.1.0-rc.1]

First release candidate of the end-to-end human-versus-machine decision study.

### Added

- Anonymous participant consent and study-session workflow
- Scenario response, confidence, timing, and completion persistence
- Browser refresh recovery and route guards
- PostgreSQL schema migrations and deterministic scenario seeding
- Frontend unit, component, and coverage tests
- Backend linting, migration validation, tests, and coverage enforcement
- Playwright mocked end-to-end tests
- Real frontend, FastAPI, and PostgreSQL integration tests
- Dependabot, dependency review, Gitleaks, and CodeQL automation
- Production Docker images, Nginx reverse proxy, and release smoke testing
- GitHub Container Registry image publication on GitHub Releases
- Final repository audit and release-readiness reporting

### Security and privacy

- Anonymous identifiers are used instead of participant identity fields
- Private environment files and credential exports are excluded from Git
- Secret scanning and dependency analysis run in GitHub Actions
- Production research use still requires the relevant protocol, approval,
  retention policy, and operational controls
