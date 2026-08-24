# Admin setup

The admin at `/admin` is gated by GitHub sign-in and restricted to a single
email address. Publishing commits MDX back to this repository, which triggers a
redeploy.

Two things must be configured. Neither can be done for you — both involve
credentials that should only ever live in your `.env.local` (or your host's
environment settings), never in the repo.

## 1. GitHub sign-in

1. Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
   pick a project.
2. **APIs & Services → OAuth consent screen** → choose **External**, fill in the
   app name and your email. You can leave it in *Testing* mode — add your own
   Gmail as a test user. There is no need to publish or get verified for a
   single-user admin.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorised redirect URIs:
     - `http://localhost:3000/api/auth/callback/github`
     - `https://YOUR-DOMAIN/api/auth/callback/github` (once deployed)
4. Copy the Client ID and Client Secret into `.env.local`:

```
ADMIN_EMAIL=sudimayenge@gmail.com
AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...
AUTH_SECRET=            # openssl rand -base64 32
```

`ADMIN_EMAIL` is the whole authorisation model: any other GitHub account that
completes sign-in is rejected before a session is issued, and the address is
re-checked on every request.

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
```

Create a Vercel token with deployment read access and copy the project ID from
Vercel → Project Settings → General. The token is only used by the protected
admin status endpoint; it is never sent to the browser.

## Working locally without any credentials

`.env.local` sets `AUTH_DEV_BYPASS=true`, which adds a **Continue without
GitHub (dev)** button to the sign-in page. It is gated on two conditions that
must BOTH hold: `NODE_ENV` is not production, and the flag is exactly `"true"`.
`next build` sets `NODE_ENV=production`, so in a deployed build the provider is
not merely hidden — it is never registered and there is no route to reach it.

Delete the flag once Google sign-in is configured.

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
| Dashboard | Real counts, real draft list. Views/comments read "—": no analytics source. |
| Posts | Tabs filter by status. Row actions toggle Published/Draft. |
| Post Editor | Edit title, excerpt, body, category. Save, Publish/Unpublish. Live word count. |
| Add Project | Creates `content/projects/<slug>.mdx`. Refuses to overwrite an existing slug. |
| Edit Project | Same form in update mode, at `/admin/projects/<slug>/edit` |
| Comments | Approve / Reject (spam) / Delete, with tab filtering. Writes `content/comments.json`. |
| Settings | Writes `content/site.json`. Log Out really signs out. |

Public side:

| Feature | What works |
| --- | --- |
| Article comments | Anyone can post. Held as pending; only approved comments render. |
| Newsletter | Validates and stores to the configured Resend audience |
| Work / Blog filters, search | Client-side, synced to the URL, shareable |
| Theme toggle | Persists, no flash on reload |

### Storage

All of it is files in `content/`, on one persistence model:

- `posts/*.mdx`, `projects/*.mdx` — content
- `site.json` — profile, socials, SEO, avatar
- `comments.json` — moderation queue
- Resend audience — newsletter list (kept out of the public repository)

In development these write to your working copy. With a GitHub token they
become commits. Comment volume is the one thing to watch: every write
serialises the whole file, which suits a personal blog, not a busy forum.

### Still not real

- **Image upload** — the dropzones render but there is no asset store. Cover
  and avatar fields take a path to something already in `/public`.
- **Resend delivery** — the audience write works when Resend is configured; the
  sending domain must have valid SPF/MX records before owner notices can send.
- **View counts** — no analytics, so they show "—" rather than invented numbers.

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

- `auth.ts` — Google provider, JWT session (no database), single-email allowlist
- `proxy.ts` — redirects signed-out visitors away from `/admin` (convenience)
- `app/admin/(shell)/layout.tsx` — the real gate, checked server-side
- `app/admin/actions.ts` — every server action re-checks authorisation itself,
  because actions are reachable as POST endpoints regardless of which page
  rendered the form
- `lib/publish.ts` — commits MDX through the GitHub Contents API and returns the
  commit SHA used to track the Vercel deployment
- `lib/vercel-deployments.ts` — checks Vercel for that commit's deployment

## Deploying

Set the same variables in your host's environment, and add the production
callback URL to the Google OAuth client. `AUTH_SECRET` must be set in
production or sessions cannot be signed.
