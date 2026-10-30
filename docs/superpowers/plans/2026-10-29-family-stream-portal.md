# Family Stream Portal Deployment Plan

**Goal:** Publish the reviewed Sudi Stream welcome page at `stream.sudi.dev` using the existing Vercel account and this repository.

**Architecture:** A separate static Vercel project rooted at `sites/stream`. The portfolio's Next.js routes, deployment settings, authentication, and environment variables remain independent. The portal requires no server, database, provider key, or Stremio login. Automated Syncio invitations remain future work.

**Scope:** English and French copy, device guidance, official Stremio download links, and an invitation request that opens the visitor's email client addressed to the public `contact@sudi.dev` address. The page must explain that automated invitations are not yet available.

**Constraints:** Work from latest `origin/develop` in an isolated worktree. Preserve unrelated user files. Use a neutral branch and attribution-free commits. Never embed provider credentials. Keep all static assets local and use a restrictive content security policy. Do not change the apex domain's project or DNS records.

## Implementation

- [x] Copy the existing visual prototype into `sites/stream/public`, separating CSS and JavaScript so a restrictive content security policy can apply.
- [x] Replace local-only notices with an honest invitation availability notice and a manual email request action.
- [x] Add independent Vercel static deployment configuration and deployment instructions.
- [x] Check script syntax, local asset references, English/French interactions, invitation email targets, and mobile layout. Inspect the policy on a served response.
- [x] Review the isolated change and commit it. Open a PR against `develop` following the repository's source workflow.
- [x] Deploy the separate static project with the authenticated Vercel account. Add `stream.sudi.dev`, obtain its exact DNS requirement, and verify the live site after DNS is configured.

Published on 2026-10-30 at https://stream.sudi.dev. Vercel reports Valid Configuration, and the custom address opens over HTTPS. The user's subsequently requested Cloudflare migration preserved all 21 records; Namecheap saved Cloudflare's nameservers after explicit approval. Cloudflare activation remains pending registrar propagation at the time of this note.

## Deployment checks

The portal can be deployed independently of the portfolio. If Vercel or registrar authentication is unavailable, retain the complete reviewed source and report the precise missing access. A successful static deployment does not mean that Syncio or automatic invitations are active.
