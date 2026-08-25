# Admin Publishing and Resend Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track admin changes from a `main` commit through Vercel production and make Resend subscription results truthful.

**Architecture:** GitHub publish functions return commit metadata. A protected admin route queries Vercel for the production deployment matching that commit, and a reusable client component polls it. Newsletter signup treats audience storage as the success boundary while keeping owner notification failure non-blocking.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, GitHub Contents API, Vercel Deployments API, Resend SDK, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-24-publishing-and-resend-design.md`

## Global Constraints

- Production publishing targets `main` through `GITHUB_BRANCH`.
- Vercel status is optional at runtime and must fail clearly when its credentials are absent.
- Resend DNS/API credentials are never hardcoded or committed.
- Audience storage success must not depend on owner notification email success.
- Every behavior change gets a failing test before implementation.

---

### Task 1: Publish metadata contract

**Files:**
- Modify: `lib/publish.ts`
- Modify: `app/admin/actions.ts`
- Test: `lib/publish.test.ts`

**Interfaces:**
- `commitFile()` produces `{ sha, url }` from the GitHub Contents API response.
- Publish actions expose `{ target, branch, sha?, commitUrl? }` inside their success result.

- [ ] **Step 1: Write the failing test** for a GitHub publish result carrying the returned commit SHA and URL, plus a local publish result with `target: 'local'`.
- [ ] **Step 2: Run `pnpm vitest run lib/publish.test.ts` and confirm the new assertions fail because publish functions currently return no metadata.
- [ ] **Step 3: Return commit metadata from `commitFile()` and thread it through post, project, settings, and image publish functions without changing existing write behavior.
- [ ] **Step 4: Run `pnpm vitest run lib/publish.test.ts` and confirm the focused tests pass.
- [ ] **Step 5: Commit with `git commit -m "feat: return publish commit metadata"`.

### Task 2: Vercel deployment status service

**Files:**
- Create: `lib/vercel-deployments.ts`
- Create: `lib/vercel-deployments.test.ts`
- Create: `app/api/admin/deployment-status/route.ts`

**Interfaces:**
- `getDeploymentStatus(sha)` returns `{ status, url?, error? }` and maps Vercel states to `queued`, `building`, `ready`, `error`, or `unavailable`.
- The route accepts a validated `sha` query parameter and returns the same status shape only for an authenticated admin.

- [ ] **Step 1: Write failing tests** for queued/building/ready/error responses, no matching deployment, missing configuration, and malformed SHA input.
- [ ] **Step 2: Run `pnpm vitest run lib/vercel-deployments.test.ts` and confirm the status mapping tests fail because the service does not exist.
- [ ] **Step 3: Implement the Vercel API client with `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, a bounded deployment list, and deterministic status mapping.
- [ ] **Step 4: Implement the protected route with `isAdmin()`, SHA validation, and JSON error responses.
- [ ] **Step 5: Run the focused Vercel tests and confirm they pass.
- [ ] **Step 6: Commit with `git commit -m "feat: add Vercel deployment status lookup"`.

### Task 3: Admin deployment progress UI

**Files:**
- Create: `components/admin/deployment-status.tsx`
- Modify: `components/admin/publish-notice.tsx`
- Modify: `app/admin/posts/[id]/edit/post-editor.tsx`
- Modify: `app/admin/(shell)/projects/new/project-form.tsx`

**Interfaces:**
- `DeploymentStatus` accepts `{ sha, branch, commitUrl }` and polls the protected route with bounded retries.
- `PublishNotice` accepts publish metadata from query parameters and renders the same status component.

- [ ] **Step 1: Add component-level assertions to the existing test setup for committed, deploying, ready, and failed copy.
- [ ] **Step 2: Run the focused UI test command and confirm the assertions fail because the status component and metadata wiring are absent.
- [ ] **Step 3: Implement polling with an immediate committed state, a three-second interval, a two-minute timeout, and cleanup on unmount.
- [ ] **Step 4: Wire post-editor success responses and project redirects to pass commit metadata into the component.
- [ ] **Step 5: Run focused tests plus lint and typecheck.
- [ ] **Step 6: Commit with `git commit -m "feat: show admin deployment progress"`.

### Task 4: Truthful Resend subscription behavior

**Files:**
- Modify: `app/admin/actions.ts`
- Modify: `components/newsletter-form.tsx`
- Modify: `lib/email.ts`
- Modify: `lib/email.test.ts`

**Interfaces:**
- `subscribe()` returns success only when `addToAudience()` succeeds and includes an optional non-blocking notification warning.
- The form shows “You’re on the list” only for audience success and shows a retryable error when storage fails.

- [ ] **Step 1: Write failing tests** for audience failure returning an error, audience success with notification failure returning success plus warning, and existing invalid-email behavior.
- [ ] **Step 2: Run the focused email/action tests and confirm the new assertions fail because `subscribe()` always returns `{ ok: true }`.
- [ ] **Step 3: Implement the smallest result contract change and keep notification errors out of the success boundary.
- [ ] **Step 4: Update the client form copy for stored, pending, and retry states.
- [ ] **Step 5: Run focused tests, then `pnpm test`, `pnpm lint`, and `pnpm typecheck`.
- [ ] **Step 6: Commit with `git commit -m "fix: make newsletter signup report storage failures"`.

### Task 5: Configuration and handoff

**Files:**
- Modify: `.env.example`
- Modify: `docs/deploy.md`
- Modify: `docs/admin-setup.md`

- [ ] **Step 1: Add `VERCEL_PROJECT_ID` and `VERCEL_TOKEN` documentation without values or secrets.
- [ ] **Step 2: Correct Resend setup text to distinguish audience storage from sender-domain verification and document the required SPF/MX DNS step.
- [ ] **Step 3: Run `git diff --check` and review the final diff for secrets or stale claims.
- [ ] **Step 4: Commit with `git commit -m "docs: document deployment and Resend status setup"`.
