# Admin Publishing and Resend Reliability

## Goal

Make admin publishing observable from commit through Vercel production, and
make newsletter signup report the actual Resend outcome instead of a false
success.

## Current state

- The deployed admin already writes through the GitHub Contents API.
- Production Vercel deploys from `main`; `GITHUB_BRANCH=main` is the intended
  production configuration.
- The admin currently confirms that a commit was created but does not know
  whether Vercel is building, ready, or failed.
- Resend audience contact creation succeeds, but the configured `sudi.dev`
  sending domain is failed because SPF and MX records are missing.
- `subscribe()` currently returns success even if audience storage fails.

## Design

### Publishing status

Publishing functions return GitHub commit metadata: SHA, branch, commit URL,
and target. Admin forms pass that metadata to a client-side status component.

The status component polls a protected admin route. The route queries the Vercel
Deployments API using `VERCEL_TOKEN` and `VERCEL_PROJECT_ID`, finds the production
deployment whose GitHub commit SHA matches the publish commit, and maps Vercel
states to `queued`, `building`, `ready`, `error`, or `unavailable`.

The UI shows:

1. Committed to `main`.
2. Deploying while Vercel is queued/building.
3. Live when Vercel reports ready, with links to the deployment and site.
4. A failure message and deployment link when Vercel reports an error.
5. A clear fallback when Vercel credentials are not configured.

The GitHub branch remains environment-controlled, with production documented and
configured to use `main`. This change does not create a new branch or alter the
deployment provider.

### Newsletter signup

Audience storage is the primary operation. `subscribe()` returns success only
when Resend accepts the contact. Notification email failure is reported as a
non-blocking warning because it should not undo a successful subscription.

The email module keeps provider failures typed and testable. No DNS records,
API keys, or personal email addresses are changed by the code change. The
`sudi.dev` domain must be repaired at the DNS provider and re-verified in Resend
before sender-address notifications can work.

## Configuration

Production requires:

- `GITHUB_REPO`, `GITHUB_BRANCH=main`, and `GITHUB_TOKEN`
- `VERCEL_PROJECT_ID` and `VERCEL_TOKEN` for authoritative deployment status
- `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `CONTACT_EMAIL`, and `EMAIL_FROM`

## Verification

- Unit tests cover commit metadata, Vercel status mapping, and Resend success and
  failure semantics.
- Existing lint, typecheck, and Vitest tests remain green.
- The deployed Vercel dashboard and Resend dashboard are checked read-only;
  DNS repair is explicitly left for the account owner.
