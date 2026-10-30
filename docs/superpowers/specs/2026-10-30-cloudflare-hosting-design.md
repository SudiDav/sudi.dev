# Cloudflare hosting for sudi.dev and stream.sudi.dev

Status: proposed; compatibility reconnaissance completed; implementation and live cutover have not started.

## Intended result

Host the main personal website and the family streaming welcome page on Cloudflare. Keep the existing domain names, website appearance, owner-only admin, publishing, comments, newsletter subscriptions, broadcasts, and weekly draft generation. The migration is about website hosting: Namecheap Private Email continues receiving mail, and Resend continues sending notifications and newsletters.

The stream site remains a public welcome and setup portal. It stores no videos, provider credentials, or family accounts. This project does not build a video server or Syncio instance.

Sudi authorized the Cloudflare hosting recommendation and supplied Cloudflare's Next.js guide. The implementation choices below are proposed engineering decisions, not additional preferences attributed to Sudi.

## Evidence and approach

The isolated branch `feat/cloudflare-hosting` starts from the latest fetched `origin/develop`, commit `bbbde0d`. The primary checkout and unrelated user work are preserved.

Cloudflare already manages authoritative DNS for `sudi.dev`; its zone is active on `anna.ns.cloudflare.com` and `rick.ns.cloudflare.com`. Namecheap remains the registrar. The prior nameserver migration and comparison of all 21 DNS records are complete. This project requires no further nameserver change. Website cutover changes only the relevant existing zone records or Worker custom-domain bindings.

The main app uses Next.js 16.3.0, React 19.2.0, Auth.js (`next-auth` beta), GitHub-backed publishing, runtime reads of local content, Resend, and a Vercel weekly cron. Admin deployment status and article view totals currently query Vercel APIs.

Cloudflare's current default recommendation is vinext, which is beta. Running `npx vinext check` reported eight supported import families, three supported configuration options, and **one incompatible library: next-auth**. The reported 95% compatibility is a static scan, not evidence that the app runs correctly on Workers.

**Proposed choice:** use the OpenNext Cloudflare adapter as the first implementation candidate for the main app. It retains Next.js build output and documents Next.js 16 support. Preserve the current Auth.js identity and authorization model rather than replace login solely to fit vinext. OpenNext is a compatibility candidate, not a proven working deployment yet. Its documented lack of Node middleware support makes the existing `proxy.ts` a specific validation item. If an equivalent supported redirect cannot be implemented while retaining the server-side security gates, leave the main site on Vercel and report the blocker; do not silently rewrite authentication or weaken authorization.

Deploy the stream portal separately as Cloudflare Workers Static Assets. It needs no Next.js adapter or application server.

## Components and behavior

### Main website

Keep Next.js development and Vercel build commands available during the transition. Add separately named Cloudflare build, local Workers preview, and deploy commands with locked compatible dependency versions. Read the installed Next.js 16 documentation before changing framework code. Check current framework/security compatibility before pinning versions; scope any required patch updates to the migration.

Public routes, feeds, metadata, social previews, old article redirects, images, fonts, and comments must work in the built Workers runtime. Prefer existing static image assets initially; do not activate a paid image product without approval.

Content in `content/posts`, `content/projects`, and `content/site.json` is git-backed. Generate a server-only content manifest at build time if the adapter cannot include the required filesystem reads reliably. Draft bodies must never become public static assets or browser bundles. GitHub remains the authoritative write destination in production; no local Worker filesystem persistence. An admin save creates a GitHub commit, then a production rebuild makes that revision visible. Preserve the existing latest-content checks and conflicts in publishing. A new build must refresh content without stale caches resurrecting older revisions.

Use only the cache/storage bindings required by the tested adapter configuration. Do not add an application database as part of this migration. Admin pages, authenticated responses, mutations, and secret-bearing endpoints must never enter a shared public cache.

### Admin and authentication

Retain GitHub sign-in, the ADMIN_EMAIL allowlist, JWT sessions, and `isAdmin()` checks in the admin layout, every server action, and protected API routes. Any proxy change is only a redirect convenience; it must not replace these gates. Production must never enable AUTH_DEV_BYPASS.

Keep the production callback at `https://sudi.dev/api/auth/callback/github`. A Cloudflare preview must use a separate test OAuth application/callback if a real login test needs another hostname. Never repoint the live OAuth application to an unverified preview. The owner enters any required login/consent privately.

Secrets move directly into Cloudflare's secret storage through an approved secure path; never into code, logs, chat, public variables, or output artifacts. Inventory variable names and presence without printing values. Public giscus and analytics identifiers are build configuration, not secret API credentials.

### Publishing and deployment visibility

Configure a single Cloudflare production build for commits to `main`; feature/develop branches produce previews only. Respect the existing develop-to-main PR and required CI workflow. Content-only commits must trigger builds too. Keep the Vercel production deployment available for rollback until Cloudflare is proven.

Replace the admin's Vercel-specific deployment query with a provider-aware interface. On Cloudflare, match the publishing commit SHA against documented Cloudflare build/deployment metadata before reporting ready. A failed or unavailable API must display unavailable/error, never a fabricated successful deployment. If the necessary metadata or read-only credential is unavailable, show the honest unavailable state and link to the Cloudflare dashboard; this does not block saving a commit. Keep Vercel behavior available for rollback.

### Email and newsletters

Retain Namecheap MX records, SPF, DKIM, DMARC if present, Resend verification records, and existing forwarding/aliases. Do not enable Cloudflare Email Routing or change mailbox providers.

