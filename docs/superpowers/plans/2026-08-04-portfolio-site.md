# sudi.dev Portfolio Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replicate all twelve screens of the `Sudi David.pen` design as a Next.js site — five public pages first, then a seven-screen admin CMS — at exact fidelity to the design file.

**Architecture:** Next.js App Router with React Server Components by default; client components only where interaction demands it (theme toggle, filters, forms). Design tokens live in CSS via Tailwind v4's `@theme`, named identically to the `.pen` variables. Content is MDX read at build time behind a four-function interface in `lib/content.ts`, so the deferred database work swaps the loader without touching a page.

**Tech Stack:** Next.js 16.3.0 · React 19.2 · TypeScript (strict) · Tailwind CSS 4.3 · lucide-react 1.28.0 · gray-matter · next-mdx-remote · Vitest · pnpm

**Spec:** [`docs/superpowers/specs/2026-08-04-portfolio-site-design.md`](../specs/2026-08-04-portfolio-site-design.md)

## Global Constraints

These apply to **every** task. They are not repeated per-task.

- **The design file is the specification.** Where this plan and the `.pen` file disagree, the file wins.
- **Never guess a value.** Before writing any component, run `node scripts/extract-frame.mjs "<Frame Name>"` and take every padding, gap, width, height, corner radius, stroke, color token, font family, font size, font weight, and line height from its output. Do not eyeball, do not round, do not substitute a near-enough Tailwind default.
- **Copy is verbatim.** Text comes from the extractor's `content=` fields exactly as written, including em dashes (—), middots (·), and curly quotes.
- **Nothing omitted, nothing added.** Do not merge elements that look redundant, drop decorative nodes, or invent content. The duplicate hero code snippet is intentional and both render.
- **Token names mirror the design.** `bg-card`, `text-secondary`, `border-hover`, `admin-sidebar-text-active` — never rename, never hardcode a hex where a token exists.
- **Icons are lucide.** Every `icon=` in the extractor output is a lucide name; import the PascalCase equivalent from `lucide-react` (`arrow-up-right` → `ArrowUpRight`).
- **Judgment is confined to two areas:** responsive behavior below 1440px, and motion. Everything else is dictated by the file.
- **Commit messages:** Conventional Commits. No AI/assistant attribution in commits, branches, or PR titles.
- **Versions are exact:** `next@16.3.0`, `react@19.2.x`, `tailwindcss@4.3.x`, `lucide-react@1.28.0`.

## Starting State

Already committed — do not redo:

- `design/Sudi David.pen` — vendored design source
- `public/images/*.png` — the 13 design assets
- `scripts/extract-frame.mjs` — the extraction tool (verified working)
- `docs/superpowers/specs/` — the spec
- `.gitignore`, git repo initialised

Useful commands:

```bash
node scripts/extract-frame.mjs --list                    # all frames + all tokens
node scripts/extract-frame.mjs "Portfolio Homepage"      # by name
node scripts/extract-frame.mjs IwfbA --depth 4           # by id, bounded depth
```

## File Structure

```
app/
  layout.tsx                  root layout, fonts, theme bootstrap script
  page.tsx                    /            Portfolio Homepage
  work/page.tsx               /work        Work Page
  blog/page.tsx               /blog        Blog Page
  blog/[slug]/page.tsx        /blog/:slug  Article Page
  about/page.tsx              /about       About Page
  rss.xml/route.ts            feed
  sitemap.ts, robots.ts       Next.js metadata routes
  globals.css                 tokens + @theme + base styles
  admin/                      phase 2 — layout.tsx + 7 routes
components/
  site-header.tsx  site-footer.tsx  theme-toggle.tsx  page-intro.tsx
  logo-mark.tsx  tech-badge.tsx
  project-card.tsx  work-project-card.tsx  article-item.tsx  featured-blog-card.tsx
  filter-bar.tsx  blog-search.tsx
  admin/                      phase 2 — sidebar, nav-item, stat-card, status-badge
lib/
  content.ts                  getPosts/getPost/getProjects/getProject
  content.types.ts            Post, Project
  filters.ts                  pure filter/search functions
  admin-fixtures.ts           phase 2 — admin mock data
content/
  posts/*.mdx  projects/*.mdx
```

Each component file owns one design node. Filtering logic lives in `lib/filters.ts` as pure functions so it is testable without React.

---

# Phase 1 — Public Site

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing
- Produces: a running Next.js app on `pnpm dev`; `pnpm test`, `pnpm build`, `pnpm typecheck` scripts

- [ ] **Step 1: Scaffold the app**

Run from the repo root. The directory is not empty, so scaffold in place:

```bash
pnpm create next-app@16.3.0 . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --use-pnpm --eslint --turbopack
```

Answer "yes" to proceeding in a non-empty directory. It will not overwrite `design/`, `scripts/`, `docs/`, or `public/images/`.

- [ ] **Step 2: Pin versions and add dependencies**

```bash
pnpm add next@16.3.0 react@19.2.0 react-dom@19.2.0 lucide-react@1.28.0 gray-matter next-mdx-remote
pnpm add -D tailwindcss@4.3.3 vitest @vitejs/plugin-react vite-tsconfig-paths
```

- [ ] **Step 3: Add scripts to `package.json`**

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: { environment: 'node', include: ['lib/**/*.test.ts'] },
})
```

- [ ] **Step 5: Verify the toolchain**

```bash
pnpm typecheck && pnpm build
```

Expected: both succeed. `pnpm test` reports "No test files found" — that is fine at this stage.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with TypeScript, Tailwind, and Vitest"
```

---

### Task 2: Design tokens, fonts, and theming

**Files:**
- Modify: `app/globals.css`, `app/layout.tsx`
- Create: `components/theme-toggle.tsx`

**Interfaces:**
- Consumes: Task 1 scaffold
- Produces: CSS custom properties for all 25 tokens; Tailwind utilities `bg-bg-card`, `text-text-secondary`, `border-border-hover`, `bg-admin-sidebar`, …; `<ThemeToggle />` with no props

- [ ] **Step 1: Get the exact token values**

