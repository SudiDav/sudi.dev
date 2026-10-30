# Cloudflare hosting migration

The main app runs with vinext alongside the original Next.js/Vercel build. The
family portal is a separate Workers Static Assets project. The production
domain configuration is prepared for staged deployment: stream portal first,
then the main app, following the normal develop-to-main release workflow.

## Build and preview

```sh
pnpm install --frozen-lockfile
pnpm dev:vinext
pnpm build:vinext --mode preview
pnpm start:vinext --host 127.0.0.1 --port 4173
```

`preview` mode creates `sudi-dev-preview`, without production identity,
publishing, email, or AI bindings. Give its local runtime an `AUTH_SECRET` in
an ignored `.dev.vars` file. Deployed previews use a separate random secret,
never the production secret or a committed test fixture.

Deploy built preview output with the authenticated Cloudflare CLI:

```sh
pnpm exec cf deploy --prebuilt --mode preview --secrets-file .env.cloudflare-preview-secrets.json
```

That private JSON file contains only the preview `AUTH_SECRET`. It is ignored
by git. The public preview address is https://preview.sudi.dev.

For the stream portal, run the root-installed Vite and cf binaries from
`sites/stream`:

```sh
../../node_modules/.bin/vite build
../../node_modules/.bin/cf deploy --prebuilt
```

The portal was verified at https://stream-preview.sudi.dev; its production
configuration now targets https://stream.sudi.dev. These custom domains
use Cloudflare DNS. Public resolvers may still follow cached Namecheap
delegation while the earlier nameserver migration propagates. Do not change
nameservers again to work around those caches.

## Configuration and content

- `cloudflare.config.ts` declares main Worker bindings. The production Worker
  targets `sudi.dev`, following verified owner sign-in and publishing checks
  at the temporary `migration.sudi.dev` hostname. `preview` mode has its own hostname
  and no production credentials. Production workers.dev and version URLs
  are explicitly disabled; existing dashboard logging settings are preserved.
- `vite.config.ts` disables Node standalone output for Workers while preserving
  the same redirects and Server Action size limit.
- `build-plugins/content.ts` embeds only posts, projects, and `site.json` into
  a server-only module. Original Node filesystem loading remains intact. New
  content reaches visitors after a GitHub commit and a successful rebuild.
- Articles still use the existing React components and styles. Plain Markdown
  is converted to React elements without `new Function`, which Workers blocks.
  The existing safe-Markdown validation remains mandatory.
- Images are served without a paid optimization binding. Font files are built
  into the site. No R2 bucket or database is required for the current site.
- The stream site's `_headers` preserves its restrictive CSP and noindex rules.

## Production credentials: required before cutover

Vercel's production export returned `[SENSITIVE]` instead of the protected
values. Do not upload these placeholders or replace them with test fixtures.
The owner entered replacement GitHub OAuth, publishing, and Resend credentials
privately. All nine required secret names are confirmed saved in Cloudflare.
Real GitHub owner sign-in, Resend audience/broadcast reads, GitHub comment reads,
and an unpublished admin save to the migration branch have been verified.
No newsletter or owner notification was sent during verification.

Use Cloudflare secret storage, or a local ignored JSON file passed to
`cf deploy --secrets-file`. Never commit, print, or send the values in chat.

| Feature | Required settings |
| --- | --- |
| Owner sign-in | `AUTH_SECRET`, `ADMIN_EMAIL`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` |
| Publishing | `GITHUB_TOKEN` with Contents read/write on this repo only |
| Email/newsletters | `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `CONTACT_EMAIL`, `EMAIL_FROM` |
| Weekly draft, when configured | `AI_API_KEY`, `AI_MODEL`, optional `AI_BASE_URL`, `CRON_SECRET` |

The main config sets `AUTH_TRUST_HOST=true`, `GITHUB_REPO=SudiDav/sudi.dev`, and
`GITHUB_BRANCH=main`. Never bind `AUTH_DEV_BYPASS` in a deployed Worker. Keep
production OAuth's callback at `https://sudi.dev/api/auth/callback/github`.
A real OAuth test on another hostname needs a separate test OAuth application
or an explicitly approved additional exact redirect URI on the existing app.
Keep the production and localhost redirect URIs unchanged. The temporary
validation URI is `https://migration.sudi.dev/api/auth/callback/github`;
the owner approved and saved it for testing. Remove that temporary URI after
the production sign-in check, keeping the original two URIs.

Production publishing also requires a connected Cloudflare GitHub build that
deploys `main`, including content-only commits. Use `pnpm install
--frozen-lockfile`, `pnpm build:vinext`, and the prebuilt Cloudflare deployment.
Configure the public `NEXT_PUBLIC_GISCUS_*` values in the build environment.
The existing Cloudflare GitHub connection now watches `main`, uses
`pnpm run build:vinext` and `pnpm exec cf deploy --prebuilt`, and has the four
public comment-widget settings saved. Their repository and Announcements
category identifiers match the live Vercel site's public client bundle.
Automatic branch previews on the production Worker are disabled; public
previews continue to use the separately isolated preview Worker.
The connection temporarily watched the migration branch for a real admin-save
test, and has been restored to `main`. The test save created commit `4efe732`;
Cloudflare build `bf77f9e3-bc30-4084-98c7-ff9bb52cda14` successfully deployed it
after the temporary publishing-branch override was restored to `main`.
The unpublished draft returned 404 and was absent from the public blog,
sitemap, and RSS; it is removed from this release. Keep authored/runtime
branch settings aligned: native builds correctly reject conflicting dashboard
overrides. GitHub requests identify the app with a required `User-Agent`,
including the anonymous fallback for public discussion reads.
Do not switch production before a controlled publishing commit has been
observed reaching the Cloudflare deployment. Until a supported commit-status
integration is configured, admin status explicitly says unavailable and asks
the owner to check Cloudflare; it never calls a Vercel build a Cloudflare success.

