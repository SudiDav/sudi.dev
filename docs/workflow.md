# Branching and deployment

```
  work ──▶ develop ──PR──▶ main ──▶ production (sudi.dev)
             │                │
          preview           CI must pass
```

## The branches

**`develop`** is the GitHub default, so new branches and PRs start from it and
target it. Pushing here builds a Vercel **preview** deployment on its own URL —
the real thing, on real data, without touching production.

**`main`** is Vercel's production branch. Every commit that lands here deploys
to sudi.dev automatically. Nothing else does.

## Getting a change to production

```bash
git switch develop && git pull
git switch -c fix/whatever
# …work…
git push -u origin fix/whatever
gh pr create --base develop
```

Merge to `develop`, check the preview URL, then open a PR from `develop` to
`main`. Merging that deploys.

## What guards main

`main` requires the CI check — typecheck, lint, tests and a production build —
to pass, and to have run against the current tip of `main` (`strict`). Force
pushes and branch deletion are blocked.

Admins are deliberately *not* included in the restriction: locking yourself out
of your own site at 2am is worse than the rule it would enforce. The protection
is there to stop mistakes, not to be unbypassable.

## CI

`.github/workflows/ci.yml` runs on every PR and on pushes to `develop` and
`main`. It builds with the giscus variables set, then starts the built app and
runs the tests against it — the outbound-link tests read rendered HTML, and skip
themselves if nothing is serving. Without that step they would pass silently
while checking nothing.

## Environment variables

Vercel holds them per environment. Note that `NEXT_PUBLIC_*` values are inlined
at **build** time: adding one later requires a redeploy, not a restart, and a
missing one fails silently rather than loudly.
