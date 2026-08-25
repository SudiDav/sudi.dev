# Deploying sudi.dev

The repo is public at https://github.com/SudiDav/sudi.dev and builds clean.
What follows is the whole deployment, in order.

## 1. Import the repo

Vercel → Add New → Project → import `SudiDav/sudi.dev`.

Framework, build command and output directory are all detected — nothing to
change on that screen.

## 2. Environment variables

Set these in Vercel under Settings → Environment Variables, for **Production**
(and Preview, if you want previews to behave the same).

### Comments — required, or the section silently disappears

`NEXT_PUBLIC_*` values are inlined at **build** time, not read at runtime. If
they are missing when Vercel builds, the comment section renders nothing and
there is no error to notice. Adding them later requires a redeploy.

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_GISCUS_REPO` | `SudiDav/sudi.dev` |
| `NEXT_PUBLIC_GISCUS_REPO_ID` | `R_kgDOUBlxDQ` |
| `NEXT_PUBLIC_GISCUS_CATEGORY` | `Announcements` |
| `NEXT_PUBLIC_GISCUS_CATEGORY_ID` | `DIC_kwDOUBlxDc4DEBBp` |

None of these are secrets — they identify a public repository and a public
discussion category.

### Admin sign-in — required for the admin to work at all

| Variable | Where it comes from |
| --- | --- |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_GITHUB_ID` | GitHub → Settings → Developer settings → OAuth Apps |
| `AUTH_GITHUB_SECRET` | same OAuth App |
| `ADMIN_EMAIL` | the GitHub account's **primary** email — must match exactly |

The OAuth App's Authorization callback URL must be
`https://sudi.dev/api/auth/callback/github`. GitHub allows one callback URL per
app, so previews and local development need their own app (or use the dev
bypass locally). Never set `AUTH_DEV_BYPASS` in production.

### Publishing from the admin — required to save anything

| Variable | Value |
| --- | --- |
| `GITHUB_TOKEN` | fine-grained PAT with Contents: read/write on this repo |
| `GITHUB_REPO` | `SudiDav/sudi.dev` |
| `GITHUB_BRANCH` | `main` |

Without these the admin still renders in production, but every save fails:
`publishTarget()` resolves to `disabled` and writes throw. Editing content
locally and pushing is a perfectly good alternative — just know which one you
have chosen.

### Deployment status — recommended

The admin can poll Vercel after a GitHub commit so you can see when the change
is live:

| Variable | Value |
| --- | --- |
| `VERCEL_TOKEN` | Vercel token with deployment read access |
| `VERCEL_PROJECT_ID` | Vercel → Project Settings → General → Project ID |

### Newsletter — optional

| Variable | Value |
| --- | --- |
| `RESEND_API_KEY` | resend.com → API Keys |
| `RESEND_AUDIENCE_ID` | resend.com → Audiences |
| `CONTACT_EMAIL` | `contact@sudi.dev` |
| `EMAIL_FROM` | `contact@sudi.dev` after the `sudi.dev` domain is verified |

`RESEND_API_KEY` and `RESEND_AUDIENCE_ID` are required to save a subscription
and prepare a post announcement draft. `CONTACT_EMAIL` is only needed for the
owner notification. If that notification fails, the visitor still sees that
the subscription was saved and the admin log records the provider reason. The
`sudi.dev` sending domain also needs valid SPF/MX records before Resend can
deliver owner notices or broadcasts.

When an admin publishes a post with status `Published`, the site creates a
branded Resend broadcast draft for the audience. It never sends automatically.
Review and send drafts from Admin → Newsletters after the Vercel deployment is
ready. The same page also shows the first 100 contacts in the configured
audience, including their subscription status and signup date. Broadcasts
include Resend's unsubscribe placeholder so contacts can opt out.

## 3. The domain

Point `sudi.dev` at Vercel **after** the first deploy looks right on the
`.vercel.app` URL.

This cuts Hashnode off, which is the intended outcome. The old flat post URLs
(`/getting-started-with-aspnet-core-7-minimal-apis`) already 308 to
`/blog/<slug>`, so existing links and search results survive — see
`migratedPostRedirects()` in `next.config.ts`.

## 4. After it is live

- Open a post and confirm the comment box renders. If it is missing, the giscus
  variables were not set at build time — add them and redeploy.
- Comment once yourself. giscus creates the discussion on first comment, so
  until then the Discussions tab is legitimately empty.
- Subscribe with your own address and check the notification arrives.
