# sudi.dev — Public Portfolio Site

**Date:** 2026-08-04
**Status:** Approved
**Source design:** `/Users/sudi/Downloads/Sudi David/Sudi David.pen` (Pencil, format v2.15)

## Goal

Implement the public-facing portfolio site from the `Sudi David.pen` design in Next.js with
Tailwind CSS: five pages, dark and light themes, MDX-backed content, fully responsive.

## Scope

**In scope** — the five public page frames and the component library they share:

| Route | Design frame (node id) | Light variant |
| --- | --- | --- |
| `/` | Portfolio Homepage (`IwfbA`) | `a8xzJD` |
| `/work` | Work Page (`Bec8Y`) | `JC7vp` |
| `/blog` | Blog Page (`WfzCp`) | `q7lbkQ` |
| `/blog/[slug]` | Article Page (`Q32Zak`) | `hgxaA` |
| `/about` | About Page (`pGYVb`) | `OEv2X` |

Plus three routes the design does not cover but a developer blog requires: `/rss.xml`,
`/sitemap.xml`, `/robots.txt`.

**Out of scope** — the seven admin CMS frames (Dashboard, Posts, Post Editor, Projects,
Add Project, Comments, Settings). These are deferred to a separate spec. The `admin-*`
design tokens are still defined in this build so the later work starts from a complete
token set.

**Also out of scope:** authentication, a database, comment submission, and newsletter
subscription. The comment thread on the article page and the "Stay Updated" form on the
blog sidebar render as designed but are presentational only.

## Stack

- Next.js 16.3.0 — App Router, React Server Components by default
- React 19.2
- TypeScript, strict mode
- Tailwind CSS 4.3 — CSS-first `@theme` configuration
- pnpm
- `gray-matter` + `next-mdx-remote/rsc` for content
- No animation library, no UI component library

Tailwind v4 is chosen specifically because the design's variables map one-to-one onto its
CSS-first `@theme` block. The tokens live in CSS as the single source of truth rather than
being transcribed into a JavaScript config, so the design file and the code share one
vocabulary.

## Design tokens

Eleven themed colors, extracted verbatim from the `.pen` `variables` block. Defined as CSS
custom properties on `:root` (dark) with overrides under `.light`, then surfaced to Tailwind
via `@theme`. Token names match the design file exactly.

| Token | Dark | Light |
| --- | --- | --- |
| `bg-primary` | `#0B0B11` | `#FFFFFF` |
| `bg-secondary` | `#13131B` | `#F5F7FA` |
| `bg-card` | `#1A1A24` | `#FFFFFF` |
| `bg-elevated` | `#22222E` | `#EDF0F5` |
| `text-primary` | `#EDEDF0` | `#1A1D24` |
| `text-secondary` | `#8B8B96` | `#5A6070` |
| `text-tertiary` | `#5C5C66` | `#8B91A0` |
| `accent` | `#607EBC` | `#607EBC` |
| `accent-dim` | `#607EBC20` | `#D1E0D7` |
| `border` | `#2A2A35` | `#D8DCE4` |
| `border-hover` | `#3A3A48` | `#C0C6D2` |

Fourteen `admin-*` tokens (single-valued, no theme variance) are defined but unused.

**Typography** — three families, all self-hosted through `next/font` so there is no layout
shift and no external font request:

- Inter — body and UI (503 uses in the design)
- Geist — display headings (96 uses)
- Geist Mono — code, labels, metadata (162 uses)

The design's type scale is 10–52px. Sizes are expressed as Tailwind utilities against the
default scale where they align, and as explicit values where they do not.

## Theming

Dark is the default: the design's primary frame set is dark, and the light frames are
variants of it.

Resolution order on first paint: `localStorage` preference, then `prefers-color-scheme`,
then dark. This runs in an inline script in `<head>` before hydration so there is no flash
of the wrong theme. The `ThemeToggle` component (design: `Header Right` → `Theme Toggle`,
sun and moon icons) writes the preference and toggles the `.light` class on `<html>`.

`ThemeToggle` is one of only a handful of client components.

## Content layer

Content is MDX in the repository, read at build time.

```
content/
  posts/*.mdx       — frontmatter: title, excerpt, date, readingTime, category, cover, featured
  projects/*.mdx    — frontmatter: title, year, description, tech[], category, cover, links
```

All page components read through a single narrow interface in `lib/content.ts`:

- `getPosts(): Promise<Post[]>`
- `getPost(slug): Promise<Post | null>`
- `getProjects(): Promise<Project[]>`
- `getProject(slug): Promise<Project | null>`

**This boundary is the point of the design.** When the admin CMS is built, it replaces the
internals of these four functions with database reads. No page or component changes. The
`Post` and `Project` types are the contract between the two halves of the system.

### Seed content

The site ships populated with the real copy from the design file rather than placeholder
text. Extracted from the `.pen` component instance overrides:

