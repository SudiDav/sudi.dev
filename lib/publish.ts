import 'server-only'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import matter from 'gray-matter'
import type { Post, Project } from './content.types'
import type { SiteSettings } from './site'

/**
 * Git-backed publishing.
 *
 * Editing in the admin commits MDX back to the repository through the GitHub
 * Contents API, which triggers a redeploy. That keeps the repo as the single
 * source of truth — the same files `lib/content.ts` reads — so nothing has to
 * be migrated out of git, every change is versioned, and the site stays
 * statically generated.
 *
 * The trade is latency: a published change is live once the deploy finishes,
 * not instantly.
 */
const API = 'https://api.github.com'

const NOT_CONFIGURED =
  'Publishing is not configured. Set GITHUB_TOKEN and GITHUB_REPO — see .env.example.'

type GitHubConfig = { token: string; repo: string; branch: string }

function config(): GitHubConfig {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO
  const branch = process.env.GITHUB_BRANCH ?? 'main'
  if (!token || !repo) {
    throw new Error(
      'Publishing is not configured. Set GITHUB_TOKEN and GITHUB_REPO in .env.local — see .env.example.',
    )
  }
  return { token, repo, branch }
}

async function gh(path: string, init: RequestInit = {}) {
  const { token } = config()
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...init.headers,
    },
    cache: 'no-store',
  })
  return response
}

/** The blob SHA GitHub needs to update (rather than create) a file. */
async function currentSha(path: string): Promise<string | undefined> {
  const { repo, branch } = config()
  const response = await gh(`/repos/${repo}/contents/${encodeURI(path)}?ref=${branch}`)
  if (response.status === 404) return undefined
  if (!response.ok) throw new Error(`GitHub read failed (${response.status}) for ${path}`)
  const body = (await response.json()) as { sha: string }
  return body.sha
}

