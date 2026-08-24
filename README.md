# sudi.dev

Personal portfolio and publishing site for Sudi M. David, a full-stack engineer
working in the fintech industry and on lending, agriculture, school administration,
and other systems that organizations depend on.

The site is both a public portfolio and a small Git-backed CMS:

- Portfolio pages for work, experience, skills, and contact details.
- An MDX blog with search, category filters, RSS, redirects, and comments.
- An authenticated admin area for editing posts, projects, and site settings.
- GitHub-backed publishing: production edits are committed to the repository,
  which lets the normal deployment pipeline publish them.
- Resend newsletter subscriptions, giscus/GitHub Discussions comments, and
  Vercel Web Analytics.
- Light and dark themes, responsive layouts, and Docker deployment support.

## Stack

- Next.js 16 App Router, React 19, and TypeScript
- Tailwind CSS 4
- MDX via `next-mdx-remote` with frontmatter from `gray-matter`
- NextAuth/Auth.js with GitHub OAuth
- Resend for newsletter contacts and email notifications
- giscus for GitHub Discussions-backed comments
- Leaflet and OpenStreetMap/CARTO tiles for the location map
- Vitest, ESLint, and the Next.js type checker

## Requirements

- Node.js 22 or newer
- pnpm 11 (the required version is recorded in `package.json`)

## Local development

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

The public pages work without external credentials. The admin and optional
integrations need environment variables; see [`.env.example`](.env.example) for
the complete list.

For local admin development, set `AUTH_DEV_BYPASS=true` and provide
`ADMIN_EMAIL`. This bypass is only registered outside production builds. For a
real sign-in, configure the GitHub OAuth variables and use the account's
verified primary GitHub email as `ADMIN_EMAIL`.

## Useful commands

```bash
pnpm dev          # Start the development server with Turbopack
pnpm lint         # Run ESLint
pnpm typecheck    # Generate Next.js route types and run TypeScript checks
pnpm test         # Run the Vitest suite
pnpm build        # Create a production build
pnpm start        # Serve the production build
```

## Project structure

```text
app/                  Next.js routes, layouts, API routes, and admin screens
components/           Public UI, theme controls, forms, and admin components
content/posts/        Blog posts as MDX files
content/projects/     Portfolio projects as MDX files
content/site.json     Public profile, social links, and SEO settings
lib/                  Content loading, publishing, filters, email, and utilities
public/               Static images and other public assets
docs/                 Deployment, workflow, and admin notes
```

## Content workflow

### Posts

Create or edit an MDX file in `content/posts/`. Frontmatter controls the title,
excerpt, date, reading time, category, cover image, featured state, tags, and
publication status. The article body is rendered as MDX, with custom styling
for headings, links, lists, blockquotes, and code blocks.

### Projects

Create or edit an MDX file in `content/projects/`. Project frontmatter controls
the title, year, summary, category, technologies, cover image, and optional
live/source links. Project detail content is kept in the MDX body so it can be
expanded into case studies as the portfolio grows.

### Admin publishing

The admin is available at `/admin` after GitHub authentication. In development,
configured saves write to the local working copy. In production, saves require
`GITHUB_TOKEN`, `GITHUB_REPO`, and `GITHUB_BRANCH`; the GitHub Contents API then
commits the changed MDX or image file. The resulting deployment makes the
change public.

`NEXT_PUBLIC_GISCUS_*` values are build-time client configuration. Set them
before building if comments should be included in the deployment.

## Deployment

### Vercel

Import the repository into Vercel and configure the variables described in
[`docs/deploy.md`](docs/deploy.md). The application detects Vercel builds and
does not enable standalone output there.

### Docker

The repository includes a multi-stage Dockerfile and a Compose configuration
for a Traefik-hosted deployment:

```bash
docker compose up -d --build
```

The Compose setup expects an existing external `traefik` network and a router
configured for `sudi.dev`; adjust those values in `compose.yaml` for another
host.

## Integrations and privacy

- Vercel Web Analytics measures aggregate page usage.
- Resend stores newsletter contacts when configured.
- giscus embeds GitHub Discussions for article comments.
- The About page can request map tiles from CARTO/OpenStreetMap.

See the [privacy page](app/privacy/page.tsx) and [`docs/deploy.md`](docs/deploy.md)
for the current data and deployment details.

## Reuse

This is a personal site and its content is not intended as a reusable template.
Contact the author before reusing the written content, branding, or personal
information.