```bash
node scripts/extract-frame.mjs --list
```

The `Tokens:` section is authoritative. Copy the hex values from it — do not retype from memory.

- [ ] **Step 2: Write `app/globals.css`**

Dark is the default; `.light` overrides it. Both blocks must contain all eleven themed tokens.

**The raw custom properties are deliberately named without the `--color-` prefix.** Tailwind v4's
`@theme inline` generates properties *called* `--color-bg-card`, so if the raw value were also
`--color-bg-card` the definition would reference itself and resolve to nothing. Raw values use bare
names (`--bg-card`); `@theme inline` maps them to the `--color-*` names Tailwind consumes.

```css
@import "tailwindcss";

:root {
  --bg-primary: #0B0B11;
  --bg-secondary: #13131B;
  --bg-card: #1A1A24;
  --bg-elevated: #22222E;
  --text-primary: #EDEDF0;
  --text-secondary: #8B8B96;
  --text-tertiary: #5C5C66;
  --accent: #607EBC;
  --accent-dim: #607EBC20;
  --border: #2A2A35;
  --border-hover: #3A3A48;

  /* Admin — single-valued, no theme variance. Phase 2. */
  --admin-bg: #F8F9FB;
  --admin-sidebar: #111827;
  --admin-sidebar-hover: #1F2937;
  --admin-sidebar-active: #607EBC20;
  --admin-sidebar-text: #9CA3AF;
  --admin-sidebar-text-active: #FFFFFF;
  --admin-card: #FFFFFF;
  --admin-border: #E5E7EB;
  --admin-text: #111827;
  --admin-text-secondary: #6B7280;
  --admin-text-tertiary: #9CA3AF;
  --admin-success: #10B981;
  --admin-warning: #F59E0B;
  --admin-danger: #EF4444;
}

.light {
  --bg-primary: #FFFFFF;
  --bg-secondary: #F5F7FA;
  --bg-card: #FFFFFF;
  --bg-elevated: #EDF0F5;
  --text-primary: #1A1D24;
  --text-secondary: #5A6070;
  --text-tertiary: #8B91A0;
  --accent: #607EBC;
  --accent-dim: #D1E0D7;
  --border: #D8DCE4;
  --border-hover: #C0C6D2;
}

@theme inline {
  --color-bg-primary: var(--bg-primary);
  --color-bg-secondary: var(--bg-secondary);
  --color-bg-card: var(--bg-card);
  --color-bg-elevated: var(--bg-elevated);
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-tertiary: var(--text-tertiary);
  --color-accent: var(--accent);
  --color-accent-dim: var(--accent-dim);
  --color-border: var(--border);
  --color-border-hover: var(--border-hover);
  --color-admin-bg: var(--admin-bg);
  --color-admin-sidebar: var(--admin-sidebar);
  --color-admin-sidebar-hover: var(--admin-sidebar-hover);
  --color-admin-sidebar-active: var(--admin-sidebar-active);
  --color-admin-sidebar-text: var(--admin-sidebar-text);
  --color-admin-sidebar-text-active: var(--admin-sidebar-text-active);
  --color-admin-card: var(--admin-card);
  --color-admin-border: var(--admin-border);
  --color-admin-text: var(--admin-text);
  --color-admin-text-secondary: var(--admin-text-secondary);
  --color-admin-text-tertiary: var(--admin-text-tertiary);
  --color-admin-success: var(--admin-success);
  --color-admin-warning: var(--admin-warning);
  --color-admin-danger: var(--admin-danger);

  --font-sans: var(--font-inter);
  --font-display: var(--font-geist);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-sans);
}

@media (prefers-reduced-motion: no-preference) {
  body { transition: background-color 200ms ease, color 200ms ease; }
}
```

- [ ] **Step 3: Wire fonts and the theme bootstrap in `app/layout.tsx`**

The inline script must run before paint or the wrong theme flashes. It is `dangerouslySetInnerHTML` on purpose — a `<Script>` component would run too late.

