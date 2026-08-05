# sudi.dev — Portfolio Site and Admin CMS

**Date:** 2026-08-04
**Status:** Approved
**Source design:** `/Users/sudi/Downloads/Sudi David/Sudi David.pen` (Pencil, format v2.15)

## Goal

Replicate the `Sudi David.pen` design in Next.js with Tailwind CSS — all twelve screens, at
exact fidelity to the design file. Delivered in two phases: the public site first, then the
admin CMS.

## Governing principle: exact replication

The design file is the specification. Where this document and the `.pen` file disagree, the
`.pen` file wins.

Concretely, this means every measurement comes from the design's node data, not from
eyeballing a screenshot:

- Padding, gap, width, height, corner radius, stroke width — read from the node's own
  properties
- Colors — the node's `fill` / `stroke` token reference, never a visually-matched
  substitute
- Type — the node's `fontFamily`, `fontSize`, `fontWeight`, and line height
- Copy — the node's `content` string verbatim, including punctuation and em dashes
- Structure — the frame hierarchy and flex direction/alignment as authored

Elements are not omitted, merged, or "cleaned up" because they look redundant, and nothing
is added that the design does not contain. Judgment is reserved for the two areas the design
genuinely does not specify: responsive behavior below 1440px, and motion.

**Method.** A throwaway extraction script reads the `.pen` JSON and dumps a per-frame spec
(every node's box model, color tokens, and type) for the frame being built. Components are
written against that dump. This is faster and far more accurate than reading screenshots,
and it is how the token table and content inventory below were produced.

## Scope

### Phase 1 — public site

| Route | Design frame (node id) | Light variant |
| --- | --- | --- |
| `/` | Portfolio Homepage (`IwfbA`) | `a8xzJD` |
| `/work` | Work Page (`Bec8Y`) | `JC7vp` |
| `/blog` | Blog Page (`WfzCp`) | `q7lbkQ` |
| `/blog/[slug]` | Article Page (`Q32Zak`) | `hgxaA` |
| `/about` | About Page (`pGYVb`) | `OEv2X` |

Plus `/rss.xml`, `/sitemap.xml`, `/robots.txt` — no design frames, added because the
design's footer links to RSS and a blog needs discoverability.

### Phase 2 — admin CMS

| Route | Design frame (node id) |
| --- | --- |
| `/admin` | Admin — Dashboard (`zwl6e`) |
| `/admin/posts` | Admin — Posts (`Ft82l`) |
| `/admin/posts/[id]/edit` | Admin — Post Editor (`URoAP`) |
| `/admin/projects` | Admin — Projects (`oCuwD`) |
| `/admin/projects/new` | Admin — Add Project (`lfaWi`) |
| `/admin/comments` | Admin — Comments (`jRwge`) |
| `/admin/settings` | Admin — Settings (`VQIph`) |

All seven frames are 1440×900. They use the `admin-*` token set and are light-only — the
admin has no dark variant in the design, and none is invented.

Phase 2 ships as faithful static UI backed by mock data. Authentication, a database, and
real persistence are **out of scope for this spec** and belong to a follow-up. Forms render
and validate client-side but do not write anywhere. The "Log Out" button on Settings is
presentational.

Phase 1 ships and is reviewable before Phase 2 begins.

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

Extracted verbatim from the `.pen` `variables` block. The eleven themed colors become CSS
custom properties on `:root` (dark) with overrides under `.light`, then surface to Tailwind
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

The fourteen `admin-*` tokens are single-valued with no theme variance, and are used by
Phase 2:

| Token | Value | Token | Value |
| --- | --- | --- | --- |
| `admin-bg` | `#F8F9FB` | `admin-card` | `#FFFFFF` |
| `admin-sidebar` | `#111827` | `admin-border` | `#E5E7EB` |
| `admin-sidebar-hover` | `#1F2937` | `admin-text` | `#111827` |
| `admin-sidebar-active` | `#607EBC20` | `admin-text-secondary` | `#6B7280` |
| `admin-sidebar-text` | `#9CA3AF` | `admin-text-tertiary` | `#9CA3AF` |
| `admin-sidebar-text-active` | `#FFFFFF` | `admin-success` | `#10B981` |
| `admin-warning` | `#F59E0B` | `admin-danger` | `#EF4444` |

**Typography** — three families, all self-hosted through `next/font` so there is no layout
shift and no external font request:

- Inter — body and UI (503 uses in the design)
- Geist — display headings (96 uses)
- Geist Mono — code, labels, metadata (162 uses)

The design's type scale is 10–52px. Sizes are set to the design's exact pixel values; the
Tailwind default scale is used only where it already matches.

## Theming

Dark is the default for the public site: the design's primary frame set is dark, and the
light frames are variants of it.

Resolution order on first paint: `localStorage` preference, then `prefers-color-scheme`,
then dark. This runs in an inline script in `<head>` before hydration so there is no flash
of the wrong theme. The `ThemeToggle` component (design: `Header Right` → `Theme Toggle`,
sun and moon icons) writes the preference and toggles the `.light` class on `<html>`.

The admin is light-only and does not respond to the toggle — it has no dark frames in the
design.

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

**This boundary is the point of the design.** When the admin gains real persistence, it
replaces the internals of these four functions with database reads. No page or component
changes. The `Post` and `Project` types are the contract between the two halves of the
system.

### Seed content — public site

Extracted from the `.pen` component instance overrides. Ships populated with the design's
real copy, not placeholder text.

**Projects** (6, from Work Page → Projects Section): Nexus CLI (2026, Rust/CLI/WASM),
Syncboard (2026, React/WebSocket/Yjs), Datapipe (2025, Go/Kafka/gRPC), Termsync (2025,
Rust/CLI/SSH), Reacton (2024, TypeScript/React/NPM), Infrawatch (2024,
Next.js/Docker/Grafana).

**Posts** (7): "Building a Real-Time Collaboration Engine from Scratch" (the featured post,
and the one the Article Page frame renders in full), plus "Why I Switched from REST to
tRPC", "Optimizing Docker Builds for Monorepos", "A Practical Guide to Database
Migrations", "The Case for Server Components", "Designing CLI Tools That Developers Love",
and "Event Sourcing in Practice".

Only the featured post has a full body in the design (the Article Page frame — intro, two
sections, a blockquote, and a code block). The other six have title, excerpt, date, and
reading time; their bodies will be short stubs consistent with their excerpts.

### Mock data — admin

**The admin screens use different sample data than the public site.** The admin's projects
are CollabSync, TypeForge, QueryBench, DevPulse, StackDeploy, and MemoGraph; its posts
include "Optimizing React Renders at Scale" and "Type-Safe API Layers with tRPC", which do
not exist on the public site. Its counters (18 posts, 142 comments) do not match the public
content either.

Under exact replication, **each screen renders its own content as designed.** The admin's
mock data lives in a separate fixture module and is not reconciled with the public MDX
content. Reconciling the two is a product decision for the follow-up spec that gives the
admin real persistence, not something to silently fix here.

**Images** — the 13 PNGs in `Sudi David/images/` are copied to `public/images/`.

## Component inventory

The design's nine reusable components port directly, keeping their names:

| Component | Design node | Phase | Notes |
| --- | --- | --- | --- |
| `LogoMark` | `L5mVv` | 1 | 80×33 |
| `TechBadge` | `pmyXs` | 1 | pill, `accent-dim` fill, Geist Mono 12/500 |
| `ProjectCard` | `ZxTDe` | 1 | 340w, homepage grid |
| `WorkProjectCard` | `sMypG` | 1 | 480w, work page grid |
| `ArticleItem` | `U25B8` | 1 | 700w, list row |
| `FeaturedBlogCard` | `HTw3I` | 1 | 900×320 |
| `AdminNavItem` | `NwfPg` | 2 | 220w sidebar row |
| `StatCard` | `Z5YYn7` | 2 | 280w dashboard tile |
| `StatusBadge` | `MJaWx` | 2 | post-status pill, `admin-success` |

The homepage's "Available for work" indicator is *not* the `StatusBadge` component — it is
inline markup in the homepage sidebar (`Status` frame: 6px ellipse plus text). Only the
admin's post-status pill is the reusable.

Plus layout components not modeled as reusables in the design but repeated across frames:
`SiteHeader`, `SiteFooter`, `PageIntro` (breadcrumb + title + subtitle), `ThemeToggle`, and
for Phase 2 `AdminSidebar` (identical across five of the seven admin frames) and
`AdminTopBar`.

Everything is a server component except `ThemeToggle`, the filter/search controls, and the
admin form controls.

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
- Admin: the 220px sidebar collapses to an icon rail below `lg` and a drawer below `md`;
  the Posts table scrolls horizontally rather than reflowing

At 1440px every screen is a pixel match to its frame. Below that, the derived rules apply.

## Interaction

**Filtering.** Work page has five filters (All, Web Apps, CLI Tools, Libraries, Open
Source); blog page has category filters and a search box. Both filter client-side over the
already-loaded list and sync to URL search params, so a filtered view is shareable and
survives reload. The header's search icon links to the blog search. Admin list screens
(Posts, Comments) filter the same way over their fixtures.

**States.** Hover and focus styling uses the design's own `border-hover`, `accent`, and
`admin-sidebar-hover` tokens — no invented colors. Every interactive element has a visible
focus ring.

**Motion.** CSS only: theme transition, card hover lift, scroll-reveal on section entry. All
motion is wrapped in `@media (prefers-reduced-motion: no-preference)`.

## Accessibility

- Semantic landmarks: `header`, `nav`, `main`, `article`, `footer`
- Heading hierarchy follows the design's visual hierarchy, no skipped levels
- Theme toggle is a labelled `button` with `aria-pressed`
- Filters are a `radiogroup`; search and form fields have associated labels — the admin
  forms label visually, so those map to real `<label>` elements
- Admin tables use `th` with scope, not styled divs
- Target: WCAG 2.1 AA contrast in both themes

Where an exact design color fails AA, the design value is kept and the failure is recorded
in the delivery notes rather than silently corrected — the design is the specification, and
changing its palette is the user's call. `text-tertiary` on `bg-primary` and
`admin-text-tertiary` on `admin-card` are the two to check.

## Testing

- Type checking and ESLint pass with zero errors
- `lib/content.ts` unit tested: frontmatter parsing, sorting, slug resolution, missing-file
  handling
- Filter and search logic unit tested as pure functions, independent of React
- Production build succeeds and every route renders
- Fidelity check per frame: the built page at 1440px compared against the design frame,
  with the extraction dump as the reference for spacing and type
- Manual verification of both themes at 1440 / 1024 / 768 / 375

## Decisions

1. **The two hero code snippets are a deliberate stacked effect, not a duplicate.** Both
   are `layoutPosition: absolute` inside the Hero at (920, 40) and (1019, 203), at
   `opacity: 0.5` with an outer shadow — offset floating cards on the hero's right.
   An earlier reading of this as an accidental duplicate was wrong.

2. **The AI-generated portraits ship as-is.** They are wired as swappable assets in
   `public/images/` so replacing them later is a file drop with no code change. Worth
   noting before the site goes live under a real name, but not changed here.

3. **Forms are presentational.** The article comment thread, the newsletter form, and every
   admin form render exactly as designed but do not submit anywhere. Wiring them requires
   the deferred backend spec.

4. **Admin and public content are not reconciled.** See "Mock data — admin" above.

5. **Three undesigned routes are added.** `/rss.xml`, `/sitemap.xml`, `/robots.txt`.

## Open questions

None. All forks resolved: all twelve screens at exact fidelity, public site shipped first,
MDX content behind a swappable interface, responsive breakpoints derived, CSS-only motion.
