# Release and deployment verification

The release stack contains four ordered stages:

1. PostgreSQL becomes healthy.
2. Alembic applies all migrations.
3. The baseline study scenarios are seeded.
4. FastAPI and the Nginx-served frontend become healthy.

The browser reaches only the frontend container. Nginx serves the React
application and proxies `/api/*` and health endpoints to FastAPI.

## Local release verification

Create a private release configuration:

```powershell
Copy-Item .env.release.example .env.release
```

Replace the placeholder database password with a long random value, then run:

```powershell
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

Inspect service state and logs:

```powershell
docker compose `
  --env-file .env.release `
  -f infrastructure/docker-compose.release.yml `
  ps

docker compose `
  --env-file .env.release `
  -f infrastructure/docker-compose.release.yml `
  logs --tail 200
```

Stop and remove the local release database:

```powershell
docker compose `
  --env-file .env.release `
  -f infrastructure/docker-compose.release.yml `
  down --volumes --remove-orphans
```

## Publishing images

Publishing a GitHub Release triggers image publication to GitHub Container
Registry:

- `ghcr.io/<owner>/<repository>-backend`
- `ghcr.io/<owner>/<repository>-frontend`

Use semantic release tags such as `v1.0.0`. The workflow verifies the complete
release stack before publishing either image.

## Deploying published images

Set these values in `.env.release`:

```text
BACKEND_IMAGE=ghcr.io/<owner>/<repository>-backend:1.0.0
FRONTEND_IMAGE=ghcr.io/<owner>/<repository>-frontend:1.0.0
```

Then run `docker compose pull` followed by `docker compose up --detach`.

## Rollback

Change both image tags to the previous known-good version and run:

```powershell
docker compose `
  --env-file .env.release `
  -f infrastructure/docker-compose.release.yml `
  pull

docker compose `
  --env-file .env.release `
  -f infrastructure/docker-compose.release.yml `
  up --detach
```

Database migrations are applied before application startup. A migration that
cannot safely coexist with the previous application version requires a
documented database rollback plan before release.
