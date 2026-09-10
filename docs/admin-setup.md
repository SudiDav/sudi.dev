# Admin setup

The admin sign-in screen uses GitHub and is restricted to a single email
address. Publishing commits MDX back to this repository, which triggers a
redeploy. Google and GitHub reader sessions can comment but never pass the
admin email check unless their email is the configured owner address.

Credentials must live only in `.env.local` or the host&apos;s environment settings,
never in the repository.

## 1. OAuth sign-in

For GitHub, create an OAuth App under GitHub → Settings → Developer settings →
OAuth Apps. Use `http://localhost:3000/api/auth/callback/github` locally and
`https://YOUR-DOMAIN/api/auth/callback/github` for the deployed app.

For Google, create a project in Google Cloud, configure an External OAuth
consent screen, then create a Web application OAuth client. Add these authorised
redirect URIs:

- `http://localhost:3000/api/auth/callback/google`
- `https://YOUR-DOMAIN/api/auth/callback/google`
- the stable Vercel preview callback, if reader sign-in should work on previews

Copy the client credentials into `.env.local`:

```
ADMIN_EMAIL=owner@example.com
AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
AUTH_SECRET=            # openssl rand -base64 32
```

`ADMIN_EMAIL` is the whole admin authorisation model and is re-checked on every
protected request. Other verified Google users and GitHub users may receive a
reader session only for commenting.

## 2. Publishing

Create a **fine-grained personal access token** at
[github.com/settings/tokens](https://github.com/settings/tokens?type=beta):

- Repository access: **Only select repositories** → this repo
- Permissions: **Contents → Read and write** (nothing else)

```
GITHUB_TOKEN=github_pat_...
GITHUB_REPO=SudiDav/sudi.dev
GITHUB_BRANCH=main
```

Until these are set the admin still loads and reads content; only saving is
disabled, and it says so rather than failing at the API call.

### Deployment status in the admin

Every GitHub save to `main` triggers Vercel. To show whether that deployment is
queued, building, ready, or failed, add these production variables as well:

```
VERCEL_TOKEN=vercel_...
VERCEL_PROJECT_ID=prj_...
# For team-owned Vercel projects, add one of these:
VERCEL_TEAM_ID=team_...
# VERCEL_TEAM_SLUG=your-team-slug
```

Create a Vercel access token with read access to deployments and Web Analytics,
then copy the project ID from Vercel → Project Settings → General. The token
is only used by protected admin server calls; it is never sent to the browser.

The same `VERCEL_TOKEN` and `VERCEL_PROJECT_ID` power per-post view counts in
the admin. The editor queries Web Analytics for each exact `/blog/<slug>` path
and shows lifetime production page views. Team-owned projects also need
`VERCEL_TEAM_ID` or `VERCEL_TEAM_SLUG`. If Web Analytics or these credentials
are unavailable, the admin keeps showing `—` instead of an invented number.

## Working locally without any credentials

`.env.local` can set `AUTH_DEV_BYPASS=true`, which adds a **Continue without
GitHub (dev)** button to the sign-in page. It is gated on two conditions that
must BOTH hold: `NODE_ENV` is not production, and the flag is exactly `"true"`.
`next build` sets `NODE_ENV=production`, so in a deployed build the provider is
not merely hidden — it is never registered and there is no route to reach it.

Delete the flag once social sign-in is configured.

## Where saves go

| Configuration | Behaviour |
| --- | --- |
| `GITHUB_TOKEN` + `GITHUB_REPO` set | Commits MDX to the repo, triggering a redeploy |
| Neither set, running `next dev` | Writes straight to `content/posts/*.mdx` in your working copy |
| Neither set, production | Saving refused with a visible message, not silently dropped |

The local path is what makes the admin usable today: edit a post, hit Save, and
the file on disk changes — the public page reflects it on the next request.

Note that saving recalculates `readingTime` from the actual body at ~200 words
per minute, so the seeded values from the design are replaced with real counts
the first time a post is edited.

## What the admin can actually do

Everything below is wired end to end — no screen is a mock-up.

| Screen | What works |
| --- | --- |
| Dashboard | Real content and comment counts; views show `—` when analytics is unavailable. |
| Posts | Tabs filter by status. Row actions toggle Published/Draft. |
| Post Editor | Edit title, excerpt, body, category. Save, Publish/Unpublish. Live word count. |
| Add Project | Creates `content/projects/<slug>.mdx`. Refuses to overwrite an existing slug. |
| Edit Project | Same form in update mode, at `/admin/projects/<slug>/edit` |
| Comments | Publish / Reject / Spam / Delete, with status filtering. Writes to Neon. |
| Settings | Writes `content/site.json`. Log Out really signs out. |

Public side:

| Feature | What works |
| --- | --- |
| Article comments | Google/GitHub comments publish immediately; guest comments wait for review. |
| Newsletter | Validates and stores to the configured Resend audience |
| Work / Blog filters, search | Client-side, synced to the URL, shareable |
| Theme toggle | Persists, no flash on reload |

### Comment storage

Create a free Neon database, connect it to Vercel, and apply
`db/migrations/0001_comments.sql` in the Neon SQL Editor. Configure:

```text
DATABASE_URL=postgresql://...
COMMENT_HMAC_SECRET=       # openssl rand -base64 32
```

Posts, projects, and settings remain files in `content/`; comments live in
Neon, and newsletter contacts live in Resend. Check the Neon Usage page rather
than enabling a paid add-on while the site is small.

### Still not real

- **Image upload** — the dropzones render but there is no asset store. Cover
  and avatar fields take a path to something already in `/public`.
- **Resend delivery** — the audience write works when Resend is configured; the
  sending domain must have valid SPF/MX records before owner notices can send.
- **View counts** — when analytics credentials are missing, they show "—" rather than invented numbers.

Settings feed the site: the `<title>` and meta description come from
`content/site.json`, as do the RSS channel details and the footer's social
links. Changing your GitHub handle in Settings changes where the footer points.

Two fields on Add Project are not in the design, because the design's form does
not cover what the site needs:

- **Category** — the Work page filters by it, so a project without one could
  never be filtered to.
- **Cover path** — the design draws an upload dropzone, but there is nowhere to
  upload to yet. The field takes a path to an image already in `/public`.

## How it fits together

- `auth.ts` — Google/GitHub providers, JWT session, single-email admin allowlist
- `proxy.ts` — redirects signed-out visitors away from `/admin` (convenience)
- `app/admin/(shell)/layout.tsx` — the real gate, checked server-side
- `app/admin/actions.ts` — every server action re-checks authorisation itself,
  because actions are reachable as POST endpoints regardless of which page
  rendered the form
- `lib/publish.ts` — commits MDX through the GitHub Contents API and returns the
  commit SHA used to track the Vercel deployment
- `lib/vercel-deployments.ts` — checks Vercel for that commit's deployment
- `lib/comments/` — validates, stores, throttles, and moderates article comments

## Deploying

Set the same variables in your host's environment, apply the Neon migration,
and add the production callback URLs to both OAuth clients. `AUTH_SECRET` must
be set in production or sessions cannot be signed.