```tsx
import type { Metadata } from 'next'
import { Inter, Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'Sudi David — Developer Portfolio',
  description: 'Full-stack engineer building real-time systems and developer tools.',
}

const themeScript = `
(function(){
  try {
    var stored = localStorage.getItem('theme');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    if (theme === 'light') document.documentElement.classList.add('light');
  } catch (e) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className={`${inter.variable} ${geist.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Extract the toggle's design**

```bash
node scripts/extract-frame.mjs IwfbA --depth 4 | grep -A3 "Theme Toggle"
```

Expected — implement exactly this:

```
frame "Theme Toggle"  padding=[6,8] gap=6 alignItems=center fill=$bg-card stroke=$border strokeWidth=1 cornerRadius=9999
  icon "Sun"   width=14 height=14 fill=$text-tertiary icon=sun  library=lucide
  icon "Moon"  width=14 height=14 fill=$accent      icon=moon library=lucide
```

**It is a segmented pill holding both icons at once**, not one icon that swaps. In the dark frames the moon carries `$accent` and the sun is dimmed to `$text-tertiary`; the light frames invert that. Do not collapse it to a single icon.

- [ ] **Step 5: Write `components/theme-toggle.tsx`**

`padding=[6,8]` is 6px vertical / 8px horizontal → `py-1.5 px-2`. `gap=6` → `gap-1.5`. `cornerRadius=9999` → `rounded-full`.

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const [isLight, setIsLight] = useState(false)

  useEffect(() => setIsLight(document.documentElement.classList.contains('light')), [])

  const toggle = () => {
    const next = !isLight
    document.documentElement.classList.toggle('light', next)
    localStorage.setItem('theme', next ? 'light' : 'dark')
    setIsLight(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle colour theme"
      aria-pressed={isLight}
      className="flex items-center gap-1.5 rounded-full border border-border bg-bg-card
                 px-2 py-1.5 transition-colors hover:border-border-hover
                 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <Sun size={14} className={isLight ? 'text-accent' : 'text-text-tertiary'} />
      <Moon size={14} className={isLight ? 'text-text-tertiary' : 'text-accent'} />
    </button>
  )
}
```

- [ ] **Step 6: Verify**

```bash
pnpm typecheck && pnpm dev
```

Open `http://localhost:3000`. Background must be `#0B0B11` on first paint with no white flash. Toggling must switch to `#FFFFFF` and survive a reload.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add design tokens, fonts, and theme switching"
```

---

### Task 3: Content types and loader

**Files:**
- Create: `lib/content.types.ts`, `lib/content.ts`, `lib/content.test.ts`

**Interfaces:**
- Consumes: Task 1 scaffold
- Produces:
  - `type Post = { slug, title, excerpt, date, readingTime, category, cover, featured, body }`
  - `type Project = { slug, title, year, description, tech: string[], category, cover, links: { github?, live? } }`
  - `getPosts(): Promise<Post[]>` — newest first
  - `getPost(slug: string): Promise<Post | null>`
  - `getProjects(): Promise<Project[]>` — newest year first
  - `getProject(slug: string): Promise<Project | null>`

- [ ] **Step 1: Write `lib/content.types.ts`**

```ts
export type Post = {
  slug: string
  title: string
  excerpt: string
  date: string          // ISO 8601, e.g. "2026-07-15"
  readingTime: string   // as displayed, e.g. "12 min read"
  category: string      // as displayed, e.g. "DEVELOPMENT"
  cover: string         // path under /public
  featured: boolean
  body: string          // raw MDX
}

export type Project = {
  slug: string
  title: string
  year: string
  description: string
  tech: string[]
  category: string      // "Web Apps" | "CLI Tools" | "Libraries" | "Open Source"
  cover: string
  links: { github?: string; live?: string }
  body: string
}
```

- [ ] **Step 2: Write the failing test `lib/content.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { getPosts, getPost, getProjects, getProject } from './content'

describe('getPosts', () => {
  it('returns every post in the content directory', async () => {
    expect((await getPosts()).length).toBe(7)
  })

  it('sorts newest first', async () => {
    const dates = (await getPosts()).map((p) => p.date)
    expect([...dates].sort().reverse()).toEqual(dates)
  })

  it('marks exactly one post as featured', async () => {
    expect((await getPosts()).filter((p) => p.featured)).toHaveLength(1)
  })

  it('parses frontmatter into every field', async () => {
    const post = (await getPosts()).find((p) => p.featured)!
    expect(post.title).toBe('Building a Real-Time Collaboration Engine from Scratch')
    expect(post.readingTime).toBe('12 min read')
    expect(post.body.length).toBeGreaterThan(0)
  })
})

describe('getPost', () => {
  it('resolves a known slug', async () => {
    const post = await getPost('building-a-real-time-collaboration-engine-from-scratch')
    expect(post?.featured).toBe(true)
  })

  it('returns null for an unknown slug', async () => {
    expect(await getPost('does-not-exist')).toBeNull()
  })

  it('returns null rather than escaping the content directory', async () => {
    expect(await getPost('../../package')).toBeNull()
  })
})

describe('getProjects', () => {
  it('returns every project', async () => {
    expect((await getProjects()).length).toBe(6)
  })

  it('sorts by year descending', async () => {
    const years = (await getProjects()).map((p) => p.year)
    expect([...years].sort().reverse()).toEqual(years)
  })

  it('parses tech as an array', async () => {
    const project = await getProject('nexus-cli')
    expect(project?.tech).toEqual(['Rust', 'CLI', 'WASM'])
  })
})
```

- [ ] **Step 3: Run it and confirm it fails**

```bash
pnpm test
```

Expected: FAIL — `Cannot find module './content'`.

- [ ] **Step 4: Write `lib/content.ts`**

Everything the pages need goes through these four functions. Keep them the only export surface — that is what makes the later database swap a one-file change.

```ts
import { readFile, readdir } from 'node:fs/promises'
import { join, basename } from 'node:path'
import matter from 'gray-matter'
import type { Post, Project } from './content.types'

const CONTENT = join(process.cwd(), 'content')

async function readCollection(dir: string) {
  const files = await readdir(join(CONTENT, dir))
  return Promise.all(
    files
      .filter((f) => f.endsWith('.mdx'))
      .map(async (file) => {
        const raw = await readFile(join(CONTENT, dir, file), 'utf8')
        const { data, content } = matter(raw)
        return { slug: basename(file, '.mdx'), data, body: content }
      }),
  )
}

export async function getPosts(): Promise<Post[]> {
  const entries = await readCollection('posts')
  return entries
    .map(({ slug, data, body }) => ({
      slug,
      title: data.title,
      excerpt: data.excerpt,
      date: data.date,
      readingTime: data.readingTime,
      category: data.category,
      cover: data.cover,
      featured: Boolean(data.featured),
      body,
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

export async function getPost(slug: string): Promise<Post | null> {
  return (await getPosts()).find((p) => p.slug === slug) ?? null
}

export async function getProjects(): Promise<Project[]> {
  const entries = await readCollection('projects')
  return entries
    .map(({ slug, data, body }) => ({
      slug,
      title: data.title,
      year: String(data.year),
      description: data.description,
      tech: data.tech ?? [],
      category: data.category,
      cover: data.cover,
      links: data.links ?? {},
      body,
    }))
    .sort((a, b) => b.year.localeCompare(a.year))
}

export async function getProject(slug: string): Promise<Project | null> {
  return (await getProjects()).find((p) => p.slug === slug) ?? null
}
```

Resolving by scanning the collection — rather than building a path from the slug — is what makes the traversal test pass: an unknown or malicious slug simply matches nothing.

- [ ] **Step 5: Run the tests**

```bash
pnpm test
```

Expected: still FAIL — the content files do not exist yet. That is Task 4. Confirm the failures are "no such file or directory" for `content/posts`, not type errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add content types and MDX loader"
```

---

### Task 4: Seed content

**Files:**
- Create: `content/posts/*.mdx` (7), `content/projects/*.mdx` (6)

**Interfaces:**
- Consumes: `Post`, `Project` from Task 3
- Produces: content that makes Task 3's tests pass

- [ ] **Step 1: Extract the real copy**

```bash
node scripts/extract-frame.mjs "Work Page" --depth 6      # 6 projects
node scripts/extract-frame.mjs "Blog Page" --depth 6      # 6 posts + featured
node scripts/extract-frame.mjs "Article Page" --depth 5   # featured post body
```

Every title, excerpt, date, reading time, description, and tech tag comes from this output verbatim.

- [ ] **Step 2: Write the six project files**

Slugs are the kebab-case title. Example — `content/projects/nexus-cli.mdx`:

```mdx
---
title: Nexus CLI
year: "2026"
description: A lightning-fast CLI tool for scaffolding full-stack apps. Supports React, Vue, and Svelte templates with built-in testing and CI configuration.
tech: [Rust, CLI, WASM]
category: CLI Tools
cover: /images/generated-1784965527781.png
links:
  github: https://github.com/sudidavid/nexus-cli
  live: https://nexus-cli.dev
---

Nexus CLI scaffolds production-ready full-stack applications in seconds.
```

Repeat for: Syncboard (2026, React/WebSocket/Yjs), Datapipe (2025, Go/Kafka/gRPC), Termsync (2025, Rust/CLI/SSH), Reacton (2024, TypeScript/React/NPM), Infrawatch (2024, Next.js/Docker/Grafana). Take each description verbatim from the extractor. Assign `category` from the Work page's five filters based on what the project is; `cover` from each card's resolved `fill=image(...)`.

- [ ] **Step 3: Write the featured post with its full body**

`content/posts/building-a-real-time-collaboration-engine-from-scratch.mdx`. The Article Page frame contains the complete body — intro paragraph, an H2, two paragraphs, a blockquote, a second H2, a paragraph, and a code block. Transcribe all of it as MDX.

```mdx
---
title: Building a Real-Time Collaboration Engine from Scratch
excerpt: A deep dive into CRDTs, operational transforms, and the architecture decisions behind building conflict-free real-time editing.
date: "2026-07-15"
readingTime: 12 min read
category: DEVELOPMENT
cover: /images/generated-1784965801717.png
featured: true
---

<!-- transcribed verbatim from Article Page → Article Body -->
```

- [ ] **Step 4: Write the six remaining posts**

Frontmatter verbatim from the Blog Page article list; `featured: false`. Bodies are two or three short paragraphs consistent with the excerpt — the design does not specify them.

Dates from the design: tRPC Jun 28 2026, Docker Jun 10 2026, Migrations May 22 2026, Server Components May 5 2026, CLI Tools Apr 18 2026, Event Sourcing Mar 30 2026. Convert each to ISO (`2026-06-28`) for the `date` field; the display string is derived at render time.

- [ ] **Step 5: Run the tests**

```bash
pnpm test
```

Expected: PASS — all of Task 3's tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add seed posts and projects from design content"
```

---

### Task 5: Primitive components

**Files:**
- Create: `components/logo-mark.tsx`, `components/tech-badge.tsx`

**Interfaces:**
- Consumes: tokens from Task 2
- Produces: `<LogoMark />`; `<TechBadge label="React" />`

- [ ] **Step 1: Extract both**

```bash
node scripts/extract-frame.mjs "Logo Mark"
node scripts/extract-frame.mjs "Tech Badge"
```

Expected output — these are the exact values to implement:

```
frame "Logo Mark"  width=80 height=33 fill=image(images/sudi-logo.png)
frame "Tech Badge"  padding=[6,12] alignItems=center fill=$accent-dim cornerRadius=9999
  text "Label"  fill=$accent fontFamily=Geist Mono fontSize=12 fontWeight=500  content="React"
```

- [ ] **Step 2: Write `components/logo-mark.tsx`**

```tsx
import Image from 'next/image'

export function LogoMark() {
  return (
    <Image src="/images/sudi-logo.png" alt="Sudi David" width={80} height={33} priority
      className="h-[33px] w-[80px] object-contain" />
  )
}
```

- [ ] **Step 3: Write `components/tech-badge.tsx`**

`cornerRadius=9999` is a pill; `padding=[6,12]` is 6px vertical, 12px horizontal.

```tsx
export function TechBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-accent-dim px-3 py-1.5
                     font-mono text-xs font-medium text-accent">
      {label}
    </span>
  )
}
```

- [ ] **Step 4: Verify**

```bash
pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add LogoMark and TechBadge components"
```

---

### Task 6: Card components

**Files:**
- Create: `components/project-card.tsx`, `components/work-project-card.tsx`, `components/article-item.tsx`, `components/featured-blog-card.tsx`

**Interfaces:**
- Consumes: `TechBadge` (Task 5); `Post`, `Project` (Task 3)
- Produces:
  - `<ProjectCard project={Project} />` — 340w homepage card
  - `<WorkProjectCard project={Project} />` — 480w work page card
  - `<ArticleItem post={Post} />` — 700w list row
  - `<FeaturedBlogCard post={Post} />` — 900×320 split card

- [ ] **Step 1: Extract all four**

```bash
for f in "Project Card" "Work Project Card" "Article Item" "Featured Blog Card"; do
  echo "=== $f"; node scripts/extract-frame.mjs "$f"
done
```

- [ ] **Step 2: Write `components/project-card.tsx`**

From the extractor: `width=340 padding=24 gap=16 fill=$bg-card stroke=$border strokeWidth=1 cornerRadius=8`; title Geist 18/600 `$text-primary`; description Inter 14/normal lh 1.5 `$text-secondary`; the header icon is lucide `arrow-up-right` at 18px `$text-tertiary`; tags gap 8.

```tsx
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { TechBadge } from './tech-badge'
import type { Project } from '@/lib/content.types'

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/work#${project.slug}`}
      className="group flex w-[340px] flex-col gap-4 rounded-lg border border-border
                 bg-bg-card p-6 transition-colors hover:border-border-hover">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-text-primary">{project.title}</h3>
        <ArrowUpRight size={18} className="text-text-tertiary" />
      </div>
      <p className="text-sm leading-[1.5] text-text-secondary">{project.description}</p>
      <div className="flex flex-wrap gap-2">
        {project.tech.slice(0, 2).map((t) => <TechBadge key={t} label={t} />)}
      </div>
    </Link>
  )
}
```

The homepage instances show two tags; the work card shows three. That is the design, not a truncation to invent.

- [ ] **Step 3: Write `components/work-project-card.tsx`**

From the extractor: `width=480 ... cornerRadius=8`, an `Image Area` of `height=200` filled `$bg-elevated` (overridden per instance with the project image), then `Card Body` `padding=24 gap=16`. Title Geist 20/700. Year Geist Mono 11/500 `$accent`. Description Inter 14 lh 1.6. Three tags. Then a `Links` row, gap 12, with two pill buttons — `padding=[8,14] gap=6 stroke=$border cornerRadius=6`, label Inter 12/500 `$text-secondary`, icons 14px: "Source" (lucide `github`) and "Live Demo" (lucide `external-link`).

Render the links row only for the links present in frontmatter.

- [ ] **Step 4: Write `components/article-item.tsx`**

From the extractor: `width=700 padding=[20,0] gap=8 strokeWidth={"bottom":1} stroke=$border` — a bottom border only, no side or top borders. Title Geist 17/600 `$text-primary`. Excerpt Inter 14 lh 1.5 `$text-secondary`. Meta row `gap=16`: date, a `·` middot, and read time, all Geist Mono 12 `$text-tertiary`.

The middot is a separate text node in the design — render it as its own element, not as a CSS separator.

- [ ] **Step 5: Write `components/featured-blog-card.tsx`**

From the extractor: `width=900 height=320` row — `Image` pane `width=380` full height, `Body` `padding=32 gap=16 justifyContent=center`. Category pill `padding=[4,10] fill=$accent-dim cornerRadius=9999`, label Geist Mono 11/600 `$accent`. Title Geist 24/700 lh 1.3. Excerpt Inter 14 lh 1.5. Meta identical to `ArticleItem`.

- [ ] **Step 6: Verify**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add project, article, and featured card components"
```

---

### Task 7: Site header and footer

**Files:**
- Create: `components/site-header.tsx`, `components/site-footer.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `LogoMark` (Task 5), `ThemeToggle` (Task 2)
- Produces: `<SiteHeader />`, `<SiteFooter />` — no props, used by all five pages

- [ ] **Step 1: Extract both**

```bash
node scripts/extract-frame.mjs IwfbA --depth 4 | sed -n '/"Header"/,/"Hero"/p'
node scripts/extract-frame.mjs IwfbA --depth 4 | sed -n '/"Footer"/,$p'
```

Expected header output — implement exactly this:

```
frame "Header"  padding=[16,48] alignItems=center justifyContent=space_between stroke=$border strokeWidth={"bottom":1}
  frame "Logo"  width=80 height=33 fill=image(images/sudi-logo.png)
  frame "Header Right"  gap=32 alignItems=center
    text "Work"   fill=$text-secondary fontFamily=Inter fontSize=14 fontWeight=500
    text "Blog"   fill=$text-secondary fontFamily=Inter fontSize=14 fontWeight=500
    text "About"  fill=$text-secondary fontFamily=Inter fontSize=14 fontWeight=500
    icon "Search"  width=18 height=18 fill=$text-secondary icon=search library=lucide
    frame "Theme Toggle"  …
```

`strokeWidth={"bottom":1}` is a bottom border only. Nav links are Inter 14/**500** — `text-sm font-medium text-text-secondary`.

Footer: `padding=[32,48] alignItems=center justifyContent=space_between stroke=$border`, copyright `© 2026 sudi.dev — Built with caffeine & curiosity` in `$text-tertiary`, right group `gap=24` with RSS / Privacy / Source links and github, twitter, linkedin icons.

- [ ] **Step 2: Write `components/site-header.tsx`**

The border is a bottom border. Nav collapses below `md` per the responsive rules — that mobile menu is one of the two areas where judgment is allowed.

```tsx
import Link from 'next/link'
import { Search } from 'lucide-react'
import { LogoMark } from './logo-mark'
import { ThemeToggle } from './theme-toggle'

const NAV = [
  { href: '/work', label: 'Work' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
]

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-4 md:px-6 lg:px-12">
        <Link href="/" aria-label="Home"><LogoMark /></Link>
        <nav className="flex items-center gap-8">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}
              className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary">
              {item.label}
            </Link>
          ))}
          <Link href="/blog?focus=search" aria-label="Search articles"
            className="text-text-secondary transition-colors hover:text-text-primary">
            <Search size={18} />
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Write `components/site-footer.tsx`**

