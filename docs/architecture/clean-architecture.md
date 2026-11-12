# Publishing architecture

The site has two applications: a Next.js frontend and a single ASP.NET Core API. PostgreSQL is the content source of truth. The backend follows the five-project layout of the supplied Clean Architecture template, with features grouped inside each layer.

## Boundaries

- **Domain** contains article lifecycle rules, draft/published snapshots and revisions. It depends only on SharedKernel.
- **Application** contains commands, queries, validators and the interfaces they need. It uses the template's pragmatic `IApplicationDbContext` abstraction with EF Core queries.
- **Infrastructure** implements persistence, GitHub authentication, Resend integration, media storage and durable background work.
- **Web.Api** maps endpoints, authorization and HTTP errors, and composes the application.
- **SharedKernel** contains small shared primitives: entities, results, errors and events.
- **web/** contains Next.js routes and UI. It calls the backend through typed API adapters. It does not write content to Git or connect directly to the database.

Domain and Application must not reference Infrastructure or Web.Api. Architecture tests enforce this rule. API request/response models form a separate contract from database entities; `contracts/openapi.json` produces the TypeScript types consumed by the frontend.

## Editing and publishing

An article has an editable revision and an independently stored published snapshot. Saving draft content changes the editable revision. Publishing promotes it to the public snapshot. Archiving or unpublishing removes it from public queries, article pages, RSS and the sitemap.

Every edit carries the concurrency token read when its editor opened. A stale save returns a conflict; the editor must reload and reconcile instead of silently replacing newer work. The database enforces the token as well, including simultaneous requests.

A publication transaction saves the article and its outbox jobs together. Cache invalidation and newsletter preparation are separate jobs so one provider outage does not prevent the other operation. Preparing a newsletter creates a draft; sending requires an explicit administrator action. Historical imports do not enqueue newsletters.

## Authentication

ASP.NET Core owns the GitHub OAuth flow and encrypted, HttpOnly session cookie. The verified primary GitHub email must match the configured owner. Authorization is checked on every protected API request. No public registration endpoint is exposed.

Browser requests pass through the same-origin Next.js `/api/backend/` proxy. Server components and actions forward the backend session cookie. Unsafe requests require a custom header; the proxy checks the browser request origin before forwarding. The backend has no permissive CORS policy. Development bypass is only available when both the backend Development environment and explicit bypass setting are enabled.

## Persistence and operations

PostgreSQL holds content, revisions and background job state. Uploaded media and data-protection keys use separate persistent volumes. Existing images remain under `web/public` so imported URLs continue to resolve. Back up the database, media and keys before production upgrades.

Public content reads initially use `no-store`, so drafts and withdrawn content do not linger in a frontend data cache. A signed revalidation endpoint supports durable invalidation of known site routes. Authentication and admin responses are never cached.

The original `content/` directory is retained as a migration archive. It is not a runtime fallback. Importing is an explicit operation with a dry-run mode and conflict policy, described in the deployment guide.