## Analytics

Cloudflare has separate manual-install Web Analytics entries:

- stream.sudi.dev: site tag `91614435c7774192be04338832ab6ef7`.
- sudi.dev: site tag `dbf0a072c0254faea756f7405185203f`.

The beacon tokens in public source are public site identifiers, not API keys.
Automatic zone-wide injection is disabled for the main entry, preventing
duplicate stream measurement and unintended preview tracking. On Cloudflare,
the main site counts production public document loads only; SPA transitions
are not instrumented, so client-side navigation into admin is not observed.
This intentionally undercounts navigation between public pages compared to
the previous SPA page-view metric. On Vercel, the original Vercel beacon is
retained for rollback. Privacy copy follows the hosting provider.

New Cloudflare statistics are in its dashboard. Historical Vercel article
totals are not combined with them; the Cloudflare admin shows unavailable
rather than zero or stale lifetime counts. Beacon delivery and actual data
ingestion are separate checks. Production ingestion is pending cutover.

## Weekly job

`sites/weekly-article/worker.ts` invokes the protected weekly draft endpoint
through a service binding. Its schedule is deliberately empty and the Worker
has not been deployed. No paid AI calls, owner notices, or audience broadcasts
were made while testing.

After credentials and production publishing are verified: disable the Vercel
cron, wait for any in-flight run, then enable the Cloudflare scheduler with
`triggers.scheduled({ cron: '0 6 * * 1' })` using the current cf config API.
Verify that API's schema before editing. Monday 06:00 UTC is 08:00 Lubumbashi.
Keep same-week draft deduplication and the existing email idempotency behavior.
Never activate both schedules deliberately. The production Vercel export did
not include the AI/cron variables; check actual configuration before enabling
a previously inactive feature.
The inactive feature's AI/cron secrets are intentionally not declared as
required bindings in the main Worker. Add those bindings and their real values
when enabling it; declare `AI_BASE_URL` only if a custom endpoint is used.

## Verified and release checks

Verified locally: vinext production build, original Next.js production build,
typecheck, lint, the CI suite including analytics guards, and direct Workers
requests for public pages, article bodies, sitemap/RSS, and protected endpoints.
Local fixture sessions proved owner acceptance and non-owner rejection without
altering Auth.js. HTTP local tests set `x-forwarded-proto=http`; real deployed
requests use HTTPS and secure session cookies. Browser inspection confirmed the
home page, styles, fonts, and interactive 3D scene load.

A controlled unpublished fixture was included in a local Worker build: its
public article URL returned 404, its marker was absent from blog/RSS/sitemap
responses and every public asset, and present only in the server bundle. The
fixture was removed after the local check. A separate unpublished admin draft
subsequently verified the real GitHub-save-to-Cloudflare-build path, with the
same public 404 and blog/RSS/sitemap exclusion checks. It is removed from the
release. GitHub API request-header regression coverage also passes.

Cloudflare previews were deployed. Direct requests to their Cloudflare edge
with normal certificate validation returned HTTPS 200 for the portal and main
public pages, an article, RSS, and the social image; unsigned admin status
returned 401. A build measured about 1.93 MiB compressed, below the free plan's
bundle limit; this does not guarantee every future request stays within CPU
or daily request limits.

An independent source review found no critical or important issues. Latest main
preview version: `590fe6ca-c683-4526-8279-9f3315b8492e`. Stream preview version:
`25f73a42-1a78-4995-a66d-dd51fef970e1`. The parent `.dev` registry and the
refreshed Cloudflare resolver confirm Cloudflare nameservers. Browser access
to the owner-validation hostname works after refreshing stale NS, A, and AAAA
entries through Cloudflare's public DNS cache tool.

Release verification must also cover the live addresses, owner sign-in on the
production hostname, unchanged mail DNS, and actual production analytics
ingestion. Runtime credentials, real OAuth, Resend reads, comment reads, and
the native GitHub publishing/build connection have been verified on the
temporary owner-validation deployment.

## Cutover and rollback

Leave Namecheap mail MX, SPF/DKIM records, Resend verification, existing aliases,
`www`, and unrelated subdomains untouched. R2 storage, mail migration, paid plans,
and video hosting are outside this change.

After each preview passes, add its production hostname to its Worker config
and deploy through the normal develop-to-main PR workflow. Record DNS targets
before switching them. Stream's fallback is the existing Vercel project
`sudi-stream`; main's fallback is `sudi-dev` on Vercel. Keep both projects and
their private environment configuration intact.

If rolling back the main site, disable the Cloudflare schedule first, restore
the prior website DNS target and matching Vercel build, then restore the Vercel
schedule if it had been active. Preserve any content commits made during the
migration. Do not change mail DNS or nameservers as part of a website rollback.