Copyright text verbatim, including the em dash and ampersand.

- [ ] **Step 4: Verify**

```bash
pnpm dev
```

Header and footer must match the design at 1440px: 48px gutters, 16px vertical padding on the header, 32px on the footer.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add site header and footer"
```

---

### Task 8: Homepage

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `SiteHeader`, `SiteFooter`, `ProjectCard`, `ArticleItem`, `TechBadge`, `getPosts`, `getProjects`
- Produces: `/`

- [ ] **Step 1: Extract the full frame**

```bash
node scripts/extract-frame.mjs "Portfolio Homepage" --depth 6
```

- [ ] **Step 2: Build the Hero**

`padding=[80,48,64,48] gap=24`. In order: a `Terminal Line` (`gap=8`, `~$` prompt and `whoami` command, Geist Mono), the greeting `Hi, I'm Sudi David`, the role `Full-Stack Developer & Open Source Enthusiast`, a `Hero Actions` row (`gap=16`) with a primary "View My Work" button carrying a lucide `arrow-right` and a secondary "Read Blog" button, then **two** `Code Snippet` frames.

Both snippets render. They are identical five-line blocks — `padding=[16,20] gap=6 cornerRadius=8 fill=$bg-card stroke=$border` — containing `const dev = {`, `  name: "Sudi",`, `  loves: "clean code",`, `  coffee: true,`, `};`. Preserve the leading spaces.

