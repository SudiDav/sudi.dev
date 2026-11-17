# Stream Movie Picks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add automatically refreshed movie recommendations with IMDb ratings >=7 to stream.sudi.dev using the approved TMDB + OMDb free plans.

**Architecture:** Extend the existing static portal with a small Worker API. Only scheduled or authenticated maintenance refreshes call providers; visitors read a shared KV snapshot. Display up to20 released, non-adult movies with >=10,000 IMDb votes, sorted by IMDb score/votes; candidate discovery is TMDB, not an exhaustive IMDb ranking. Keep keys in Worker secrets and preserve English/French support and current portal style.

**Tech Stack:** Existing static HTML/CSS/JS, Cloudflare Worker/KV/cron, TypeScript/Vitest, no new dependencies.

**Spec:** User's approved in-chat description and TMDB + OMDb selection.

## Global Constraints

- No paid services, purchases, provider keys in browser/Git/chat, playback or provider-account integration.
- Maximum20 candidate lookups per refresh; refresh every6hours, at most80 OMDb lookups per scheduled day.
- Request handlers never call movie providers. Keep last good snapshot on provider errors; never invent scores.
- Isolated branch from latest origin/develop. Standard develop→main release, preserve latest main article edits.

## Review Focus

- Missing/invalid ratings, low votes, duplicates and unreleased titles must not appear.
- Failed/partial refresh must preserve last good data and expose no secrets.
- Public requests cannot spend provider quota or invoke maintenance without its secret.
- Movie text is untrusted; render using DOM text properties, fixed approved image/link origins.
- Mobile, French, loading, empty and unavailable states must remain usable.

### Task1: Catalog and Worker

Files: sites/stream/catalog.ts, worker.ts, cloudflare.config.ts; lib/stream-catalog.test.ts; lib/stream-worker.test.ts.
- [ ] Write failing boundary tests for rating/vote validation, release filtering, sorting/deduplication, bounded provider fetches, cache preservation and unauthorized refresh.
- [ ] Run targeted tests; implement catalog refresh and public read-only API with KV snapshot, protected refresh and scheduled handler.
- [ ] Run targeted tests/typecheck and build portal Worker.

### Task2: Movie section

Files: sites/stream/public/index.html, styles.css, app.js, movies.js, _headers, README.md.
- [ ] Add matching movie grid, IMDb score/votes, English/French labels, clear loading/empty/error/retry/last-update states, TMDB attribution and IMDb links.
- [ ] Permit only required image origins and same-origin API; public previews get no provider secrets.
- [ ] Verify browser desktop/mobile/French and retained portal interactions using labeled local fixture data, never fake live ratings.

### Task3: Release and private key handoff

- [ ] Review branch, pass relevant tests and required CI; merge develop→main after syncing latest main.
- [ ] Provision free KV, configure portal Worker and give user two named secret fields on Cloudflare (TMDB_READ_TOKEN, OMDB_API_KEY).
- [ ] After user privately saves keys, refresh catalog, verify real >=7 IMDb cards, quota bounds, secret isolation, production headers and retained portal behavior. Save screenshot.