**Projects** (6, from Work Page → Projects Section): Nexus CLI (2026, Rust/CLI/WASM),
Syncboard (2026, React/WebSocket/Yjs), Datapipe (2025, Go/Kafka/gRPC), Termsync (2025,
Rust/CLI/SSH), Reacton (2024, TypeScript/React/NPM), Infrawatch (2024,
Next.js/Docker/Grafana).

**Posts** (7): "Building a Real-Time Collaboration Engine from Scratch" (the featured post,
and the one the Article Page frame renders in full), plus "Why I Switched from REST to tRPC",
"Optimizing Docker Builds for Monorepos", "A Practical Guide to Database Migrations",
"The Case for Server Components", "Designing CLI Tools That Developers Love", and
"Event Sourcing in Practice".

Only the featured post has a full body in the design (the Article Page frame — intro, two
sections, a blockquote, and a code block). The other six have title, excerpt, date, and
reading time; their bodies will be short stubs consistent with their excerpts.

**Images** — the 13 PNGs in `Sudi David/images/` are copied to `public/images/`.

## Component inventory

The design's reusable components port directly, keeping their names:

| Component | Design node | Notes |
| --- | --- | --- |
| `LogoMark` | `L5mVv` | 80×33 |
| `TechBadge` | `pmyXs` | pill, `accent-dim` fill, Geist Mono 12/500 |
| `ProjectCard` | `ZxTDe` | 340w, homepage grid |
| `WorkProjectCard` | `sMypG` | 480w, work page grid |
| `ArticleItem` | `U25B8` | 700w, list row |
| `FeaturedBlogCard` | `HTw3I` | 900×320 |
| `StatusBadge` | `MJaWx` | "Available for work" dot |

Plus layout components not modeled as reusables in the design but repeated across every
frame: `SiteHeader`, `SiteFooter`, `PageIntro` (breadcrumb + title + subtitle), `ThemeToggle`.

Everything is a server component except `ThemeToggle` and the filter/search controls.

## Layout and responsive behavior

The design is auto-layout throughout: page frames are 1440px wide with `fill_container`
children and 48px horizontal gutters. There is no fixed inner container.

Implementation adds `max-w-[1440px] mx-auto` so the layout centers on wide displays, then
derives three breakpoints (the design has no tablet or mobile frames):

- Gutters: 48px → 24px at `md` → 16px at `sm`
- Homepage: the 260px left sidebar (avatar, status, bio, tech stack, socials) moves above
  Main Content below `lg`
- Blog: the right sidebar (newsletter, topics, stats) moves below the article list at `lg`
- Project grids: 3 columns → 2 at `lg` → 1 at `md`
- Header: nav links collapse into a mobile menu below `md`
- Article body: prose column caps at ~72ch regardless of viewport

## Interaction

**Filtering.** Work page has five filters (All, Web Apps, CLI Tools, Libraries, Open Source);
blog page has category filters and a search box. Both filter client-side over the already-
loaded list and sync to URL search params, so a filtered view is shareable and survives
reload. The header's search icon links to the blog search.

**States.** Hover and focus styling uses the design's own `border-hover` and `accent` tokens
— no invented colors. Every interactive element has a visible focus ring.

**Motion.** CSS only: theme transition, card hover lift, scroll-reveal on section entry. All
motion is wrapped in `@media (prefers-reduced-motion: no-preference)`.

## Accessibility

- Semantic landmarks: `header`, `nav`, `main`, `article`, `footer`
- Heading hierarchy follows the design's visual hierarchy, no skipped levels
- Theme toggle is a labelled `button` with `aria-pressed`
- Filters are a `radiogroup`; the search box is a labelled `input`
- Target: WCAG 2.1 AA contrast in both themes. `text-tertiary` on `bg-primary` needs
  verification in both themes and adjustment if it fails.

## Testing

- Type checking and ESLint pass with zero errors
- `lib/content.ts` unit tested: frontmatter parsing, sorting, slug resolution, missing-file
  handling
- Filter and search logic unit tested as pure functions, independent of React
- Production build succeeds and all five routes render
- Manual verification of both themes at 1440 / 1024 / 768 / 375

## Decisions and known deviations from the design

1. **Duplicate hero code snippet.** The Homepage hero contains two `Code Snippet` frames
   with identical content. Treated as an accidental duplicate; one is rendered.

2. **AI-generated portraits.** The portrait and avatar images in the design are generated
   stock faces, not photographs of the site's owner. They are wired as swappable assets in
   `public/images/` so replacing them is a file drop with no code change. Flagged for
   replacement before the site goes live under a real name.

3. **Presentational forms.** The article comment thread and the newsletter form render as
   designed but do not submit anywhere. Wiring them requires the deferred backend work.

4. **Three undesigned routes.** `/rss.xml`, `/sitemap.xml`, and `/robots.txt` have no design
   frames. They are added because the design's footer links to RSS and a blog needs
   discoverability.

## Open questions

None. All forks were resolved before this spec was written: public site first, MDX content,
fully responsive with derived breakpoints, CSS-only motion.