- [ ] **Step 3: Build the Content Area**

`padding=[0,48] gap=48`, a row of `Sidebar` (`width=260 padding=[32,32,32,0] gap=28`, right border) and `Main Content` (`fill_container padding=[32,0,48,0] gap=48`).

Sidebar: avatar, the status indicator (6px dot plus `Available for work` — inline markup, **not** the `StatusBadge` component), bio, a `TECH STACK` label with three rows of `TechBadge`, and a socials row.

Main Content: a `Featured Projects` section (header plus a grid of three `ProjectCard`) and a `Latest Articles` section (header plus four `ArticleItem`).

- [ ] **Step 4: Wire real data**

```tsx
const [posts, projects] = await Promise.all([getPosts(), getProjects()])
const featuredProjects = projects.slice(0, 3)
const latestPosts = posts.slice(0, 4)
```

- [ ] **Step 5: Verify against the design**

```bash
pnpm dev
```

At 1440px compare every section against `node scripts/extract-frame.mjs "Portfolio Homepage" --depth 6`. Check both themes.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add homepage"
```

---

### Task 9: Work page and filtering

**Files:**
- Create: `lib/filters.ts`, `lib/filters.test.ts`, `components/filter-bar.tsx`
- Modify: `app/work/page.tsx`

**Interfaces:**
- Consumes: `WorkProjectCard`, `getProjects`
- Produces: `filterProjects(projects, category)`; `<FilterBar options={string[]} active={string} />`; `/work`

- [ ] **Step 1: Write the failing test `lib/filters.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { filterProjects, searchPosts } from './filters'

