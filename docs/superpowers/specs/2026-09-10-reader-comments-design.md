# Reader-friendly comments design

## Goal

Replace the GitHub-only giscus embed with a native comment experience for a
general readership. Readers can sign in with Google or GitHub, or submit a
moderated guest comment, without needing a developer account. The initial
deployment must stay within services that offer a $0 plan.

## Context

The current article comment section embeds giscus. Identity, storage, and
moderation therefore all belong to GitHub Discussions, so Google authentication
cannot be added to the existing implementation. The site already uses Auth.js
for the owner's GitHub-authenticated admin area and runs on Vercel.

The current admin authorization model remains unchanged: only the address in
`ADMIN_EMAIL` can access `/admin` or invoke administrative mutations. Allowing a
reader to obtain a public-site session must never grant admin access.

## Approaches considered

### 1. Native comments with Auth.js and Neon — selected

Extend the existing Auth.js configuration with Google and allow ordinary
GitHub identities to create public-site sessions. Store comments in Neon
Postgres through its serverless driver. Render a first-party comment form and
thread in the article page and keep moderation in the existing admin area.

This gives the best reader experience and visual fit. Neon integrates with
Vercel, scales to zero when idle, and currently offers a free allowance suitable
for a small personal blog. The trade-off is that the site owns the comment
schema and application logic.

### 2. Disqus

Disqus is the fastest managed option and exposes Google login, but a reader is
still creating or linking a Disqus account. Its free tier is advertising-backed
and is a poor fit for the site's privacy posture.

### 3. Repository-backed JSON

The server could write each comment to a JSON file through the existing GitHub
Contents API. This has no database bill, but each comment creates a commit and a
deployment, concurrent submissions can conflict, and untrusted reader content
would enter the public source repository. It is not selected.

## Reader experience

The article page keeps its existing `Comments` section but replaces the giscus
iframe with native UI that follows the site's typography, spacing, and light and
dark themes.

A signed-out reader sees:

- `Continue with Google` as the primary identity option;
- `Continue with GitHub` as a secondary option;
- a guest form requiring a display name but no email address; and
- a short explanation that guest comments are reviewed before publication.

A signed-in reader sees their name and avatar, a plain-text comment field, and a
post button. Published comments support one level of replies. Markdown and raw
HTML are deliberately excluded from the first version so user content can be
rendered as text without an HTML sanitization surface.

After submission:

- authenticated comments are published immediately;
- guest comments are saved as `pending` and the reader sees a moderation
  confirmation;
- validation or throttling errors stay beside the form and preserve its text;
  and
- database or network failures produce a retryable message without pretending
  the comment was accepted.

Comments are ordered oldest-first within each thread. Top-level pagination,
reactions, voting, rich text, comment editing, and email notifications are out
of scope for the initial version.

## Authentication and authorization

Auth.js remains the single session mechanism. Google is added as a provider;
GitHub remains available for both the owner and readers. The sign-in callback
will accept valid Google and GitHub reader identities instead of rejecting
everyone except the owner.

Admin authorization continues to be checked separately by `isAdmin()`, using an
exact normalized match against `ADMIN_EMAIL`. The `/admin` proxy callback and
every protected layout, route, and server action continue to enforce that
check. A valid reader session alone has no administrative permissions.

The Auth.js JWT and session expose a stable, provider-qualified subject used to
associate authenticated comments with their author. The database never stores
OAuth access tokens. Comment rows keep only the public display name, optional
avatar URL, provider kind, and a one-way HMAC of the stable subject.

Guest users receive no session. Their display name is stored with the comment;
no guest email is requested or retained.

## Data model

Neon is accessed only from server-side code using `DATABASE_URL`. The browser
never receives database credentials and there is no public database API.

The initial `comments` table contains:

- UUID primary key;
- article slug;
- optional parent comment UUID for one-level replies;
- author type (`google`, `github`, or `guest`);
- nullable HMAC author key for authenticated users;
- public author name and nullable avatar URL;
- plain-text body;
- moderation status (`pending`, `published`, `rejected`, or `spam`);
- created and updated timestamps; and
- a non-reversible actor key used for throttling.

