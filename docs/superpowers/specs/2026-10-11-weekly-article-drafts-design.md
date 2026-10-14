# Weekly article drafts — design

## Goal

Generate one complete article draft each week from the site owner's interests
and writing style, save it in the existing post workflow as `Draft`, and email
the owner a link to refine it in the admin. Publishing always remains a manual
decision.

## Scope

This adds a provider-configurable text generation adapter, an editable writing
profile, a protected scheduled route, draft creation, and an owner notification.
It reuses the existing GitHub-backed MDX publishing and Resend email services.
No generated post is ever published or sent to newsletter subscribers by the
scheduled job.

## User flow and data flow

1. The weekly Vercel Cron invokes a server route. The route accepts only
   requests carrying the configured `CRON_SECRET` bearer token.
2. The server loads the writing profile from the admin settings, published
   articles as style examples, and recent topics so the model can avoid
   repeating an existing post.
3. The configured model generates a headline, excerpt, category, and complete
   MDX body. The server validates the response and calculates the reading time.
4. The server creates one GitHub-backed post with status `Draft`. A week key
   makes reruns idempotent: an existing draft for that week is reused rather
   than creating another post.
5. Resend emails the configured owner (`CONTACT_EMAIL`, falling back to
   `ADMIN_EMAIL`) with the title and a link to the admin editor. Email delivery
   is separate from draft creation; an email failure must not delete or publish
   the draft.
6. The owner edits the post in the existing admin editor and explicitly
   publishes it when ready.

The weekly schedule is Monday at 08:00 in Africa/Lubumbashi (06:00 UTC). Vercel
Cron schedules use UTC. On Vercel Hobby, invocation can occur within the
scheduled hour, and failed invocations are not automatically retried; the
handler therefore needs safe rerun behavior and useful logs. These behaviors
are described in Vercel's [Cron job documentation](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

## Provider configuration

The model key is server-only and is supplied through deployment environment
variables, never through browser code, `content/site.json`, or MDX. The initial
adapter speaks the OpenAI-compatible Chat Completions API using native `fetch`,
so no provider SDK is required. Configure:

- `AI_API_KEY` — required provider credential;
- `AI_MODEL` — required model identifier;
- `AI_BASE_URL` — optional compatible API base URL, with a documented default.

Providers that support the compatible API can be selected by changing these
values. A provider with a different API format can be added behind the same
server-side adapter interface later. The feature reports missing or invalid
configuration in Vercel logs and does not create an empty draft.

The Resend notification reuses `RESEND_API_KEY`, `EMAIL_FROM`, and
`CONTACT_EMAIL`/`ADMIN_EMAIL`; it does not use the newsletter audience or
broadcast APIs.

## Writing profile and style

Add editable interests and writing guidance to the admin Settings page. These
values are persisted with the existing `content/site.json` settings. The
repository is public, so the UI and deployment docs must make clear that this
profile is public content and must not contain secrets. Published post
examples also come from the public repository. The prompt should favor topics
that fit both the explicit interests and demonstrated expertise, use a few
recent relevant articles as style examples, and avoid reusing recent headlines
or themes.

The model must return only the fields the post workflow supports. The server
validates required fields, constrains the category to supported post
categories, limits generated length, and supplies safe defaults for the cover
path and status. Generated factual claims are a draft for the owner to review;
the system does not add fabricated citations or claim the article has been
fact-checked.

## Idempotency and failures

- The ISO week identifier is stored with the generated post and checked before
  creating another draft. Rerunning after an email failure reuses the same
  draft and attempts the notification again.
- AI failure or invalid output creates no post and returns an error for the
  Vercel logs.
- GitHub publishing failure creates no notification and reports an error.
- Resend failure leaves the successfully saved post as `Draft`, logs the
  provider detail server-side, and reports the notification failure. It never
  rolls back the post.
- Missing secrets fail closed. The cron route returns unauthorized without
  `CRON_SECRET` and for a mismatched bearer token.
- A schedule rerun can resend the notification for the existing weekly draft;
  it cannot create a second draft for that week.

## Admin experience

The Settings screen gains two fields: topics/interests and writing-style
guidance. Existing post settings and publishing behavior stay intact. The
weekly email includes the title, short excerpt, and a direct link to
`/admin/posts/<slug>/edit`. The post editor shows the saved draft as it does
other posts; no special publication action is added.

## Environment setup

Document the following new Vercel production variables in `.env.example` and
`docs/deploy.md`:

- `AI_API_KEY`
- `AI_MODEL`
- `AI_BASE_URL` (optional)
- `CRON_SECRET`

Existing Resend and GitHub publishing variables are reused. `CRON_SECRET` must
be a random secret and is compared on the server against the Authorization
header Vercel sends for cron invocations.

## Verification

Targeted tests should cover:

- compatible API request construction, timeout, invalid output, and provider
  errors;
- writing profile and post examples passed to generation without exposing the
  key to the client;
- draft metadata, `Draft` status, category validation, and reading time;
- same-week reruns reusing an existing draft and retrying the email;
- email content/link and Resend failures leaving the draft intact;
- cron route authentication, missing configuration, and error responses;
- Settings profile fields round-tripping without changing unrelated settings.

## Non-goals

- No automatic publishing or subscriber email.
- No secrets stored in Git-backed content.
- No database, embeddings, fine-tuning, web research, or automatic fact-checking.
- No provider-specific SDK in the initial implementation.
- No AI writing actions inside the article editor in this phase; the weekly
  completed draft is the initial writing workflow.