const projects = [
  { slug: 'a', category: 'CLI Tools', title: 'Nexus CLI' },
  { slug: 'b', category: 'Web Apps', title: 'Syncboard' },
] as never[]

describe('filterProjects', () => {
  it('returns everything for All', () => {
    expect(filterProjects(projects, 'All')).toHaveLength(2)
  })

  it('filters to a single category', () => {
    expect(filterProjects(projects, 'Web Apps').map((p) => p.slug)).toEqual(['b'])
  })

  it('returns nothing for an unknown category', () => {
    expect(filterProjects(projects, 'Nope')).toHaveLength(0)
  })
})

const posts = [
  { slug: 'a', title: 'Why I Switched from REST to tRPC', excerpt: 'Type-safe APIs', category: 'ENGINEERING' },
  { slug: 'b', title: 'Event Sourcing in Practice', excerpt: 'Lessons learned', category: 'ARCHITECTURE' },
] as never[]

describe('searchPosts', () => {
  it('returns everything for an empty query', () => {
    expect(searchPosts(posts, '')).toHaveLength(2)
  })

  it('matches the title case-insensitively', () => {
    expect(searchPosts(posts, 'trpc').map((p) => p.slug)).toEqual(['a'])
  })

  it('matches the excerpt', () => {
    expect(searchPosts(posts, 'lessons').map((p) => p.slug)).toEqual(['b'])
  })

  it('ignores surrounding whitespace', () => {
    expect(searchPosts(posts, '  trpc  ').map((p) => p.slug)).toEqual(['a'])
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
pnpm test
```

Expected: FAIL — `Cannot find module './filters'`.

- [ ] **Step 3: Write `lib/filters.ts`**

```ts
import type { Post, Project } from './content.types'

export function filterProjects(projects: Project[], category: string): Project[] {
  if (category === 'All') return projects
  return projects.filter((p) => p.category === category)
}

export function searchPosts(posts: Post[], query: string): Post[] {
  const q = query.trim().toLowerCase()
  if (!q) return posts
  return posts.filter((p) =>
    p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q))
}

export function filterPostsByCategory(posts: Post[], category: string): Post[] {
  if (category === 'All') return posts
  return posts.filter((p) => p.category === category)
}
```

- [ ] **Step 4: Run the tests**

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 5: Extract the page and filter row**

```bash
node scripts/extract-frame.mjs "Work Page" --depth 6
```

The filters are All, Web Apps, CLI Tools, Libraries, Open Source. Take the pill padding, radius, active/inactive fills and text colours from the extractor.

- [ ] **Step 6: Write `components/filter-bar.tsx`**

A client component. Reads and writes the `category` search param with `useRouter` and `useSearchParams` so the filtered view is shareable. Mark up as `role="radiogroup"` with each pill `role="radio"` and `aria-checked`.

- [ ] **Step 7: Write `app/work/page.tsx`**

`Page Intro` (breadcrumb, title, subtitle, stats), the filter row, then `Projects Section` — three rows of two `WorkProjectCard`, which becomes a two-column grid.

Read `searchParams.category` on the server, pass the filtered list down.

- [ ] **Step 8: Verify**

```bash
pnpm test && pnpm dev
```

Filtering must update the URL, survive a reload, and match the design at 1440px.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add work page with category filtering"
```

---

### Task 10: Blog page

**Files:**
- Create: `components/blog-search.tsx`
- Modify: `app/blog/page.tsx`

**Interfaces:**
- Consumes: `FeaturedBlogCard`, `ArticleItem`, `searchPosts`, `filterPostsByCategory`, `getPosts`
- Produces: `/blog`

- [ ] **Step 1: Extract**

```bash
node scripts/extract-frame.mjs "Blog Page" --depth 6
```

- [ ] **Step 2: Build the page**

Sections in order: `Page Intro`; `Search & Filters` (search box plus category pills); `Featured Section` (a `PINNED` label above one `FeaturedBlogCard`); `Blog Content` — a row of `Article List` and `Blog Sidebar`; then the footer.

The sidebar contains, verbatim: a "Stay Updated" card ("Get notified when I publish new articles. No spam, unsubscribe anytime.", an email input placeholdered `your@email.com`, a Subscribe button), a `TOPICS` list, and a `THIS BLOG` stats block (Articles 24, Avg. Read 7 min, Total Views 48.2K).

The subscribe form is presentational — render it exactly, wire it to nothing.

- [ ] **Step 3: Write `components/blog-search.tsx`**

Client component, syncs a `q` search param, debounced ~150ms. Honour `?focus=search` from the header's search icon by focusing the input on mount.

- [ ] **Step 4: Verify**

```bash
pnpm dev
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add blog index with search and category filters"
```

---

### Task 11: Article page

**Files:**
- Modify: `app/blog/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getPost`, `getPosts`, `ArticleItem`
- Produces: `/blog/[slug]` with `generateStaticParams` and `generateMetadata`

- [ ] **Step 1: Extract**

```bash
node scripts/extract-frame.mjs "Article Page" --depth 6
```

- [ ] **Step 2: Build the page**

Sections: `Article Header` (breadcrumb, category, title, subtitle, author row); `Cover Wrap`; `Article Body`; `Comment Section`; `Related Articles Section`; footer.

Render the MDX body with `next-mdx-remote/rsc`, supplying components that match the design's typography for `h2`, `p`, `blockquote`, and `pre`/`code` — take each size, weight, colour, and spacing from the extractor rather than styling by feel.

- [ ] **Step 3: Add static generation and metadata**

```tsx
export async function generateStaticParams() {
  return (await getPosts()).map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug)
  if (!post) return {}
  return { title: `${post.title} | Sudi David`, description: post.excerpt }
}
```

Call `notFound()` when `getPost` returns null.

- [ ] **Step 4: Build the comment section**

Render the designed thread and the reply box exactly. Presentational only — no submission.

- [ ] **Step 5: Verify**

```bash
pnpm build
```

All seven post routes must prerender.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add article page with MDX rendering"
```

---

### Task 12: About page

**Files:**
- Modify: `app/about/page.tsx`

**Interfaces:**
- Consumes: `SiteHeader`, `SiteFooter`, `TechBadge`
- Produces: `/about`

- [ ] **Step 1: Extract**

```bash
node scripts/extract-frame.mjs "About Page" --depth 6
```

- [ ] **Step 2: Build the sections in order**

`Page Intro`; `Hero Section` (portrait plus intro text); a divider; `Experience Section` (label, title, timeline); a divider; `Skills Section` (label, title, skills grid); a divider; `Beyond Code` (two columns); `Connect Section` (label, title, description, actions, social row); footer.

All three dividers are separate `Divider Wrap` frames in the design — render all three.

Every string comes from the extractor.

- [ ] **Step 3: Verify**

```bash
pnpm dev
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add about page"
```

---

### Task 13: Feed, sitemap, and robots

**Files:**
- Create: `app/rss.xml/route.ts`, `app/sitemap.ts`, `app/robots.ts`

**Interfaces:**
- Consumes: `getPosts`
- Produces: `/rss.xml`, `/sitemap.xml`, `/robots.txt`

- [ ] **Step 1: Write `app/rss.xml/route.ts`**

```ts
import { getPosts } from '@/lib/content'

const SITE = 'https://sudi.dev'

export async function GET() {
  const posts = await getPosts()
  const items = posts.map((post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${SITE}/blog/${post.slug}</link>
      <guid isPermaLink="true">${SITE}/blog/${post.slug}</guid>
      <description><![CDATA[${post.excerpt}]]></description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    </item>`).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Sudi David</title>
  <link>${SITE}</link>
  <description>Full-stack engineer building real-time systems and developer tools.</description>
  ${items}
</channel></rss>`

  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } })
}
```

- [ ] **Step 2: Write `app/sitemap.ts` and `app/robots.ts`**

Sitemap lists `/`, `/work`, `/blog`, `/about`, and every post URL. Robots allows all and points at the sitemap.

- [ ] **Step 3: Verify**

```bash
pnpm build && pnpm start
```

Fetch all three and confirm they are well-formed.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add RSS feed, sitemap, and robots"
```

---

### Task 14: Responsive and accessibility pass

**Files:**
- Modify: every page and component

**Interfaces:**
- Consumes: Tasks 5–13
- Produces: the public site verified at 1440 / 1024 / 768 / 375 in both themes

- [ ] **Step 1: Apply the derived breakpoints**

Gutters 48 → 24 (`md`) → 16 (`sm`). Homepage sidebar above main content below `lg`. Blog sidebar below the list at `lg`. Project grids 3 → 2 (`lg`) → 1 (`md`). Header nav to a mobile menu below `md`. Article prose capped at ~72ch.

- [ ] **Step 2: Confirm 1440px is untouched**

Re-check each page against its extractor dump. The responsive work must not have shifted any desktop value.

- [ ] **Step 3: Accessibility sweep**

Landmarks (`header`, `nav`, `main`, `article`, `footer`); no skipped heading levels; the toggle labelled with `aria-pressed`; filters as a `radiogroup`; every input with a real `<label>`; a visible focus ring everywhere.

- [ ] **Step 4: Check contrast and record failures**

Verify `text-tertiary` on `bg-primary` and on `bg-card` in both themes against WCAG AA. **Keep the design value if it fails** — record it in `docs/delivery-notes.md` instead of changing the palette.

- [ ] **Step 5: Verify**

```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm build
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add responsive breakpoints and accessibility improvements"
```

**Phase 1 ships here. Stop for review before Phase 2.**

---

# Phase 2 — Admin CMS

Static UI over fixtures. No auth, no database, no persistence. Light-only — the admin has no dark frames and none is invented.

### Task 15: Admin shell and fixtures

**Files:**
- Create: `lib/admin-fixtures.ts`, `components/admin/admin-sidebar.tsx`, `components/admin/admin-nav-item.tsx`, `components/admin/stat-card.tsx`, `components/admin/status-badge.tsx`, `app/admin/layout.tsx`

**Interfaces:**
- Consumes: `admin-*` tokens (Task 2)
- Produces:
  - `<AdminSidebar active={string} />`, `<AdminNavItem href label icon active />`
  - `<StatCard label value trend period icon />`
  - `<StatusBadge status="Published" | "Draft" | "Archived" />`
  - `adminPosts`, `adminProjects`, `adminComments`, `adminStats` fixtures

- [ ] **Step 1: Extract the shell components**

```bash
node scripts/extract-frame.mjs "Admin Nav Item"
node scripts/extract-frame.mjs "Stat Card"
node scripts/extract-frame.mjs "Status Badge"
node scripts/extract-frame.mjs "Admin — Dashboard" --depth 4
```

Expected for the three components — implement exactly these:

```
frame "Admin Nav Item"  width=220 padding=[10,16] gap=12 alignItems=center cornerRadius=8
  icon "Nav Icon"  width=20 height=20 fill=$admin-sidebar-text
  text "Nav Label"  fill=$admin-sidebar-text fontFamily=Inter fontSize=14 fontWeight=normal

frame "Stat Card"  width=280 padding=24 gap=12 fill=$admin-card stroke=$admin-border strokeWidth=1 cornerRadius=12
  frame "Stat Header"  width=fill_container alignItems=center justifyContent=space_between
    text "Stat Label"  fill=$admin-text-secondary fontFamily=Inter fontSize=13
    icon "Stat Icon"  width=18 height=18 fill=$admin-text-tertiary
  text "Stat Value"  fill=$admin-text fontFamily=Geist fontSize=32 fontWeight=700
  frame "Stat Footer"  gap=6 alignItems=center
    text "Stat Trend"  fill=$admin-success fontFamily=Inter fontSize=12 fontWeight=600
    text "Stat Period"  fill=$admin-text-tertiary fontFamily=Inter fontSize=12

frame "Status Badge"  padding=[4,10] gap=6 alignItems=center fill=#10B98115 cornerRadius=12
  ellipse "Status Dot"  width=6 height=6 fill=$admin-success
  text "Status Text"  fill=$admin-success fontFamily=Inter fontSize=12 fontWeight=500
```

`StatusBadge` fill `#10B98115` is a literal in the design, not a token — keep it literal for the published state, and derive the draft and archived variants from `admin-warning` and `admin-text-tertiary` at the same alpha.

- [ ] **Step 2: Write `lib/admin-fixtures.ts`**

Transcribe the admin screens' own data. **Do not reuse the public MDX content** — the admin's sample data deliberately differs (see the spec).

Projects: CollabSync, TypeForge, QueryBench, DevPulse, StackDeploy, MemoGraph. Posts include "Optimizing React Renders at Scale" and "Type-Safe API Layers with tRPC". Counters: 18 posts (14 published, 3 drafts, 1 archived), 142 comments (6 pending, 128 approved, 8 spam).

- [ ] **Step 3: Write the components and `app/admin/layout.tsx`**

The sidebar is identical across five of the seven frames, so it lives in the layout. Nav items are Dashboard, Posts, Projects, Comments, Settings — lucide icons `layout-dashboard`, `file-text`, `folder-kanban`, `message-square`, `settings`.

The layout sets `bg-admin-bg` and does **not** react to the theme toggle.

- [ ] **Step 4: Verify**

```bash
pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add admin shell, fixtures, and shared components"
```

---

### Tasks 16–22: Admin screens

Each follows the same shape. For screen `X`:

1. `node scripts/extract-frame.mjs "Admin — X" --depth 6`
2. Build the route from that output — every value from the dump, every string verbatim
3. `pnpm typecheck && pnpm dev`, compare against the frame at 1440×900
4. `git commit -m "feat: add admin X screen"`

| Task | Screen | Route | Notes |
| --- | --- | --- | --- |
| 16 | Dashboard | `/admin` | Top bar with search, a `StatCard` row, then Recent Activity (6 entries) and Quick Actions (4 tiles) |
| 17 | Posts | `/admin/posts` | Filter row with counts, then a table: TITLE / STATUS / DATE / VIEWS / COMMENTS. Real `<table>` with `<th scope>`; horizontal scroll below `lg` |
| 18 | Post Editor | `/admin/posts/[id]/edit` | No sidebar — its own top bar plus a two-pane body. Formatting toolbar (lucide `bold`, `italic`, `underline`, `heading-1/2/3`, `pilcrow`, `list`, `link`, `code-xml`), cover dropzone, and a settings sidebar (status, category, tags, publish date, URL slug, SEO) |
| 19 | Projects | `/admin/projects` | Card grid, six fixtures, each with view count and a `StatusBadge` |
| 20 | Add Project | `/admin/projects/new` | Form: name, description, year, status, tech stack with tag input, and three link fields. Placeholders verbatim (`e.g. CollabSync`, `https://myproject.dev`, …) |
| 21 | Comments | `/admin/comments` | Filter row (All 142 / Pending 6 / Approved 128 / Spam 8) and a comment list with Approve / Reject / Reply actions |
| 22 | Settings | `/admin/settings` | Profile, Social Links, SEO & Metadata, and Session cards. All values verbatim (`sudi@sudidavid.dev`, `San Francisco, CA`, …). Log Out is presentational |

After Task 22:

```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm build
```

All nineteen routes must build. Commit as `feat: complete admin CMS screens`.

---

## Self-Review

**Spec coverage.** Every spec section maps to a task: exact-replication principle → Global Constraints and each task's extract step; tokens → Task 2; typography → Task 2; theming → Task 2; content layer → Tasks 3–4; the nine components → Tasks 5, 6, 15; five public routes → Tasks 8–12; three undesigned routes → Task 13; responsive and accessibility → Task 14; contrast-failure recording → Task 14 Step 4; admin fixtures kept separate → Task 15 Step 2; seven admin routes → Tasks 16–22.

**Type consistency.** `Post` and `Project` are defined once in Task 3 and consumed unchanged by Tasks 4, 6, 8, 9, 10, 11. `getPosts`/`getPost`/`getProjects`/`getProject` keep the same signatures throughout. `filterProjects`/`searchPosts`/`filterPostsByCategory` are defined in Task 9 and reused in Task 10.

**Known gaps, deliberate.** Tasks 16–22 are tabulated rather than expanded step-by-step because they are mechanically identical: extract, build from the dump, verify, commit. The per-screen detail lives in the design file, which the Global Constraints make authoritative. Expanding them would duplicate the extractor's output into the plan and risk the two drifting apart.
