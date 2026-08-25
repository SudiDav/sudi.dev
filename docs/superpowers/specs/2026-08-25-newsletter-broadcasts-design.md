# Branded newsletter broadcasts — design

## Goal

When an admin publishes a post, the site should prepare a branded Resend
broadcast draft without emailing subscribers automatically. The admin can
review the draft and explicitly send it from the protected admin area.

## Scope

This change adds post-to-newsletter draft creation, a branded email template,
an admin Newsletters area, and an explicit send action. Existing newsletter
signup and owner-notification behavior remains intact. Publishing and Vercel
deployment remain independent of email delivery.

## Data flow

1. The admin saves a post through the existing server action.
2. The post is committed to the configured GitHub branch (currently `main`),
   which continues to trigger the Vercel deployment.
3. Only when the final post status is `Published` does the server create a
   Resend broadcast draft for `RESEND_AUDIENCE_ID`.
4. The draft is named with the post slug and commit SHA. A retry checks for
   that deterministic name before creating another draft.
5. The publish notice reports deployment and newsletter-draft outcomes
   independently. A Resend failure never rolls back a successful post commit.
6. The admin can review the draft, open it in Resend, or send it explicitly.
   The send action re-checks admin authorization and the broadcast status so a
   sent broadcast cannot be sent again.

Drafts remain in Resend rather than being written to the public repository.
The admin Newsletters area discovers drafts through the Resend broadcasts API.

## Resend integration

The existing `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, and `EMAIL_FROM`
configuration is reused. Broadcast creation uses the Resend SDK with:

- `segmentId`/`audienceId`: the configured newsletter audience;
- `from`: `EMAIL_FROM` (the verified `sudi.dev` sender);
- `subject`: `New on sudi.dev: <post title>`;
- `previewText`: the post excerpt;
- `html` and `text`: the branded template and its plain-text equivalent;
- `send: false`: always create a draft, never send during publishing.

The HTML footer includes Resend's
`{{{RESEND_UNSUBSCRIBE_URL}}}` placeholder. Cover images are included only
when their URL is absolute and publicly reachable; the message remains useful
without an image.

## Admin experience

The admin adds a **Newsletters** destination that lists broadcast drafts and
their states. The post publish notice includes a draft-created status and links
to review or send. Sending has a final confirmation step and surfaces success
or failure without changing the post or deployment status.

## Email template

The template uses the existing sudi.dev visual tokens:

- background `#0B0B11`;
- card `#1A1A24`;
- primary text `#EDEDF0`;
- secondary text `#8B8B96`;
- accent `#607EBC`;
- border `#2A2A35`.

It is built with conservative table-based structure and inline styles for
email-client compatibility, with Inter/Arial fallbacks. The message contains
the sudi.dev wordmark, category, title, excerpt, optional cover, a **Read the
post** CTA, and an unsubscribe footer. Plain text mirrors the same hierarchy.

## Failure handling

- Missing Resend configuration: publishing still succeeds; the admin sees
  that a newsletter draft could not be created and can configure the provider
  before retrying.
- Resend draft failure: return a soft newsletter error alongside the successful
  publish result; never throw in a way that suggests the post was not saved.
- Duplicate retry: reuse the draft with the same post slug and commit SHA.
- Send failure: keep the draft visible with the provider error and allow a
  later retry.
- Already-sent broadcast: reject the send action with a clear status message.

## Verification

Targeted tests will cover:

- published posts create a draft;
- draft and archived posts do not create a draft;
- the payload contains the verified sender, audience, subject, HTML, text, and
  unsubscribe placeholder;
- duplicate-safe retry behavior;
- Resend failures do not undo a successful GitHub publish;
- admin send rejects non-draft broadcasts and reports provider failures;
- the template renders without a cover image and with an absolute cover URL.

## Non-goals

- No automatic email send on publish.
- No subscriber welcome email in this change.
- No subscriber addresses in GitHub or local content files.
- No replacement of the existing GitHub/Vercel publishing pipeline.