async function commitFile(path: string, contents: string, message: string) {
  const { repo, branch } = config()
  const sha = await currentSha(path)

  const response = await gh(`/repos/${repo}/contents/${encodeURI(path)}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: Buffer.from(contents, 'utf8').toString('base64'),
      branch,
      // Omitting sha creates; including it updates. Sending a stale sha makes
      // GitHub reject the write rather than silently clobbering a newer commit.
      ...(sha ? { sha } : {}),
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`GitHub write failed (${response.status}): ${detail.slice(0, 200)}`)
  }
}

/** Frontmatter keys that must round-trip as quoted strings, not YAML scalars. */
const QUOTED = new Set(['date', 'year'])

function serialise(data: Record<string, unknown>, body: string): string {
  // gray-matter's stringify would unquote dates into YAML timestamps, which the
  // loader's string sort depends on NOT happening.
  const lines = Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]): string | null => {
      if (Array.isArray(value)) return `${key}: [${value.join(', ')}]`
      if (typeof value === 'object') {
        const nested = Object.entries(value as Record<string, unknown>)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => `  ${k}: ${v}`)
        // An object whose every field is empty would emit a dangling key.
        if (nested.length === 0) return null
        return `${key}:\n${nested.join('\n')}`
      }
      if (QUOTED.has(key)) return `${key}: "${value}"`
      return `${key}: ${value}`
    })
  return `---\n${lines.filter(Boolean).join('\n')}\n---\n\n${body.trim()}\n`
}

export type PostDraft = Partial<Omit<Post, 'slug' | 'body'>> & { body?: string }

/**
 * Merge changes into an existing post and commit it.
 *
 * Reads the current file from GitHub rather than the local filesystem so the
 * write is based on what is actually in the repo — the local checkout may be
 * behind, and on a deployed instance there is no checkout at all.
 */
export async function savePost(slug: string, changes: PostDraft, message: string) {
  const target = publishTarget()
  if (target === 'disabled') {
    throw new Error(NOT_CONFIGURED)
  }
  if (target === 'local') return saveLocally(slug, changes)

  const { repo, branch } = config()
  const path = `content/posts/${slug}.mdx`

  const response = await gh(`/repos/${repo}/contents/${encodeURI(path)}?ref=${branch}`)
  if (!response.ok) throw new Error(`Cannot read ${path} (${response.status})`)
  const file = (await response.json()) as { content: string }
  const existing = matter(Buffer.from(file.content, 'base64').toString('utf8'))

  const { body, ...frontmatterChanges } = changes
  const merged = { ...existing.data, ...frontmatterChanges }

  await commitFile(path, serialise(merged, body ?? existing.content), message)
}

/**
 * Where a save goes.
 *
 * With a GitHub token configured, writes are commits — the only option that
 * works on a deployed instance, whose filesystem is read-only and ephemeral.
 * Without one, and only in development, writes go straight to the working copy
 * so the admin is genuinely usable before any tokens exist. In production with
 * no token, saving is refused rather than silently discarded.
 */
export type PublishTarget = 'github' | 'local' | 'disabled'

export function publishTarget(): PublishTarget {
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) return 'github'
  return process.env.NODE_ENV === 'production' ? 'disabled' : 'local'
}

async function saveLocally(slug: string, changes: PostDraft) {
  const path = join(process.cwd(), 'content', 'posts', `${slug}.mdx`)
  const existing = matter(await readFile(path, 'utf8'))
  const { body, ...frontmatterChanges } = changes
  await writeFile(
    path,
    serialise({ ...existing.data, ...frontmatterChanges }, body ?? existing.content),
    'utf8',
  )
}

export type ProjectDraft = Omit<Project, 'slug' | 'body'> & { body?: string }

/** Turns a project name into a filename-safe slug. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Create a project. Refuses to overwrite: a name that collides with an existing
 * project is an error rather than a silent replacement of someone's work.
 */
export async function createProject(slug: string, draft: ProjectDraft, message: string) {
  const target = publishTarget()
  if (target === 'disabled') {
    throw new Error(NOT_CONFIGURED)
  }

  const path = `content/projects/${slug}.mdx`
  const { body, ...frontmatter } = draft
  const contents = serialise(
    frontmatter as unknown as Record<string, unknown>,
    body ?? `${draft.description}`,
  )

  if (target === 'local') {
    const absolute = join(process.cwd(), path)
    if (await exists(absolute)) throw new Error(`A project called "${slug}" already exists.`)
    await writeFile(absolute, contents, 'utf8')
    return
  }

  if (await currentSha(path)) throw new Error(`A project called "${slug}" already exists.`)
  await commitFile(path, contents, message)
}

async function exists(path: string): Promise<boolean> {
  try {
    await readFile(path, 'utf8')
    return true
  } catch {
    return false
  }
}

/**
 * Update an existing project. Unlike `createProject` this requires the file to
 * exist — a missing slug means the caller is editing something that was renamed
 * or deleted, which should surface rather than quietly create a new project.
 */
export async function saveProject(slug: string, changes: ProjectDraft, message: string) {
  const target = publishTarget()
  if (target === 'disabled') throw new Error(NOT_CONFIGURED)

  const path = `content/projects/${slug}.mdx`
  const { body, ...frontmatter } = changes

  if (target === 'local') {
    const absolute = join(process.cwd(), path)
    const existing = matter(await readFile(absolute, 'utf8'))
    await writeFile(
      absolute,
      serialise(
        { ...existing.data, ...(frontmatter as Record<string, unknown>) },
        body ?? existing.content,
      ),
      'utf8',
    )
    return
  }

  const { repo, branch } = config()
  const response = await gh(`/repos/${repo}/contents/${encodeURI(path)}?ref=${branch}`)
  if (!response.ok) throw new Error(`Cannot read ${path} (${response.status})`)
  const file = (await response.json()) as { content: string }
  const existing = matter(Buffer.from(file.content, 'base64').toString('utf8'))

  await commitFile(
    path,
    serialise(
      { ...existing.data, ...(frontmatter as Record<string, unknown>) },
      body ?? existing.content,
    ),
    message,
  )
}

/** Write any JSON file in the repo through the configured target. */
export async function writeJson(path: string, data: unknown, message: string) {
  const target = publishTarget()
  if (target === 'disabled') throw new Error(NOT_CONFIGURED)

  const contents = `${JSON.stringify(data, null, 2)}\n`
  if (target === 'local') {
    await writeFile(join(process.cwd(), path), contents, 'utf8')
    return
  }
  await commitFile(path, contents, message)
}

/** Site settings live in content/site.json, written the same way as content. */
export async function saveSettings(settings: SiteSettings, message: string) {
  const target = publishTarget()
  if (target === 'disabled') throw new Error(NOT_CONFIGURED)

  const path = 'content/site.json'
  const contents = `${JSON.stringify(settings, null, 2)}\n`

  if (target === 'local') {
    await writeFile(join(process.cwd(), path), contents, 'utf8')
    return
  }
  await commitFile(path, contents, message)
}

/** True when saving will actually persist somewhere. */
export function isPublishingConfigured(): boolean {
  return publishTarget() !== 'disabled'
}