Indexes cover `(article_slug, status, created_at)`, `parent_id`, and recent
activity by actor key. Foreign-key rules prevent a reply from surviving without
its parent.

Schema changes live as committed SQL migrations. Production migration is an
explicit deployment step and must complete before the application starts using
the new comment components.

## Server boundaries and data flow

A focused server-only comment module owns database access and maps database rows
to small public/admin view models. Public reads return only `published`
comments; moderation metadata and actor keys never reach the browser.

Submission uses a server action:

1. Validate article slug, parent relationship, author name, and comment length.
2. Read the Auth.js session if present.
3. Build an HMAC actor key from the provider subject, or from the request IP for
   a guest, using a dedicated server secret.
4. Enforce a short per-actor cooldown and reject obvious flooding.
5. Insert as `published` for authenticated readers or `pending` for guests.
6. Revalidate the article path after a successful published insert.

The parent comment must exist, belong to the same article, be published, and be
top-level. This guarantees only one reply depth.

Admin reads and mutations reuse the existing `isAdmin()` boundary. The admin
comments page lists status, article, author, provider, body, and date. The owner
can publish, reject, mark as spam, or delete a comment. Dashboard totals move
from GitHub Discussions to Neon.

## Abuse prevention and privacy

The first version combines moderation with lightweight server-side controls:

- trim and reject empty content;
- enforce conservative name and body length limits;
- render comment bodies only as text;
- reject excessive links and repeated submissions;
- throttle by an HMAC actor key; and
- keep every guest comment pending.

Raw IP addresses, OAuth tokens, and commenter email addresses are not stored.
The HMAC secret is separate from `AUTH_SECRET`, allowing it to be rotated without
invalidating sessions. If abuse later justifies CAPTCHA, it can be added without
changing the comment schema, but it is intentionally not required initially.

The privacy page will disclose Google/GitHub authentication, the public profile
fields stored with a comment, Neon as the processor holding comment data, and
the hashed anti-abuse identifier. It will also describe deletion requests.

## Configuration and zero-cost boundary

New production configuration consists of:

- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` from a Google OAuth web client;
- `DATABASE_URL` supplied by the Neon Vercel integration; and
- `COMMENT_HMAC_SECRET`, generated as a high-entropy server-only value.

Existing GitHub OAuth variables remain in place. The giscus variables are
removed after the replacement is live.

Neon's current free plan is the operating target. The code will not enable a
paid plan or metered add-on. Documentation will record the free-plan limits and
how to inspect usage. If the free allowance is ever insufficient, the site
should fail closed for new submissions with a clear error rather than silently
incur a charge.

## Migration and rollout

No giscus data is deleted. Existing GitHub Discussions remain available in the
repository as an archive. The first version starts the native database thread
empty unless existing discussion comments are found and a separate import is
explicitly approved.

Rollout order:

1. Provision the free Neon integration and apply the schema.
2. Create the Google OAuth client and add its Vercel environment variables.
3. Deploy the database/auth/server/UI implementation while keeping giscus
   configuration available for rollback.
4. Verify Google sign-in, GitHub sign-in, guest moderation, replies, admin
   actions, mobile layout, and both themes in a preview deployment.
5. Promote the verified deployment and then remove obsolete giscus variables.

If database configuration is missing, the article section renders a concise
`Comments are temporarily unavailable` state rather than disappearing or
exposing setup details.

## Testing

Targeted automated coverage includes:

- authentication callbacks proving readers can sign in while only
  `ADMIN_EMAIL` is an administrator;
- comment validation, status selection, reply-depth enforcement, and actor
  throttling;
- public queries excluding pending/rejected/spam rows;
- admin moderation authorization and status transitions;
- component states for signed-out, authenticated, pending, empty, and failure
  cases; and
- removal of giscus configuration dependencies.

Verification also includes lint and type checking for touched code, then a
browser pass against a Vercel preview at desktop and mobile widths in both
themes. The browser pass must visibly confirm the submitted comment and admin
moderation flow; a successful button click alone is not sufficient.
