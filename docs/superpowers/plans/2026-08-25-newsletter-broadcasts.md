# Branded newsletter broadcasts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a branded Resend broadcast draft when a post transitions to Published, then let an authenticated admin review and explicitly send it.

**Architecture:** Keep GitHub/Vercel publishing as the source of truth and treat Resend as the separate newsletter store. A focused newsletter service will render HTML/plain text, create idempotent drafts, list drafts, and send only verified drafts; server actions will compose it with post publishing without rolling back commits on provider failure.

**Tech Stack:** Next.js 16 server actions and App Router, TypeScript, Resend SDK 6.22, React client components, Vitest, Tailwind CSS tokens.

**Spec:** `docs/superpowers/specs/2026-08-25-newsletter-broadcasts-design.md`

## Global Constraints

- Never send a broadcast automatically during publishing; creation must use `send: false`.
- Only a transition to `Published` creates a draft; saving an existing Published post does not create another draft.
- A Resend failure must not undo a successful GitHub commit or Vercel deployment.
- Do not write subscriber addresses, broadcast HTML, or provider secrets into GitHub content files.
- Use the verified `EMAIL_FROM` sender, `RESEND_API_KEY`, and `RESEND_AUDIENCE_ID` environment variables.
- Keep all admin newsletter actions behind `requireAdmin()`.
- Keep commit metadata free of AI/tool attribution and use a neutral Conventional Commit message.

---

### Task 1: Add the branded broadcast renderer and Resend service

**Files:**
- Create: `lib/newsletter.ts`
- Create: `lib/newsletter.test.ts`

**Interfaces:**
- Consumes: `Post` from `lib/content.types.ts`, `SITE_URL` from `lib/site.ts`, and `RESEND_*` environment variables.
- Produces: `createPostBroadcast(post, commitSha)`, `listNewsletterBroadcasts()`, and `sendNewsletterBroadcast(id)` with typed soft outcomes.

- [ ] **Step 1: Write failing tests for the email payload and safe provider outcomes**

Add a mocked `resend` module and tests with these exact expectations:

```ts
it('creates a draft with the verified sender, audience, content, and unsubscribe token', async () => {
  process.env.RESEND_API_KEY = 're_test_key'
  process.env.RESEND_AUDIENCE_ID = 'aud_123'
  process.env.EMAIL_FROM = 'contact@sudi.dev'
  broadcastCreateMock.mockResolvedValueOnce({ data: { id: 'br_123' }, error: null })

  const result = await createPostBroadcast(postFixture, 'sha_123')

  expect(result).toEqual({ ok: true, id: 'br_123', name: expect.any(String), created: true })
  expect(broadcastCreateMock).toHaveBeenCalledWith(
    expect.objectContaining({
      audienceId: 'aud_123',
      from: 'contact@sudi.dev',
      send: false,
      html: expect.stringContaining('{{{RESEND_UNSUBSCRIBE_URL}}}'),
      text: expect.stringContaining('Read the post'),
    }),
      { headers: { 'Idempotency-Key': 'sudi-post-newsletter-sha_123' } },
  )
})

it('returns a soft error when Resend draft creation fails', async () => {
  broadcastCreateMock.mockResolvedValueOnce({ data: null, error: { message: 'domain invalid' } })
  await expect(createPostBroadcast(postFixture, 'sha_123')).resolves.toMatchObject({
    ok: false,
    error: 'domain invalid',
  })
})

it('refuses to send a broadcast that is not still a draft', async () => {
  broadcastGetMock.mockResolvedValueOnce({ data: { id: 'br_123', status: 'sent' }, error: null })
  await expect(sendNewsletterBroadcast('br_123')).resolves.toEqual({
    ok: false,
    error: 'This newsletter has already been sent.',
  })
})
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `pnpm exec vitest run lib/newsletter.test.ts`

Expected: FAIL because the newsletter service and mocked methods do not exist yet.

- [ ] **Step 3: Implement `lib/newsletter.ts`**

Define:

```ts
export type NewsletterOutcome =
  | { ok: true; id: string; name: string; created: boolean }
  | { ok: false; error: string }

export async function createPostBroadcast(post: Post, commitSha: string): Promise<NewsletterOutcome>
export async function listNewsletterBroadcasts(): Promise<NewsletterListOutcome>
export async function sendNewsletterBroadcast(id: string): Promise<NewsletterSendOutcome>
```

Use `new Resend(process.env.RESEND_API_KEY).broadcasts.create` with `send: false`, the configured audience, a deterministic name containing the slug and commit SHA, and an `Idempotency-Key` header such as `sudi-post-newsletter-${commitSha}`. Render conservative table-based HTML with inline styles from the six site tokens, use an absolute cover URL only when `cover` already starts with `http://` or `https://`, and always render the unsubscribe placeholder. Return soft errors for missing configuration, provider errors, thrown errors, and missing response IDs.

