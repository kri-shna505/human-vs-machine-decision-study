# Release and deployment verification

Current release candidate: `v0.1.0-rc.1`.

The release stack contains four ordered stages: PostgreSQL health, Alembic
migrations, baseline scenario seeding, and healthy FastAPI plus Nginx services.
The browser reaches only the frontend container; Nginx proxies `/api/*` and
health endpoints to FastAPI.

## Local release verification

```powershell
Copy-Item .env.release.example .env.release
python scripts/validate_release_config.py --env-file .env.release

docker compose `
  --env-file .env.release `
  -f infrastructure/docker-compose.release.yml `
  config --quiet

docker compose `
  --env-file .env.release `
  -f infrastructure/docker-compose.release.yml `
  build --pull

docker compose `
  --env-file .env.release `
  -f infrastructure/docker-compose.release.yml `
  up --detach

python scripts/smoke_release.py `
  --base-url http://127.0.0.1:8080
```

Inspect with `docker compose ... ps --all` and `docker compose ... logs --tail
200`. Stop with:

```powershell
docker compose `
  --env-file .env.release `
  -f infrastructure/docker-compose.release.yml `
  down --volumes --remove-orphans
```

## Publishing the first release candidate

Publishing GitHub prerelease `v0.1.0-rc.1` triggers image publication to:

- `ghcr.io/kri-shna505/human-vs-machine-decision-study-backend`
- `ghcr.io/kri-shna505/human-vs-machine-decision-study-frontend`

## Deploying published images

```text
BACKEND_IMAGE=ghcr.io/kri-shna505/human-vs-machine-decision-study-backend:0.1.0-rc.1
FRONTEND_IMAGE=ghcr.io/kri-shna505/human-vs-machine-decision-study-frontend:0.1.0-rc.1
```

Run `docker compose pull`, `docker compose up --detach`, and the smoke test.

## Rollback

Change both image tags to the previous known-good version, then repeat pull and
up. Database migrations that are not backward-compatible require a documented
database rollback plan before release.
