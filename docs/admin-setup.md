# Admin setup

The admin at `/admin` is gated by Google sign-in and restricted to a single
email address. Publishing commits MDX back to this repository, which triggers a
redeploy.

Two things must be configured. Neither can be done for you — both involve
credentials that should only ever live in your `.env.local` (or your host's
environment settings), never in the repo.

## 1. Google sign-in

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create or
   pick a project.
2. **APIs & Services → OAuth consent screen** → choose **External**, fill in the
   app name and your email. You can leave it in *Testing* mode — add your own
   Gmail as a test user. There is no need to publish or get verified for a
   single-user admin.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorised redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://YOUR-DOMAIN/api/auth/callback/google` (once deployed)
4. Copy the Client ID and Client Secret into `.env.local`:

```
ADMIN_EMAIL=sudimayenge@gmail.com
AUTH_GOOGLE_ID=...apps.googleusercontent.com
AUTH_GOOGLE_SECRET=...
AUTH_SECRET=            # openssl rand -base64 32
```

`ADMIN_EMAIL` is the whole authorisation model: any other Google account that
completes sign-in is rejected before a session is issued, and the address is
re-checked on every request.

## 2. Publishing

Create a **fine-grained personal access token** at
[github.com/settings/tokens](https://github.com/settings/tokens?type=beta):

- Repository access: **Only select repositories** → this repo
- Permissions: **Contents → Read and write** (nothing else)

```
GITHUB_TOKEN=github_pat_...
GITHUB_REPO=sudidavid/sudi.dev
GITHUB_BRANCH=main
```

Until these are set the admin still loads and reads content; only saving is
disabled, and it says so rather than failing at the API call.

## How it fits together

- `auth.ts` — Google provider, JWT session (no database), single-email allowlist
- `proxy.ts` — redirects signed-out visitors away from `/admin` (convenience)
- `app/admin/(shell)/layout.tsx` — the real gate, checked server-side
- `app/admin/actions.ts` — every server action re-checks authorisation itself,
  because actions are reachable as POST endpoints regardless of which page
  rendered the form
- `lib/publish.ts` — commits MDX through the GitHub Contents API

## Deploying

Set the same variables in your host's environment, and add the production
callback URL to the Google OAuth client. `AUTH_SECRET` must be set in
production or sessions cannot be signed.