Move the existing Resend integration configuration to the Worker privately. Preserve subscription storage, owner notifications, contact management, broadcast draft creation, unsubscribe handling, and admin-only sending. Publishing still prepares a newsletter draft; it does not automatically send to subscribers. Preview tests use mocks or a controlled owner address and must never send a real audience broadcast.

The current subscription limiter is explicitly process-local. Preserve its bounded behavior and provider idempotency; do not claim it becomes a global limit on Workers. A shared abuse-control redesign is separate work.

### Weekly draft job

Preserve Monday 06:00 UTC (08:00 Lubumbashi), unpublished draft creation, same-week deduplication, and owner-only notification. Implement a small companion scheduled Worker that invokes the existing protected endpoint through a service binding or a fixed approved URL. Keep the shared bearer secret private; reject unauthorized calls. A non-success result must be recorded as a failed run, without logging keys or article prompt data.

During preview the schedule is disabled. Test authentication and scheduling using a stub service, including same-week retries, without incurring AI charges or sending real newsletters. Enable the Cloudflare schedule only after disabling the Vercel schedule and ensuring any in-flight run has finished. On rollback reverse that order: disable Cloudflare first, then re-enable Vercel. Never run both schedules deliberately.

### Analytics

The stream portal already has its own public Cloudflare Web Analytics identifier, production-host guard, disclosure, and restrictive content security policy. Preserve these on Cloudflare and check ingestion separately from script delivery.

Create a separate Web Analytics entry for `sudi.dev`. Use its own public site token; do not reuse the stream token. Replace production Vercel beacon rendering with Cloudflare analytics, avoid double counting, and update the privacy page. No tracking on local/preview hosts or owner-only admin routes.

Current article view totals come from Vercel. Do not combine old Vercel totals with new Cloudflare counts or label a partial time range as lifetime. Until a supported equivalent is implemented and verified, the existing admin UI must show analytics unavailable rather than zero or stale totals. Cloudflare's dashboard provides the new site statistics. Historical Vercel data stays in Vercel.

### Stream portal

Use the reviewed portal source from branch `feat/family-stream-portal`, commit `ba5c5ee` / PR #44. Reconcile the source through the normal PR workflow; do not copy deployment credentials or ignored files. Keep it as a separate Cloudflare project in the same repo.

Translate its Vercel response headers to a Workers Static Assets `_headers` file, retaining CSP, frame protection, noindex, MIME protection, and referrer policy. Preserve English/French behavior, contact link, setup instructions, and hostname-limited analytics. The preview must not collect family information or provider keys.

## Delivery stages and acceptance gates

1. **Local preparation:** lock adapter versions; add configs and server-only content packaging where required; implement provider-specific status/analytics behavior and disabled scheduler. Keep production domains untouched.
2. **Local verification:** typecheck and lint; targeted tests for changed content/auth/publishing/email/status/cron behavior; then one broader build/runtime regression pass because this changes the execution environment across the site. Exercise the actual local Workers preview, not just `next dev`.
3. **Cloudflare preview:** refresh Cloudflare authorization when needed; deploy to preview hostnames with isolated configuration, no live schedule, and no subscriber sends. Measure compressed Worker size, resource limits, cold requests, and required bindings against the account's plan. If a paid plan is needed, present the actual requirement and cost for approval before any purchase.
4. **Stream cutover first:** verify English/French pages, links, headers, HTTPS, and analytics delivery. Switch only stream.sudi.dev after the preview works. Keep the Vercel alias as fallback.
5. **Main cutover:** verify public content and draft isolation, owner GitHub login, denied non-owner access, protected APIs/actions, images/feeds/redirects, a controlled publishing edit and subsequent build, newsletter integration without broadcasting, and scheduled-job contract. Confirm required production secrets are present. Switch only the apex website record/Worker custom domain; retain the existing www behavior and unrelated subdomains. Then transfer the weekly schedule exactly once.
6. **Observe and document:** confirm DNS and HTTPS from independent resolvers, HTTP results and cache behavior, mail DNS unchanged, analytics ingestion, and a successful main-branch build. Record deployment IDs, changed DNS records, and rollback steps. Do not delete Vercel projects or historical data.

A failing gate leaves the affected website on Vercel. Report what passed, what failed, and the next concrete fix. Passing the stream stage does not imply the main app is migrated.

## Rollback

Before cutover, record the exact live website DNS targets and Vercel deployment aliases. Restore only the changed website target if Cloudflare fails; preserve all email and unrelated DNS records. Retain compatible Vercel scripts and its private environment configuration. Reverse the scheduler transfer in the order above. If a content change landed during migration, rebuild the fallback from the same production commit rather than serve stale content.

## Scope limits and decision ownership

No video storage/proxying, mailbox migration, paid purchase, automatic newsletter send, domain registrar transfer, auth-provider rewrite, or unrelated subdomain changes. Cloudflare account login and any new sensitive authorization are completed by Sudi privately when required. Engineering choices such as exact compatible adapter versions, content manifest shape, cache bindings, preview project names, and test fixtures are delegated to implementation within these constraints.

## Sources

- Cloudflare Next.js recommendation and compatibility preflight: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- Cloudflare OpenNext configuration and middleware limitations: https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/
- OpenNext Next.js 16 support and Worker size limits: https://opennext.js.org/cloudflare
- Workers Static Assets: https://developers.cloudflare.com/workers/static-assets/
- Existing repo deployment and workflow: `docs/deploy.md`, `docs/workflow.md`.
