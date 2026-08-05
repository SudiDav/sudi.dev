import 'server-only'
import matter from 'gray-matter'
import type { Post } from './content.types'

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
    .map(([key, value]) => {
      if (Array.isArray(value)) return `${key}: [${value.join(', ')}]`
      if (typeof value === 'object') {
        const nested = Object.entries(value as Record<string, unknown>)
          .map(([k, v]) => `  ${k}: ${v}`)
          .join('\n')
        return `${key}:\n${nested}`
      }
      if (QUOTED.has(key)) return `${key}: "${value}"`
      return `${key}: ${value}`
    })
  return `---\n${lines.join('\n')}\n---\n\n${body.trim()}\n`
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

/** True when publishing is configured, so the UI can say so instead of failing. */
export function isPublishingConfigured(): boolean {
  return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO)
}