For duplicate-safe retry, use the idempotency key on creation. `listNewsletterBroadcasts` should call `broadcasts.list({ limit: 100 })`, filter names beginning with `sudi.dev post:`, and return the fields needed by the admin list. `sendNewsletterBroadcast` should call `broadcasts.get(id)`, reject any status other than `draft`, then call `broadcasts.send(id)`.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run: `pnpm exec vitest run lib/newsletter.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the service and tests**

```bash
git add lib/newsletter.ts lib/newsletter.test.ts
git commit -m "feat: add branded newsletter broadcast service"
```

### Task 2: Integrate draft creation with Published post transitions

**Files:**
- Modify: `lib/publish.ts`
- Modify: `app/admin/actions.ts`
- Modify: `app/admin/posts/[id]/edit/page.tsx`
- Modify: `app/admin/posts/[id]/edit/post-editor.tsx`
- Create: `app/admin/actions.test.ts`
- Modify: `vitest.config.ts`

**Interfaces:**
- Consumes: `createPostBroadcast` and `NewsletterOutcome` from Task 1.
- Produces: `ActionResult.newsletter` for the post editor and `PublishResult.previousStatus/status` for transition detection.

- [ ] **Step 1: Write failing tests for transition gating and soft failures**

Cover these cases with mocked `savePost`, `createPost`, and `createPostBroadcast`:

```ts
it('creates a newsletter draft when a new post is published', async () => {
  createPostMock.mockResolvedValueOnce({ target: 'github', sha: 'sha_123', branch: 'main' })
  newsletterMock.mockResolvedValueOnce({ ok: true, id: 'br_123', name: 'sudi.dev post: hello', created: true })

  const result = await addPost({ ...postInput, status: 'Published' })

  expect(result).toMatchObject({ ok: true, newsletter: { ok: true, id: 'br_123' } })
})

it('does not create a draft when saving a Draft or editing an already Published post', async () => {
  createPostMock.mockResolvedValueOnce({ target: 'github', sha: 'sha_draft', branch: 'main', status: 'Draft' })
  await addPost({ ...postInput, status: 'Draft' })
  expect(newsletterMock).not.toHaveBeenCalled()

  savePostMock.mockResolvedValueOnce({
    target: 'github',
    sha: 'sha_edit',
    branch: 'main',
    previousStatus: 'Published',
    status: 'Published',
    post: postFixture,
  })
  await updatePost('hello', { ...postInput, status: 'Published' })
  expect(newsletterMock).not.toHaveBeenCalled()
})

it('keeps the post publish successful when Resend draft creation fails', async () => {
  newsletterMock.mockResolvedValueOnce({ ok: false, error: 'domain invalid' })
  const result = await addPost({ ...postInput, status: 'Published' })
  expect(result).toMatchObject({ ok: true, newsletter: { ok: false, error: 'domain invalid' } })
})
```

- [ ] **Step 2: Run the focused action tests and verify they fail**

Run: `pnpm exec vitest run app/admin/actions.test.ts`

Expected: FAIL because the action result does not yet expose newsletter outcomes.

- [ ] **Step 3: Include server-action tests in Vitest**

Update `vitest.config.ts` so its `include` list is exactly `['lib/**/*.test.ts', 'app/**/*.test.ts']`. Keep the existing Node environment and path plugin unchanged.

- [ ] **Step 4: Return post status metadata from GitHub publishing**

Extend `PublishResult` with optional `previousStatus`, `status`, and `post` fields. In `savePost`, treat absent legacy status as `Published`, compute the merged status, build the complete merged `Post`, and return all three values. In `createPost`, build and return the complete created `Post` plus its status. Do not change the GitHub commit protocol.

- [ ] **Step 5: Compose newsletter draft creation in post actions**

After a successful GitHub publish, call `createPostBroadcast` only when a new post has `status === 'Published'` or an existing post has `previousStatus !== 'Published'` and `status === 'Published'`. Pass a complete `Post` payload and the returned commit SHA. Return `{ ok: true, publish, newsletter }` even when the newsletter outcome is soft-failed. Keep `setPostStatus` using the same transition-aware path.

- [ ] **Step 6: Carry draft metadata through the editor**

Extend the post editor query payload and local state to preserve the returned newsletter ID/name after creating a new post, and render a compact status beside `DeploymentStatus`. Existing post edits should update state directly. A failed draft should show a warning without changing the successful publish message.

- [ ] **Step 7: Run action and existing email tests**

Run: `pnpm exec vitest run app/admin/actions.test.ts lib/email.test.ts lib/newsletter.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit the publish integration**

