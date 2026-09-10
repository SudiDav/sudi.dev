# Reader-friendly Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace giscus with native Google/GitHub and moderated-guest comments while keeping the initial Vercel and Neon cost at $0.

**Architecture:** Keep Auth.js JWT sessions for identity and keep `isAdmin()` as the independent owner authorization boundary. A server-only data access layer uses Neon's HTTP driver and returns explicit public/admin DTOs; Server Actions validate every mutation and a native React comment section renders the result.

**Tech Stack:** Next.js 16.3 App Router, React 19.2, Auth.js 5 beta, TypeScript 5, Tailwind CSS 4, Neon Postgres, `@neondatabase/serverless`, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-09-10-reader-comments-design.md`

## Global Constraints

- The initial deployment must use Neon's $0 plan; do not enable a paid plan or metered add-on.
- Google and GitHub reader sessions must never grant `/admin` access unless the normalized session email equals `ADMIN_EMAIL`.
- Store no OAuth tokens, raw IP addresses, or commenter email addresses.
- Render user text as text only; do not accept Markdown or raw HTML.
- Authenticated comments publish immediately; guest comments enter `pending` moderation.
- Support only one reply level in the first version.
- Treat every Server Action as a public endpoint: validate input and perform authorization at the mutation boundary.
- Use only targeted tests for the behavior changed in each task.
- Keep branch, commit, and pull-request metadata free of assistant attribution.

## File map

- `db/migrations/0001_comments.sql` — durable Postgres schema, indexes, constraints, and status values.
- `lib/db.ts` — server-only Neon client configuration.
- `lib/comments/types.ts` — comment domain types and public/admin DTOs.
- `lib/comments/validation.ts` — deterministic validation and link counting.
- `lib/comments/identity.ts` — HMAC actor keys for authenticated and guest identities.
- `lib/comments/store.ts` — all SQL and database-row-to-DTO mapping.
- `lib/comments/service.ts` — submission, reply, throttling, and moderation rules over a store interface.
- `lib/auth-policy.ts` — pure reader/admin authentication decisions.
- `types/next-auth.d.ts` — stable commenter identity on Auth.js JWT/session types.
- `auth.ts` — Google provider, reader sign-in, session identity, unchanged owner authorization.
- `app/blog/[slug]/comment-actions.ts` — public comment Server Action.
- `components/comment-section.tsx` — client thread and form state.
- `components/comment-auth-buttons.tsx` — server-side Google/GitHub sign-in forms.
- `components/article-comments.tsx` — server boundary loading session and published comments.
- `app/admin/(shell)/comments/actions.ts` — admin-only moderation mutations.
- `app/admin/(shell)/comments/page.tsx` — moderation queue and status controls.
- `lib/admin-comments.ts` — Neon-backed admin list/count adapter replacing GitHub Discussions.
- `.env.example`, `README.md`, `docs/deploy.md`, `docs/admin-setup.md`, `app/privacy/page.tsx` — operator and privacy documentation.
- `components/giscus-comments.tsx` — deleted after the native path is complete.

---

### Task 1: Add the Neon schema and server-only connection

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `db/migrations/0001_comments.sql`
- Create: `lib/db.ts`
- Create: `lib/db.test.ts`

**Interfaces:**
- Produces: `getSql(): NeonQueryFunction<false, false>` for database adapters.
- Produces: a `comments` table with the columns consumed by Task 3.

- [ ] **Step 1: Write the failing database configuration test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('getSql', () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL
    vi.resetModules()
  })

  it('fails clearly when DATABASE_URL is missing', async () => {
    const { getSql } = await import('./db')
    expect(() => getSql()).toThrow('DATABASE_URL is not configured')
  })
})
```

- [ ] **Step 2: Run the test and verify the missing module failure**

Run: `pnpm vitest run lib/db.test.ts`

Expected: FAIL because `lib/db.ts` does not exist.

- [ ] **Step 3: Install the Neon serverless driver**

Run: `pnpm add @neondatabase/serverless`

