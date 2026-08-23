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
| `AUTH_GOOGLE_ID` | Google Cloud Console → OAuth client |
| `AUTH_GOOGLE_SECRET` | same client |
| `ADMIN_EMAIL` | the Google account allowed to sign in |

The OAuth client needs `https://sudi.dev/api/auth/callback/google` as an
authorised redirect URI. Never set `AUTH_DEV_BYPASS` in production.

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

### Newsletter — optional

| Variable | Value |
| --- | --- |
| `RESEND_API_KEY` | resend.com → API Keys |
| `RESEND_AUDIENCE_ID` | resend.com → Audiences |
| `CONTACT_EMAIL` | `contact@sudi.dev` |
| `EMAIL_FROM` | `sudi.dev <onboarding@resend.dev>` until the domain is verified |

Left unset, sign-ups fail softly: the visitor still sees a confirmation, and the
reason is written to the server log. Nothing breaks, but nothing is recorded
either.

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
