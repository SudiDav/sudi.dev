# Clean Architecture migration contract

Approved scope: five .NET 10 projects following the downloaded template, PostgreSQL content persistence, Next.js moved to web/, same routes/design/content, single GitHub admin, Resend and giscus retained. One backend process; durable outbox. This document fixes integration decisions for implementation.

## HTTP contract

All endpoints use `/api`. JSON camelCase. Public content responses keep the existing web `Post`, `Project`, `SiteSettings` shapes (read current lib/content.types.ts and lib/site.ts). Admin versions add `version: string` (opaque concurrency token). Posts also add `hasUnpublishedChanges: boolean`. Status is `Draft | Published | Archived`. Slugs immutable after creation. Missing import status means Published. Preserve all metadata including home overrides, subtitle, breadcrumb, shortDescription, social/SEO fields. Dates are YYYY-MM-DD strings; project years remain strings.

- GET /api/posts -> PostResponse[] (published snapshot only)
- GET /api/posts/{slug} -> PostResponse or 404 (published only)
- GET /api/projects -> ProjectResponse[]
- GET /api/projects/{slug} -> ProjectResponse or 404
- GET /api/settings -> SiteSettingsResponse
- GET /api/admin/posts -> PostResponse[] (current draft content + lifecycle status + version)
- GET /api/admin/posts/{slug} -> PostResponse
- POST /api/admin/posts -> full PostInput, returns PostResponse. slug supplied (web slugifies title); status controls initial publication.
- PUT /api/admin/posts/{slug} -> { expectedVersion: string, post: PostInput }, returns PostResponse. Saves draft revision only, ignores post.status for lifecycle.
- POST /api/admin/posts/{slug}/publish -> { expectedVersion }, returns PostResponse.
- POST /api/admin/posts/{slug}/archive -> { expectedVersion }, returns PostResponse.
- POST /api/admin/posts/{slug}/unpublish -> { expectedVersion }, returns PostResponse (Draft).
- GET /api/admin/posts/{slug}/revisions -> revision summaries including revision number, timestamp and content.
- POST /api/admin/projects -> ProjectInput including slug, returns ProjectResponse.
- PUT /api/admin/projects/{slug} -> { expectedVersion, project: ProjectInput }, returns ProjectResponse.
- PUT /api/admin/settings -> { expectedVersion, settings: SiteSettingsInput }, returns SiteSettingsResponse.
- POST /api/admin/media -> multipart file, returns { url }. Serve generated files at /media/{filename}; reject unsafe formats/paths and >5MB. Local persistent volume implementation.
- POST /api/subscriptions -> {email}, returns {ok:true, warning?:string}; failure ProblemDetails. Resend remains subscriber authority.
- GET /api/admin/subscribers -> {ok:true,contacts:[{id,email,createdAt,unsubscribed}],hasMore:boolean}; provider failure ProblemDetails.
- GET /api/admin/newsletters -> {ok:true,broadcasts:[{id,name,status:'draft'|'queued'|'sent',createdAt}]}; use provider id once created.
- POST /api/admin/newsletters/{id}/send -> {ok:true,id}; explicit only, never auto send. Confirm ownership and draft state.
- GET /api/auth/session -> {user:{name,email}} or 401.
- GET /api/auth/github -> OAuth challenge; callback `/api/auth/callback/github`, redirects to /admin or /admin/signin?error=unauthorized.
- POST /api/auth/logout -> clears backend session.
- POST /api/auth/dev -> local development only when Auth:DevBypass=true; issues real backend cookie; unavailable in Production.
- GET /health -> readiness.
- GET /openapi/v1.json -> generated OpenAPI schema in Development or export mode.

Errors: 400 validation, 401 unauthenticated, 403 unauthorized, 404 missing, 409 conflict, 503 external dependency unavailable. Never expose raw provider error bodies/secrets. All admin writes recheck backend authorization.

## Auth/deployment

Backend owns GitHub OAuth and encrypted HttpOnly SameSite=Lax cookie. GitHub verified primary email checked against configured admin email on login and every authorized request. Browser accesses backend through same-origin Next `/api/backend/[...path]` proxy, stripping that prefix then targeting `/api/{path}`. OAuth callback public path is `/api/backend/auth/callback/github`; backend explicitly sets public redirect URI. Next server actions forward cookie and set `X-Sudi-Request: 1`; backend requires this custom header for unsafe API requests except OAuth callback. No permissive CORS. The browser proxy must enforce same-origin for unsafe calls, must not add trust for cross-origin callers, and forward Set-Cookie correctly. Media uses a public Next proxy `/media/[...path]`. Backend URLs env API_BASE_URL (web), Web:BaseUrl (backend). Auth endpoints use custom header from web forms/proxy. No JWT in browser storage, no public registration.

## Publication

Draft updates never alter published content until Publish succeeds. Each mutation requires the version loaded by the editor (not silently refetched at save time) and rotates it. Database concurrency token enforces races. Publishing stores snapshot + state + independent outbox messages atomically: newsletter draft only on first-ever publication, cache invalidation on every visibility/content change. Outbox processing retries independently, maintains attempts/backoff and durable completion state, uses database claims/locking for multiple instances. Persist newsletter identity/idempotency and reconcile uncertain provider outcomes; never automatic send.

Cache invalidation: backend calls POST `{Web:BaseUrl}/api/revalidate` with `Authorization: Bearer <Cache:RevalidationSecret>` and body `{paths:[...]}`. Web verifies secret and permits only known site/content paths. Public web content fetch defaults `cache:no-store` (publication/withdrawal immediate); hook retained for route invalidation. Admin no-store.

## Import

`tools/ContentImport` is a .NET CLI receiving JSON export produced by a small Node script using existing gray-matter. Export all frontmatter/body as existing DTOs, slugs from filenames, settings JSON. CLI imports via Infrastructure DB in a transaction without newsletter/cache jobs. Default conflict policy fail; explicit `--conflicts skip|overwrite` flags. Repeat identical content is no-op and doesn't create revisions or duplicates. `--dry-run` validates/report counts without writes. Store import fingerprint; detect subsequent admin edits before declaring identical import unchanged. Existing media stay in web/public. Root content/ stays as migration archive, never runtime fallback. Legacy redirects exported to committed web manifest.

## Validation / ownership

Baseline: 7 relevant frontend files / 45 tests passed before edits. High risk: publication/privacy/auth/concurrency/import/outbox. Frontend and backend agents own their assigned directories; lead owns tools/, root orchestration, docs and final integration. No agent commits shared work. No production import/deploy/send. No changes to user's original uncommitted files.