Expected: `package.json` and `pnpm-lock.yaml` record the current stable driver.

- [ ] **Step 4: Implement the lazy server-only Neon client**

```ts
import 'server-only'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

let sql: NeonQueryFunction<false, false> | undefined

export function getSql() {
  if (sql) return sql
  const url = process.env.DATABASE_URL?.trim()
  if (!url) throw new Error('DATABASE_URL is not configured')
  sql = neon(url)
  return sql
}
```

- [ ] **Step 5: Add the migration with database-enforced invariants**

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_slug text NOT NULL CHECK (article_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  author_type text NOT NULL CHECK (author_type IN ('google', 'github', 'guest')),
  author_key text,
  author_name text NOT NULL CHECK (char_length(author_name) BETWEEN 1 AND 80),
  author_avatar_url text,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  status text NOT NULL CHECK (status IN ('pending', 'published', 'rejected', 'spam')),
  actor_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((author_type = 'guest' AND author_key IS NULL) OR
         (author_type IN ('google', 'github') AND author_key IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS comments_public_thread_idx
  ON comments (article_slug, status, created_at);
CREATE INDEX IF NOT EXISTS comments_parent_idx ON comments (parent_id);
CREATE INDEX IF NOT EXISTS comments_actor_recent_idx ON comments (actor_key, created_at DESC);
```

- [ ] **Step 6: Run the targeted test**

Run: `pnpm vitest run lib/db.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the database foundation**

```bash
git add package.json pnpm-lock.yaml db/migrations/0001_comments.sql lib/db.ts lib/db.test.ts
git commit -m "feat: add comments database foundation"
```

---

### Task 2: Implement validation and private actor identities

**Files:**
- Create: `lib/comments/types.ts`
- Create: `lib/comments/validation.ts`
- Create: `lib/comments/validation.test.ts`
- Create: `lib/comments/identity.ts`
- Create: `lib/comments/identity.test.ts`

**Interfaces:**
- Produces: `CommentStatus`, `AuthorType`, `PublicComment`, `AdminComment`, `SubmitCommentInput`, and `SubmitCommentResult`.
- Produces: `validateSubmission(input): { ok: true; value: ValidatedSubmission } | { ok: false; message: string }`.
- Produces: `authenticatedActorKey(provider, subject)` and `guestActorKey(ip)`.

- [ ] **Step 1: Define domain and DTO types**

```ts
export type AuthorType = 'google' | 'github' | 'guest'
export type CommentStatus = 'pending' | 'published' | 'rejected' | 'spam'

export type PublicComment = {
  id: string
  parentId: string | null
  authorName: string
  authorAvatarUrl: string | null
  authorType: AuthorType
  body: string
  createdAt: string
}

export type SubmitCommentInput = {
  articleSlug: string
  parentId: string | null
  guestName: string
  body: string
}

export type SubmitCommentResult =
  | { ok: true; status: 'pending' | 'published'; comment?: PublicComment }
  | { ok: false; message: string }
```

- [ ] **Step 2: Write failing validation tests**

Cover these exact cases in `validation.test.ts`: trim valid values; reject an invalid slug; reject a guest name over 80 characters; reject an empty or over-4000-character body; reject more than two `http://` or `https://` links.

```ts
expect(validateSubmission({
  articleSlug: 'after-amen', parentId: null, guestName: ' Ada ', body: ' Thoughtful. '
})).toEqual({
  ok: true,
  value: { articleSlug: 'after-amen', parentId: null, guestName: 'Ada', body: 'Thoughtful.' }
})
```

- [ ] **Step 3: Run validation tests and verify failure**

Run: `pnpm vitest run lib/comments/validation.test.ts`

Expected: FAIL because `validateSubmission` is missing.

- [ ] **Step 4: Implement deterministic validation**

Use `^[a-z0-9]+(?:-[a-z0-9]+)*$`, name length `1..80`, body length `1..4000`, and `body.match(/https?:\/\//gi)?.length ?? 0` with a maximum of two links. Return reader-facing messages instead of throwing.

- [ ] **Step 5: Write failing HMAC identity tests**

Set `COMMENT_HMAC_SECRET=test-secret-at-least-32-characters`, assert identical inputs are stable, assert Google and GitHub subjects with the same string differ, and assert the raw subject/IP does not appear in the output.

- [ ] **Step 6: Implement HMAC-SHA256 actor keys**

```ts
import 'server-only'
import { createHmac } from 'node:crypto'

function digest(value: string) {
  const secret = process.env.COMMENT_HMAC_SECRET?.trim()
  if (!secret || secret.length < 32) throw new Error('COMMENT_HMAC_SECRET is not configured')
  return createHmac('sha256', secret).update(value).digest('hex')
}

export const authenticatedActorKey = (provider: 'google' | 'github', subject: string) =>
  digest(`auth:${provider}:${subject}`)
export const guestActorKey = (ip: string) => digest(`guest:${ip}`)
```

- [ ] **Step 7: Run the targeted domain tests**

Run: `pnpm vitest run lib/comments/validation.test.ts lib/comments/identity.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit the domain primitives**

```bash
git add lib/comments
git commit -m "feat: add comment validation and identities"
```

---

### Task 3: Build the comment store and application service

**Files:**
- Create: `lib/comments/store.ts`
- Create: `lib/comments/service.ts`
- Create: `lib/comments/service.test.ts`

**Interfaces:**
- Consumes: `getSql()`, validation types, and HMAC actor keys.
- Produces: `CommentStore` with `listPublished`, `findParent`, `lastCreatedAt`, `insert`, `listAdmin`, `countAll`, `setStatus`, and `deleteById` methods.
- Produces: `submitComment(store, command)`, `getPublishedComments(store, slug)`, and `moderateComment(store, id, status)`.

- [ ] **Step 1: Define the store interface and write failing service tests with a fake store**

Test these exact rules:

- an authenticated Google command inserts `published` with a non-null author key;
- a guest command inserts `pending` and ignores any avatar;
- a submission within 60 seconds of the same actor returns `Please wait a moment before commenting again.`;
- a reply to a missing, different-article, unpublished, or already-nested parent is rejected;
- public listing contains only the store's published DTOs; and
- moderation accepts only `published`, `rejected`, or `spam` as target states; and
- deletion calls `deleteById` and reports whether a row existed.

```ts
const result = await submitComment(store, {
  input: { articleSlug: 'after-amen', parentId: null, guestName: '', body: 'I agree.' },
  identity: { type: 'google', subject: '123', name: 'Ada', avatarUrl: null },
  actorKey: 'actor',
  now: new Date('2026-09-10T10:00:00Z'),
})
expect(store.insert).toHaveBeenCalledWith(expect.objectContaining({ status: 'published' }))
```

- [ ] **Step 2: Run service tests and verify failure**

Run: `pnpm vitest run lib/comments/service.test.ts`

Expected: FAIL because the service and store interfaces do not exist.

- [ ] **Step 3: Implement the service rules over `CommentStore`**

Keep framework imports out of this file. Accept `now` from the command so cooldown behavior is deterministic. Return `SubmitCommentResult`; do not expose actor keys or moderation metadata.

- [ ] **Step 4: Implement parameterized SQL in `store.ts`**

Use only tagged-template queries from `getSql()`. Public queries must select explicit public columns and include `WHERE article_slug = ${slug} AND status = 'published'`. Admin queries may select status and article slug but must never select or return `actor_key` or `author_key` to React components.

For a reply insert, perform the parent validation read and insert through the service before returning a public DTO. `setStatus` must update `updated_at = now()` and return whether a row was changed.

- [ ] **Step 5: Run the service tests**

Run: `pnpm vitest run lib/comments/service.test.ts lib/comments/validation.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the store and service**

```bash
git add lib/comments/store.ts lib/comments/service.ts lib/comments/service.test.ts
git commit -m "feat: add comment storage service"
```

---

### Task 4: Extend Auth.js for reader identity without weakening admin access

**Files:**
- Create: `lib/auth-policy.ts`
- Create: `lib/auth-policy.test.ts`
- Create: `types/next-auth.d.ts`
- Modify: `auth.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `canSignIn({ provider, profile, userEmail, adminEmail, devBypassEnabled }): boolean` and `isAdminEmail(email, adminEmail): boolean`.
- Produces: `session.user.commenterId` and `session.user.provider` for Google/GitHub sessions.
- Preserves: `isAdmin(): Promise<boolean>` and the dev bypass behavior.

- [ ] **Step 1: Write failing pure policy tests**

Test that verified Google profiles and GitHub profiles can sign in; unverified Google profiles cannot; the dev provider works only when the bypass flag and admin email both match; and `isAdminEmail` returns true only for the case-insensitive normalized `ADMIN_EMAIL` value.

- [ ] **Step 2: Run policy tests and verify failure**

Run: `pnpm vitest run lib/auth-policy.test.ts`

Expected: FAIL because `lib/auth-policy.ts` is missing.

- [ ] **Step 3: Implement the pure policy helpers and re-run tests**

Run: `pnpm vitest run lib/auth-policy.test.ts`

Expected: PASS.

- [ ] **Step 4: Add Google and provider-qualified session identity**

In `auth.ts`, import `next-auth/providers/google`, register `[Google, GitHub]` plus the existing development provider when enabled, delegate `signIn` to `canSignIn`, and add JWT/session callbacks:

```ts
jwt({ token, account }) {
  if (account?.provider === 'google' || account?.provider === 'github') {
    token.commentProvider = account.provider
    token.commentSubject = account.providerAccountId
  }
  return token
},
session({ session, token }) {
  if (session.user &&
      (token.commentProvider === 'google' || token.commentProvider === 'github') &&
      typeof token.commentSubject === 'string') {
    session.user.provider = token.commentProvider
    session.user.commenterId = token.commentSubject
  }
  return session
}
```

Keep `authorized()` and `isAdmin()` based on `isAdminEmail`; the proxy matcher remains `/admin/:path*`.

- [ ] **Step 5: Add Auth.js module augmentation**

Augment `Session.user` with optional `provider: 'google' | 'github'` and `commenterId: string`, and augment `JWT` with optional `commentProvider` and `commentSubject`.

- [ ] **Step 6: Document Google variables in `.env.example`**

Add `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` with callback examples for localhost, the preview alias, and `https://sudi.dev/api/auth/callback/google`. Correct the existing comments that incorrectly describe GitHub credentials as Google credentials.

- [ ] **Step 7: Run auth and admin authorization tests**

Run: `pnpm vitest run lib/auth-policy.test.ts app/admin/actions.test.ts`

Expected: PASS, including the existing non-admin rejections.

- [ ] **Step 8: Commit reader authentication**

```bash
git add auth.ts lib/auth-policy.ts lib/auth-policy.test.ts types/next-auth.d.ts .env.example
git commit -m "feat: add reader social authentication"
```

---

### Task 5: Replace the giscus iframe with the native public thread

**Files:**
- Create: `app/blog/[slug]/comment-actions.ts`
- Create: `app/blog/[slug]/comment-actions.test.ts`
- Create: `components/comment-section.tsx`
- Create: `components/comment-auth-buttons.tsx`
- Modify: `components/article-comments.tsx`
- Modify: `app/blog/[slug]/page.tsx`

**Interfaces:**
- Consumes: `auth()`, `headers()`, comment service/store, and `SubmitCommentResult`.
- Produces: `submitArticleComment(previousState, formData): Promise<SubmitCommentResult>`.
- Produces: `ArticleComments({ slug }: { slug: string })` server component.

- [ ] **Step 1: Write failing Server Action tests**

Mock `auth`, `headers`, `revalidatePath`, `getPost`, and `submitComment`. Assert:

- an authenticated session derives identity from `session.user.provider/commenterId`, never from form fields;
- a guest uses `x-forwarded-for` only as HMAC input and passes no raw IP to the service;
- a nonexistent article is rejected before insertion;
- a published result calls `revalidatePath('/blog/after-amen')`;
- a pending result does not expose the comment DTO; and
- unexpected database errors return `Comments are temporarily unavailable. Please try again.`.

- [ ] **Step 2: Run the action test and verify failure**

Run: `pnpm vitest run 'app/blog/[slug]/comment-actions.test.ts'`

Expected: FAIL because the Server Action is missing.

- [ ] **Step 3: Implement the secure Server Action**

Use `await headers()` as required by Next.js 16. Parse the first `x-forwarded-for` address, fall back to `unknown`, HMAC it immediately, and never log it. Read `articleSlug`, `parentId`, `guestName`, and `body` from `FormData`; return the service's constrained result.

- [ ] **Step 4: Run the action test**

Run: `pnpm vitest run 'app/blog/[slug]/comment-actions.test.ts'`

Expected: PASS.

- [ ] **Step 5: Build the server authentication buttons**

Create two forms whose inline Server Actions call `signIn('google', { redirectTo: `/blog/${slug}#comments` })` and `signIn('github', { redirectTo: `/blog/${slug}#comments` })`. For a signed-in reader, render a third form whose inline action calls `signOut({ redirectTo: `/blog/${slug}#comments` })`. Use the existing GitHub icon and a small inline Google mark; keep provider secrets server-side.

- [ ] **Step 6: Build the client thread and form**

Use React 19 `useActionState(submitArticleComment, initialState)`. Render:

- top-level comments oldest-first and each direct reply beneath its parent;
- avatar image when present and initials otherwise;
- provider label only in accessible text, not as visual clutter;
- signed-in identity plus sign-out control;
- guest name input only when signed out;
- body textarea with `maxLength={4000}` and preserved text on errors;
- inline pending, success, moderation, and unavailable states; and
- a reply button that sets `parentId` without allowing replies to replies.

Use `<time dateTime={createdAt}>`, explicit `<label>` elements, visible keyboard focus, `aria-live="polite"`, and disabled/pending button state.

- [ ] **Step 7: Replace the article server boundary**

Change `ArticleComments` to accept `slug`, catch missing database configuration as an unavailable state, load `auth()` and `getPublishedComments`, and pass only public/session DTOs to the client. Update `app/blog/[slug]/page.tsx` to render `<ArticleComments slug={post.slug} />`.

- [ ] **Step 8: Run targeted public-comment verification**

Run: `pnpm vitest run 'app/blog/[slug]/comment-actions.test.ts' lib/comments/service.test.ts`

Run: `pnpm typecheck`

Expected: all targeted tests and type checking PASS.

- [ ] **Step 9: Commit the public experience**

```bash
git add 'app/blog/[slug]' components/article-comments.tsx components/comment-section.tsx components/comment-auth-buttons.tsx
git commit -m "feat: add native article comments"
```

---

### Task 6: Move moderation and counts from GitHub Discussions to Neon

**Files:**
- Modify: `lib/admin-comments.ts`
- Create: `lib/admin-comments.test.ts`
- Create: `app/admin/(shell)/comments/actions.ts`
- Create: `app/admin/(shell)/comments/actions.test.ts`
- Modify: `app/admin/(shell)/comments/page.tsx`
- Modify: `lib/admin-data.ts`
- Modify: `lib/admin-data.test.ts`

**Interfaces:**
- Consumes: `CommentStore.listAdmin`, `countAll`, `setStatus`, `deleteById`, and `isAdmin()`.
- Produces: `getAdminComments(status?)`, `getAdminCommentCount()`, and `moderateCommentAction(id, status)`.

- [ ] **Step 1: Replace GitHub adapter tests with Neon adapter tests**

Assert that missing database configuration returns `{ comments: [], error }`, status filters are passed to the store, and counts return the store count without GitHub API requests.

- [ ] **Step 2: Write failing moderation action tests**

Assert a non-admin cannot mutate; allowed states call `setStatus`; unknown states and malformed UUIDs are rejected; successful mutations revalidate `/admin/comments`, `/admin`, and the affected article path.

- [ ] **Step 3: Run the admin comment tests and verify failure**

Run: `pnpm vitest run lib/admin-comments.test.ts 'app/admin/(shell)/comments/actions.test.ts'`

Expected: FAIL against the GitHub implementation and missing action.

- [ ] **Step 4: Implement the Neon admin adapter and authorized actions**

Keep `isAdmin()` inside every exported mutation. Return generic failure text to the browser and log no actor keys, connection strings, or session tokens.

- [ ] **Step 5: Rebuild the moderation page**

Replace external GitHub links with status chips and POST forms for Publish, Reject, Spam, and Delete. Show author type, article link, comment body, and timestamp. Add status filter links for All, Pending, Published, Rejected, and Spam while retaining the existing responsive admin cards.

- [ ] **Step 6: Update dashboard comment totals**

Change `commentsPeriod` to `all stored comments` and cover the successful and unavailable cases in `lib/admin-data.test.ts`.

- [ ] **Step 7: Run targeted admin regression tests**

Run: `pnpm vitest run lib/admin-comments.test.ts lib/admin-data.test.ts 'app/admin/(shell)/comments/actions.test.ts' app/admin/actions.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit moderation**

```bash
git add lib/admin-comments.ts lib/admin-comments.test.ts lib/admin-data.ts lib/admin-data.test.ts 'app/admin/(shell)/comments'
git commit -m "feat: add native comment moderation"
```

---

### Task 7: Remove giscus and align privacy and deployment documentation

**Files:**
- Delete: `components/giscus-comments.tsx`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/deploy.md`
- Modify: `docs/admin-setup.md`
- Modify: `app/privacy/page.tsx`
- Modify: `.gitignore`
- Modify: `.dockerignore`

**Interfaces:**
- Removes: all `NEXT_PUBLIC_GISCUS_*` runtime dependencies and GitHub Discussions claims.
- Documents: Google OAuth callbacks, Neon migration, HMAC secret generation, and free-plan monitoring.

- [ ] **Step 1: Search for obsolete comment-system claims**

Run: `rg -n "giscus|GitHub Discussions|NEXT_PUBLIC_GISCUS|comments.json|comment-form" --glob '!docs/superpowers/**' .`

Expected: matches identify every file that must change.

- [ ] **Step 2: Remove the giscus client and configuration**

Delete `components/giscus-comments.tsx`; remove giscus variables from `.env.example`; remove stale ignore rules for `content/comments.json` when no code still uses that file.

- [ ] **Step 3: Update operator documentation**

Document these commands and settings:

```bash
openssl rand -base64 32 # COMMENT_HMAC_SECRET
pnpm typecheck
pnpm test
```

Document applying `db/migrations/0001_comments.sql` in the Neon SQL Editor before deployment, configuring `DATABASE_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `COMMENT_HMAC_SECRET`, and checking Neon usage without enabling paid add-ons.

- [ ] **Step 4: Rewrite the privacy disclosures**

State that public name/avatar/provider and comment text are stored in Neon; guest names and comments are stored without email; OAuth tokens and raw IPs are not stored; a keyed non-reversible identifier is used for throttling; and deletion is available by contacting the site owner. Update the visible `UPDATED` date to `10 September 2026`.

- [ ] **Step 5: Verify no stale runtime or documentation references remain**

Run: `rg -n "giscus|GitHub Discussions|NEXT_PUBLIC_GISCUS|comments.json|comment-form" --glob '!docs/superpowers/**' .`

Expected: no matches, except historical content that is intentionally quoted and explained.

- [ ] **Step 6: Run formatting and targeted static verification**

Run: `pnpm eslint auth.ts lib/db.ts lib/comments components/article-comments.tsx components/comment-section.tsx components/comment-auth-buttons.tsx 'app/blog/[slug]/comment-actions.ts' lib/admin-comments.ts lib/admin-data.ts 'app/admin/(shell)/comments' app/privacy/page.tsx`

Run: `pnpm typecheck`

Expected: PASS.

- [ ] **Step 7: Commit cleanup and documentation**

```bash
git add -A
git commit -m "docs: document reader comment operations"
```

---

### Task 8: Provision the free services and verify a Vercel preview

**Files:**
- No repository files unless preview findings require a focused fix.

**Interfaces:**
- Consumes: committed migration and environment-variable names.
- Produces: Neon free database, Google OAuth web client, configured Vercel environments, and a verified preview.

- [ ] **Step 1: Push the neutral feature branch**

Before pushing, inspect branch name and commit messages for prohibited attribution.

Run: `git log --format='%h %s%n%b' origin/develop..HEAD && git branch --show-current`

Run: `git push -u origin feat/reader-comments`

Expected: Vercel creates a preview deployment for the branch.

- [ ] **Step 2: Prepare the Neon Marketplace integration**

In Vercel, open `sudi-dev` → Storage/Marketplace → Neon, select the Free plan, select Production/Preview/Development environments, and stop immediately before the action that creates or links the persistent integration.

- [ ] **Step 3: Obtain explicit confirmation, then create the Neon resource**

The confirmation must state that Vercel will create/link a third-party Neon database and grant it persistent project access. After confirmation, create it and verify `DATABASE_URL` exists for the intended environments without revealing its value.

- [ ] **Step 4: Apply the migration**

Open the Neon SQL Editor, paste `db/migrations/0001_comments.sql`, and stop before running it. Explain that it creates the permanent comments table and indexes; after explicit confirmation, run it and verify the table exists.

- [ ] **Step 5: Prepare Google OAuth credentials**

Create an OAuth consent configuration for `sudi.dev` and a Web Application client with:

- JavaScript origin: `https://sudi.dev`
- Production redirect: `https://sudi.dev/api/auth/callback/google`
- Preview redirect: the exact Vercel branch-alias callback URL after the preview exists
- Local redirect: `http://localhost:3000/api/auth/callback/google`

Stop before creating the OAuth client because that action creates persistent credentials.

- [ ] **Step 6: Obtain explicit confirmation, then create and store OAuth configuration**

After confirmation, create the client. Add `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` to Vercel Production, Preview, and Development without displaying secret values in logs or chat. Generate and add `COMMENT_HMAC_SECRET` as a separate server-only value.

- [ ] **Step 7: Redeploy and execute the browser acceptance matrix**

Verify visibly on the preview deployment:

- signed-out thread and guest form on desktop and mobile;
- guest submission shows pending and appears in Admin → Comments;
- publish action makes the guest comment appear on its article;
- Google sign-in returns to `#comments` and publishes a comment immediately;
- GitHub reader sign-in publishes but does not open `/admin` unless it is the owner account;
- one-level reply succeeds and a reply-to-reply control is absent;
- invalid/rapid submissions show inline errors;
- missing database configuration shows the unavailable state in a local test;
- light and dark themes remain legible with visible keyboard focus; and
- existing admin post/newsletter actions still work in targeted smoke checks.

- [ ] **Step 8: Run final repository verification**

Run: `pnpm vitest run lib/db.test.ts lib/auth-policy.test.ts lib/comments/*.test.ts 'app/blog/[slug]/comment-actions.test.ts' lib/admin-comments.test.ts lib/admin-data.test.ts 'app/admin/(shell)/comments/actions.test.ts' app/admin/actions.test.ts`

Run: `pnpm typecheck`

Run: the targeted ESLint command from Task 7.

Expected: all commands PASS.

- [ ] **Step 9: Commit any preview-only fixes separately**

If verification required a code correction, stage only those files and use a focused message such as:

```bash
git commit -m "fix: handle unavailable comment storage"
```

If no correction was needed, make no empty commit.