```bash
git add lib/publish.ts app/admin/actions.ts app/admin/posts/[id]/edit/page.tsx app/admin/posts/[id]/edit/post-editor.tsx app/admin/actions.test.ts
git commit -m "feat: create newsletter drafts for published posts"
```

### Task 3: Add the protected Newsletters admin area and explicit send action

**Files:**
- Create: `app/admin/(shell)/newsletters/page.tsx`
- Create: `components/admin/newsletter-list.tsx`
- Modify: `app/admin/actions.ts`
- Modify: `components/admin/admin-sidebar.tsx`
- Modify: `components/admin/publish-notice.tsx`
- Modify: `app/admin/actions.test.ts`

**Interfaces:**
- Consumes: `listNewsletterBroadcasts` and `sendNewsletterBroadcast` from Task 1.
- Produces: authenticated list rendering and an explicit send control that revalidates the page after success.

- [ ] **Step 1: Write failing tests for protected list/send behavior**

Add these cases to `app/admin/actions.test.ts` with `@/auth`, `next/cache`, and `@/lib/newsletter` mocked:

```ts
it('rejects newsletter listing for a non-admin', async () => {
  isAdminMock.mockResolvedValueOnce(false)
  await expect(listNewsletters()).rejects.toThrow('Not authorised')
  expect(listMock).not.toHaveBeenCalled()
})

it('sends a draft and revalidates the newsletters page', async () => {
  isAdminMock.mockResolvedValueOnce(true)
  sendMock.mockResolvedValueOnce({ ok: true, id: 'br_123' })
  await expect(sendNewsletter('br_123')).resolves.toEqual({ ok: true, id: 'br_123' })
  expect(revalidatePathMock).toHaveBeenCalledWith('/admin/newsletters')
})
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `pnpm exec vitest run app/admin/actions.test.ts`

Expected: FAIL because the new server actions and page do not exist.

- [ ] **Step 3: Add server actions and the admin page**

Add `listNewsletters(): Promise<NewsletterListOutcome>` and `sendNewsletter(id: string): Promise<NewsletterSendOutcome>` to `app/admin/actions.ts`, each beginning with `await requireAdmin()`. Revalidate `/admin/newsletters` after a successful send. The page should render a loading-safe empty state, draft/sent/queued badges, broadcast name, created date, and a link to the Resend broadcasts dashboard. The client list should use `useTransition`, show a confirmation dialog before sending, and surface provider errors inline.

- [ ] **Step 4: Add navigation and publish-notice links**

Add a `Newsletters` sidebar item. Extend `PublishNotice` with a newsletter draft status and links to `/admin/newsletters`; do not alter the existing project notice behavior when no newsletter data is present.

- [ ] **Step 5: Run the focused tests and typecheck**

Run: `pnpm exec vitest run app/admin/actions.test.ts lib/newsletter.test.ts` and `pnpm run typecheck`.

Expected: PASS with no TypeScript errors.

- [ ] **Step 6: Commit the admin workflow**

```bash
git add app/admin/actions.ts app/admin/'(shell)'/newsletters/page.tsx components/admin/newsletter-list.tsx components/admin/admin-sidebar.tsx components/admin/publish-notice.tsx app/admin/actions.test.ts
git commit -m "feat: add protected newsletter sending controls"
```

### Task 4: Document configuration and verify the production-safe behavior

**Files:**
- Modify: `.env.example`
- Modify: `docs/deploy.md`
- Test: `lib/newsletter.test.ts`, `app/admin/actions.test.ts`

- [ ] **Step 1: Update configuration documentation**

Document that `EMAIL_FROM` must be an address on the verified `sudi.dev` domain, `RESEND_AUDIENCE_ID` is the target audience, and broadcast creation is draft-only until an admin sends it. Keep `RESEND_API_KEY` marked secret and `EMAIL_FROM` marked config.

- [ ] **Step 2: Run targeted verification**

Run:

```bash
pnpm exec vitest run lib/email.test.ts lib/newsletter.test.ts app/admin/actions.test.ts
pnpm run typecheck
pnpm run lint
```

Expected: all targeted tests pass, typecheck succeeds, and lint reports no new errors.

- [ ] **Step 3: Inspect the final diff and commit documentation**

Run: `git diff --check`, `git status --short`, and `git diff HEAD~1 --stat`.

```bash
git add .env.example docs/deploy.md
git commit -m "docs: document newsletter broadcast setup"
```

- [ ] **Step 4: Verify the deployed workflow after environment configuration**

In Vercel, confirm `EMAIL_FROM=contact@sudi.dev` and the existing Resend variables are set for Production. Publish a new test post as Published, confirm the post deployment reaches Ready, confirm a draft appears under Admin → Newsletters, and only then use the explicit Send action. Verify Resend shows the broadcast and that the message contains the unsubscribe link.
