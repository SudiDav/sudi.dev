# Sudi Stream welcome portal

An independent English/French static website for `stream.sudi.dev`. The portfolio remains the root Next.js application. This portal does not load portfolio environment variables or collect Stremio accounts, passwords, provider keys, or access-request form submissions.

## Current behavior

Visitors can read device-specific Stremio guidance, switch language, and open their email client to request an invitation from `contact@sudi.dev`. Opening the email draft does not send it. The page explicitly states that automatic invitations are coming soon. Syncio and provider integration are not deployed by this project.

Cloudflare Web Analytics measures visits and page performance on `stream.sudi.dev`. The loader skips localhost and alternate deployment URLs. Its site token is public tracking configuration, not an account API credential. The footer explains the cookie-free statistics in English and French. The main portfolio retains its existing Vercel Analytics setup.

## Local preview

From the repository root:

```sh
python3 -m http.server 8766 --bind 127.0.0.1 --directory sites/stream/public
```

Open `http://127.0.0.1:8766`. This basic preview does not apply the production response headers from `vercel.json`; verify those on a Vercel deployment or through a header-aware preview server.

## Vercel deployment

Create a **separate** Vercel project named `sudi-stream` in the same account/team as the portfolio. Do not relink the existing portfolio project or move its domains.

- Framework preset: Other.
- No install or build command is required.
- Output directory: `public`.
- No environment variables are required.
- Domain: `stream.sudi.dev`.

For a direct CLI deployment, link the separate project from this directory and deploy this directory. Keep its Vercel Root Directory unset for a direct directory upload.

```sh
cd sites/stream
vercel link --project sudi-stream
vercel deploy --prod
```

If importing this Git repository instead, set **Root Directory** to `sites/stream`. Follow the repository's `develop` → `main` source workflow and use `main` for production. Changes to this directory can then be deployed separately from the portfolio.

After Vercel returns the exact DNS record for the subdomain, add only that subdomain record at the domain's DNS provider. Adding a project domain in Vercel alone does not configure its DNS.

### Published deployment (2026-10-30)

- Live portal: https://stream.sudi.dev (fallback: https://sudi-stream.vercel.app).
- Independent Vercel project: `sudi-stream` in `trykatchs-projects`.
- `stream` CNAME: `f164129511200d9c.vercel-dns-017.com` (DNS only).
- Vercel reports Valid Configuration; the custom address opens successfully over HTTPS.
- All 21 existing DNS records were copied and compared with Cloudflare before the nameserver change. Namecheap has `anna.ns.cloudflare.com` and `rick.ns.cloudflare.com` saved, and Cloudflare has activated the zone. Future DNS changes belong in Cloudflare.

## Security and verification

CSS, application scripts, and artwork are served locally. The response policy additionally permits Cloudflare's analytics beacon script and connections to its metrics endpoint. Other external scripts and connections, form submissions, and framing remain blocked. Search engines are asked not to index the portal; this is not an authentication mechanism. The welcome page is public and contains no invitation tokens or account credentials.

Before publishing, check the language switch, device chooser, invitation dialog, visitor-initiated email link, small-screen layout, response headers, and the absence of browser errors. After publishing, verify HTTPS and that `stream.sudi.dev` serves this portal rather than the portfolio.

## IMDb movie picks (Cloudflare)

The portal Worker serves `/api/movies` from a shared Workers KV snapshot. It discovers20 released, non-adult candidates from TMDB, resolves their IMDb IDs, then checks ratings through OMDb. Only IMDb scores >=7 with >=10,000 votes qualify. Results are sorted by IMDb score and vote count. This is a selection, not the complete IMDb Top250. The quality score does not imply an age classification.

A scheduled refresh runs at minute17 every6hours UTC. One run uses at most41 provider fetches and20 OMDb lookups (at most80 per scheduled day). Visitor reads never call either provider. Provider failures retain the last good snapshot; data older than24hours is labeled as saved picks. English/French controls remain available; provider movie titles and synopses are English.

Required Worker secrets on `sudi-stream`: `TMDB_READ_TOKEN` (TMDB API Read Access Token, not the v3 API key), `OMDB_API_KEY` (activated free key), and `MOVIE_REFRESH_TOKEN` (private maintenance token). Never put these in browser JS, URLs shared in chat, or source control. Previews omit all provider and maintenance secrets and schedules.

`POST /api/movies/refresh` accepts only the private maintenance Bearer token. It populates the first catalog after key setup and reuses snapshots younger than6hours. The token is for maintenance only, never an end-user control. The public API provides sanitized catalog fields and generic errors.

Build from this directory with `pnpm exec vite build`; deploy with `pnpm exec cf deploy --prebuilt`. A preview build uses `--mode preview` and has its own isolated KV storage. KV is provisioned by Cloudflare's configuration tooling on first production deploy. Existing main-site credentials, domain DNS and email are unrelated and remain unchanged.

Attribution logo: TMDB's approved Primary long (blue) SVG from https://www.themoviedb.org/about/logos-attribution (downloaded unmodified). OMDb data is CC BY-NC4.0; TMDB API use is non-commercial with attribution. The UI links to individual IMDb records and does not provide playback or claim subscription availability.

### First-time setup

1. From `sites/stream`, run `pnpm exec vite build --mode setup`, then `pnpm exec cf deploy --prebuilt --mode setup`. This converts the existing static-only service into a Worker so Cloudflare can accept secrets. It preserves the portal, shows an honest preparing state, and does not run scheduled/provider calls.
2. In the **sudi-stream** Worker Settings → Runtime variables and secrets, save the activated `TMDB_READ_TOKEN` and `OMDB_API_KEY` as **Secret**, never Plain text. Save `MOVIE_REFRESH_TOKEN` separately using a cryptographically random maintenance value.
3. Rebuild with `pnpm exec vite build` and deploy with `pnpm exec cf deploy --prebuilt`. This requires all three saved secrets and enables the six-hour schedule.
4. Make one authorized maintenance POST to populate the catalog, then verify the public API contains only public movie fields and the UI shows real provider ratings/posters. Initial deployment must not populate the live snapshot with test fixtures.

Scheduled calls deliberately bypass the six-hour manual refresh cooldown, so completion-time differences cannot skip every second scheduled refresh. Explicit missing IMDb IDs and N/A ratings can be excluded; malformed provider schemas abort the refresh and preserve the saved snapshot.
