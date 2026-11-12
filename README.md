# sudi.dev

Personal portfolio and publishing site for Sudi M. David. The frontend is Next.js; the backend is ASP.NET Core using Clean Architecture. PostgreSQL stores articles, revisions, portfolio projects and site settings.

## Structure

```text
src/Domain/           Publication rules, entities and events
src/Application/      Feature commands, queries and validators
src/Infrastructure/   PostgreSQL, authentication, email, media and outbox
src/Web.Api/          HTTP endpoints and application startup
src/SharedKernel/     Shared result/error/entity primitives
web/                  Next.js public site and admin interface
tests/                .NET unit, architecture and integration tests
tools/ContentImport/  Explicit migration from the existing MDX archive
content/              Original migration archive, not runtime content
contracts/            OpenAPI schema used to generate TypeScript API types
infra/                API container and production Compose overlay
```

See [architecture](docs/architecture/clean-architecture.md) for dependency rules and publication behavior.

## Requirements

- .NET 10 SDK
- Node.js 22+ and pnpm 11.17.0
- Docker for PostgreSQL and integration tests

## Local development

1. Copy `.env.example` to `.env` and set a local database password, a revalidation secret and your admin email.
2. Start PostgreSQL: `docker compose up -d database`.
3. Set `ConnectionStrings__Database` in your shell to the local database connection string. The .NET CLI reads environment variables; it does not automatically read `.env`.
4. Apply the schema: `dotnet run --project src/Web.Api -- --migrate`.
5. Install frontend dependencies: `pnpm --dir web install --frozen-lockfile`.
6. Export and validate the existing content:

```sh
mkdir -p artifacts
node tools/ContentImport/export.mjs content artifacts/content.json
dotnet run --project tools/ContentImport -- --input artifacts/content.json --dry-run
dotnet run --project tools/ContentImport -- --input artifacts/content.json
```

7. Configure frontend environment variables in `web/.env.local` using `web/.env.example`.
8. Run the API and frontend in separate terminals:

```sh
ASPNETCORE_ENVIRONMENT=Development ASPNETCORE_URLS=http://localhost:5000 dotnet run --project src/Web.Api --no-launch-profile
pnpm --dir web dev
```

Configure GitHub OAuth with the callback `http://localhost:3000/api/backend/auth/callback/github`. The backend owns the session. Development-only bypass requires `Auth__DevBypass=true` and `ASPNETCORE_ENVIRONMENT=Development`; configure `Auth__AdminEmail` too.

## Editing and publication

The editor saves draft revisions without changing the published article. Publish makes the current revision public. A stale editor receives a conflict and must reload rather than overwrite newer work.

Publication durably queues cache invalidation and, on first publication, newsletter-draft creation. An admin sends newsletters explicitly. Resend remains the subscriber store; giscus remains the comment system. Existing article URLs and legacy redirects are preserved.

## Validation

```sh
dotnet test Sudi.slnx
node --test tools/ContentImport/export.test.mjs
pnpm --dir web typecheck
pnpm --dir web lint
pnpm --dir web build
pnpm --dir web test
```

Some frontend tests inspect a running built site. Start `pnpm --dir web start` and the seeded API before running them. With both services running, verify import fidelity and public routes:

```sh
node tools/verify-import.mjs --manifest artifacts/content.json
```

Regenerate the TypeScript contract after an API change:

```sh
node tools/generate-api-client.mjs --fetch
node tools/generate-api-client.mjs --check
```

## Deployment

See [deployment and migration](docs/deploy.md). Importing production data and switching traffic are explicit operations. Container startup does not automatically import the MDX archive.

## Reuse

This repository contains personal writing, branding and information. Contact the author before reusing that content.
