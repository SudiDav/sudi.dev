# Deployment and content migration

The application deploys as a Next.js frontend, a .NET API, and PostgreSQL. The root `docker-compose.yml` defines local container deployment. `infra/compose.production.yml` attaches the frontend to the existing Traefik network and removes host-published database/frontend ports.

## Configuration

Copy `.env.example` to `.env` for Compose. Generate distinct random values for `POSTGRES_PASSWORD` and `REVALIDATION_SECRET`. Set `SITE_URL` to the public frontend origin and `ADMIN_EMAIL` to the owner's verified primary GitHub email.

The GitHub OAuth callback is now:

```text
https://sudi.dev/api/backend/auth/callback/github
```

Update the OAuth app configuration when cutting over. The backend owns sessions; existing Auth.js sessions will require signing in again. Persist the API data-protection keys across restarts. The API checks the configured owner on every authorized request.

Compose maps these variables to backend configuration:

| Purpose | .NET environment variable |
|---|---|
| PostgreSQL | `ConnectionStrings__Database` |
| Public frontend origin | `Web__BaseUrl` |
| Owner | `Auth__AdminEmail` |
| GitHub OAuth | `Auth__GitHub__ClientId`, `Auth__GitHub__ClientSecret` |
| Session key storage | `Auth__KeysPath` |
| Upload directory | `Storage__RootPath` |
| Cache hook | `Cache__RevalidationSecret`, `Cache__WebBaseUrl` |
| Resend | `Resend__ApiKey`, `Resend__AudienceId`, `Resend__From`, `Resend__ContactEmail` |

Next.js needs `API_BASE_URL` for internal server requests and `REVALIDATION_SECRET` for the signed cache hook. GitHub comment administration and Vercel analytics keep their read-only frontend configuration. `NEXT_PUBLIC_GISCUS_*` values must be present when the frontend is built.

## Local containers

```sh
docker compose up -d database
docker compose build api web
docker compose run --rm migrate
docker compose up -d api web
```

The migration service applies EF migrations; it does not import articles. The API is reachable through the frontend's same-origin proxy. For direct local CLI access, PostgreSQL is bound only to localhost.

## Import the existing content

The `content/` archive is immutable migration input, not a fallback reader. Export it after frontend dependencies have been installed:

```sh
mkdir -p artifacts
node tools/ContentImport/export.mjs content artifacts/content.json
```

Point `ConnectionStrings__Database` at the intended target in your shell, apply migrations, then dry-run:

```sh
dotnet run --project src/Web.Api -- --migrate
dotnet run --project tools/ContentImport -- --input artifacts/content.json --dry-run
dotnet run --project tools/ContentImport -- --input artifacts/content.json
```

The importer preserves slugs, article bodies, metadata, project years and site settings. Missing historical post status means Published. It does not create newsletter drafts or publication outbox jobs.

The default conflict policy is `fail`. An identical repeated import is a no-op. If data differs, including after an admin edit, explicitly choose one of:

```sh
# Leave conflicting database records unchanged.
dotnet run --project tools/ContentImport -- --input artifacts/content.json --conflicts skip

# Replace conflicting content from the archive; review a dry-run first.
dotnet run --project tools/ContentImport -- --input artifacts/content.json --conflicts overwrite --dry-run
```

Import runs transactionally. Validation/conflict errors must not leave a partial import. Keep production database credentials out of command history by supplying them through the deployment environment.

## Validate before cutover

1. Back up the current site and archive. Back up any target database content before importing.
2. Build and migrate in an isolated preview environment with its own database, media volume, session keys and revalidation secret.
3. Keep Resend unconfigured during historical import and preview checks; use fakes for automated integration tests.
4. Run backend tests, frontend checks and a production frontend build.
5. Start both preview applications and run:

```sh
node tools/verify-import.mjs --manifest artifacts/content.json --api http://localhost:5000 --web http://localhost:3000
```

6. Verify GitHub owner sign-in, draft save, explicit publication, stale-edit conflicts and upload display in the admin. Confirm saving a draft leaves the public article unchanged.
7. Freeze content editing on the old site for the final export/import. Switch traffic only after count/content/URL checks pass. Resume editing in the new admin.

## Production Compose

Set `SITE_URL=https://sudi.dev`, production credentials, and giscus build arguments. Use the production overlay:

```sh
docker compose -f docker-compose.yml -f infra/compose.production.yml up -d --build
```

Only the frontend joins Traefik. PostgreSQL and the API remain on the private Compose network. Back up all three persistent data volumes: database, uploaded media, and authentication keys. Apply future migrations as an explicit deployment step before starting a compatible API version.

## Recovery and monitoring

- `/health` reports API readiness; treat database unavailability as unhealthy.
- Inspect API logs and persisted outbox attempts/errors when newsletter drafts or invalidations are delayed. A provider failure must not undo a successful publication.
- Never manually clear newsletter idempotency records to force a retry. Reconcile provider state first.
- A rollback to the former Git-backed site uses the preserved archive and prior deployment. Database edits made after cutover are not automatically reflected in that archive; export/reconcile them before rolling back traffic.

The implementation does not deploy, import into production, or send newsletters automatically as part of the development workflow.
