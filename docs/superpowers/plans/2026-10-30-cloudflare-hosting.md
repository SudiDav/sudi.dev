# Cloudflare hosting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the existing main site under vinext on Cloudflare, and migrate the independent stream welcome portal without changing email providers or the visual design.

**Architecture:** Add vinext beside the existing Next.js scripts, exercise the built Workers runtime, and fix only demonstrated incompatibilities. Deploy separate main and stream previews, retain Vercel rollback, then cut over tested domains and transfer the scheduler once.

**Tech Stack:** Next.js 16 API, React, vinext, Vite, Cloudflare Workers Static Assets, Auth.js, Resend, GitHub Contents API.

**Spec:** `docs/superpowers/specs/2026-10-30-cloudflare-hosting-design.md` (revised to record the user's explicit vinext selection).

## Global Constraints

- No UI redesign or OpenNext adoption. Preserve component rendering unless a real runtime failure demands a change.
- Namecheap receives email; Resend sends it. Preserve all mail DNS and unrelated subdomains.
- Never expose credentials, enable production dev bypass, send a subscriber broadcast in testing, or purchase a plan without consent.
- Keep Vercel scripts, deployments, and environment configuration available for rollback.
- Keep production domains untouched until their respective Workers preview passes.
- User requested direct execution; implement inline and use one independent whole-branch review.

## Review Focus

- A draft slug or content bundle must not expose unpublished material on public routes or browser assets.
- Invalid sessions, non-owner GitHub identities, and unconfigured auth must deny admin APIs and mutations.
- A publishing commit is not proof of deployment; missing status metadata must remain unavailable.
- New Worker instances must not pretend process-local subscription limits are global, or duplicate weekly drafts.
- Preview hostnames and admin navigation must not emit production analytics or send subscriber emails.

## Task 1: Run the unchanged app under vinext

**Files:** `package.json`, `pnpm-lock.yaml`, `.gitignore`, `vite.config.ts`, `cloudflare.config.ts`, `tsconfig.json`.
**Interfaces:** Preserve existing `dev`, `build`, `start`, and tests. Add `dev:vinext`, `build:vinext`, `start:vinext`, `deploy:vinext`.

- [ ] Run compatibility check and generated Cloudflare initializer with no paid caching/image services.
- [ ] Pin installed direct migration dependencies; review generated config and ensure output/secret files are ignored.
- [ ] Run Workers dev and production build. Request `/`, `/work`, `/about`, `/blog`, a published article, metadata routes, `/admin/signin`, `/admin`, and auth session endpoints.
- [ ] Record actual failures before changing components or auth. Confirm original Next.js build remains available.

## Task 2: Fix observed Workers runtime incompatibilities

**Files:** Only affected config and existing modules, expected candidates `lib/content.ts`, `lib/site.ts`, `lib/publish.ts`, `auth.ts`, `proxy.ts`; introduce server-only build content module if filesystem reads fail.
**Interfaces:** Preserve `getPosts(): Promise<Post[]>`, `getProjects(): Promise<Project[]>`, `getSettings(): Promise<SiteSettings>`, publishing results, Auth.js handlers and server actions.

- [ ] For each observed failure, add a regression test that fails for that behavior, then make the minimum fix.
- [ ] Exercise existing content/site/publish tests, including missing content, drafts, stale-edit conflicts, and GitHub writes; never persist content to Worker local disk.
- [ ] Test anonymous, invalid-cookie, and non-owner access; ensure all server actions/API gates deny them and production bypass remains disabled.
- [ ] Validate images, fonts, styles, hydration, links, and dynamic route navigation in the built Workers runtime.

## Task 3: Replace Vercel-only operational behavior

**Files:** `lib/deployment-status.ts` (new facade if needed), `lib/vercel-deployments.ts`, `app/api/admin/deployment-status/route.ts`, `components/admin/deployment-status.tsx`, `lib/vercel-analytics.ts`, `components/site-analytics.tsx` (new), `app/layout.tsx`, `app/privacy/page.tsx`, `.env.example`.
**Interfaces:** `getDeploymentStatus(sha: string): Promise<DeploymentStatus>` retains status/url/error. A Cloudflare configuration must never query Vercel and misreport an unrelated deployment as ready.

- [ ] Add failing tests for unavailable Cloudflare status/read credentials and unavailable historical view counts; preserve Vercel fallback tests.
- [ ] Implement honest provider-aware status. Use documented SHA metadata when available; otherwise retain unavailable state, without blocking content saves.
- [ ] Add separate main-site public analytics configuration, production-host and non-admin guards; test host/path transitions without network analytics calls.
- [ ] Update privacy copy to match actual hosting/analytics and keep previews untracked.

## Task 4: Prepare independent stream assets and scheduler

**Files:** Reviewed `sites/stream/` source from PR #44, its Cloudflare config and `public/_headers`; `sites/weekly-article/worker.ts` and config (new); targeted scheduler test under `lib/` to use existing Vitest inclusion.
**Interfaces:** Stream serves only public files. Scheduler receives `SITE.fetch(Request): Promise<Response>` and `CRON_SECRET` bindings, invokes only `/api/cron/weekly-article`, and has no public HTTP trigger.

- [ ] Reconcile the reviewed static portal source without copying ignored deployment files. Translate its existing security headers and verify English/French links and noindex.
- [ ] Write failing scheduler tests for absent secret, unauthorized endpoint, upstream failure, and successful fixed-path invocation; implement the smallest service-bound scheduled handler.
- [ ] Keep schedule empty in preview. Preserve Monday `0 6 * * 1` only for eventual production activation after Vercel cron is disabled.
- [ ] Run existing weekly-article and email tests for deduplication and owner notices; no paid AI calls or actual broadcasts.

## Task 5: Verify, review, deploy previews, and cut over

**Files:** `.github/workflows/ci.yml`, deployment documentation, `docs/workflow.md`; private account configuration outside git.

- [ ] Run targeted affected tests first, typecheck/lint, then a single full regression/build pass because the runtime migration is cross-cutting. Exercise real built Workers HTTP responses and browser rendering.
- [ ] Obtain independent whole-branch review; resolve important findings with reproducing tests.
- [ ] Deploy stream and main previews after refreshing account authorization if required. Inspect compressed bundle size and actual plan limits before promising a free deployment.
- [ ] Configure build/runtime secrets privately, separate preview OAuth if needed, and production main-branch builds that include content commits. Verify sign-in and controlled publishing without changing the live OAuth callback or sending a newsletter.
- [ ] Cut over stream only after its preview passes. Cut over main only after its full acceptance checklist passes; then disable Vercel cron and enable Cloudflare cron, in that order.
- [ ] Verify DNS/HTTPS independently, mail records unchanged, analytics ingestion, and rollback instructions. If a required account action blocks progress, deliver the completed branch, exact verification evidence, and the specific remaining action.
