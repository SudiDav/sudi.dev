import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { open, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import matter from 'gray-matter'
import type { Post, Project } from './content.types'
import { getPosts } from './content'
import { DEFAULT_SETTINGS, mergeSiteSettings } from './site'
import type { SiteSettings, SiteSettingsInput } from './site'
import { validateArticleBody } from './article-safety'

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
      'User-Agent': 'sudi.dev',
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
  const response = await gh(`/repos/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`)
  if (response.status === 404) return undefined
  if (!response.ok) throw new Error(`GitHub read failed (${response.status}) for ${path}`)
  const body = (await response.json()) as { sha: string }
  return body.sha
}

export type PublishTarget = 'github' | 'local' | 'disabled'

export type PublishResult = {
  target: Exclude<PublishTarget, 'disabled'>
  branch?: string
  sha?: string
  commitUrl?: string
  previousStatus?: Post['status']
  status?: Post['status']
  post?: Post
  /** Digest of the saved source bytes, distinct from the deployment commit SHA. */
  postVersion?: string
  /** Digest of the saved project or settings source bytes. */
  contentVersion?: string
}

export type PostSaveErrorCode = 'post_conflict' | 'post_review_required' | 'post_unsaved_changes'

export class PostSaveError extends Error {
  constructor(public readonly code: PostSaveErrorCode, message: string) {
    super(message)
    this.name = 'PostSaveError'
  }
}

function sourceVersion(raw: Buffer | string): string {
  return createHash('sha256').update(raw).digest('hex')
}

function postConflict(): PostSaveError {
  return new PostSaveError('post_conflict', 'This post changed after you opened it. Reload the saved post and review it before continuing.')
}

function normaliseStatus(value: unknown): Post['status'] {
  return value === 'Draft' || value === 'Archived' ? value : 'Published'
}

export class PostAlreadyExistsError extends Error {
  constructor(public readonly slug: string) {
    super(`A post with the slug "${slug}" already exists.`)
    this.name = 'PostAlreadyExistsError'
  }
}

class GitHubWriteError extends Error {
  constructor(public readonly status: number, detail: string) {
    super(`GitHub write failed (${status}): ${detail.slice(0, 200)}`)
    this.name = 'GitHubWriteError'
  }
}

function assertPostSlug(slug: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(slug)) {
    throw new Error('Invalid post slug: expected a single filename-safe basename.')
  }
}

function assertProjectSlug(slug: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(slug)) {
    throw new Error('Invalid project slug: expected a single filename-safe basename.')
  }
}

async function commitFile(
  path: string,
  contents: string | Buffer,
  message: string,
): Promise<Pick<PublishResult, 'sha' | 'commitUrl'>> {
  const sha = await currentSha(path)
  return writeGitHubFile(path, contents, message, sha)
}

/** A missing SHA always means create-only; GitHub rejects an existing file. */
async function writeGitHubFile(
  path: string,
  contents: string | Buffer,
  message: string,
  sha?: string,
): Promise<Pick<PublishResult, 'sha' | 'commitUrl'>> {
  const { repo, branch } = config()
  const response = await gh(`/repos/${repo}/contents/${encodeURI(path)}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      // Text arrives as a string, images as a Buffer; both go up base64.
      content: Buffer.isBuffer(contents)
        ? contents.toString('base64')
        : Buffer.from(contents, 'utf8').toString('base64'),
      branch,
      // Omitting sha creates; including it updates. Sending a stale sha makes
      // GitHub reject the write rather than silently clobbering a newer commit.
      ...(sha ? { sha } : {}),
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new GitHubWriteError(response.status, detail)
  }

  const body = (await response.json()) as {
    commit?: { sha?: string; html_url?: string }
  }
  if (!body.commit?.sha) throw new Error('GitHub write succeeded without commit metadata.')
  return { sha: body.commit.sha, commitUrl: body.commit.html_url }
}

/** Frontmatter keys that must round-trip as quoted strings, not YAML scalars. */
const QUOTED = new Set(['date', 'year', 'title', 'excerpt'])

/** JSON scalars and flow collections are safe YAML, including nested strings. */
function encodeFrontmatterValue(value: unknown): string {
  const encoded = JSON.stringify(value)
  if (encoded === undefined) throw new Error('Frontmatter contains an unsupported value.')
  // YAML treats these Unicode characters as line breaks even within quotes.
  return encoded.replace(/[\u0085\u2028\u2029]/g, (character) =>
    `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`,
  )
}

function encodeFrontmatterKey(key: string): string {
  const plain = /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(key) && !/^(null|true|false|yes|no|on|off|y|n)$/i.test(key)
  return plain ? key : encodeFrontmatterValue(key)
}

function serialise(data: Record<string, unknown>, body: string): string {
  // Never interpolate unencoded metadata into YAML: a newline or delimiter in
  // any string/key must remain data, rather than alter the file's structure.
  const lines = Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]): string | null => {
      const encodedKey = encodeFrontmatterKey(key)
      if (QUOTED.has(key)) return `${encodedKey}: ${encodeFrontmatterValue(String(value))}`
      if (typeof value === 'object' && !Array.isArray(value)) {
        const nested = Object.entries(value as Record<string, unknown>)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
        // An object whose every field is empty would emit a dangling key.
        if (nested.length === 0) return null
        return `${encodedKey}: ${encodeFrontmatterValue(Object.fromEntries(nested))}`
      }
      return `${encodedKey}: ${encodeFrontmatterValue(value)}`
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
export async function savePost(
  slug: string,
  changes: PostDraft,
  message: string,
  expectedVersion?: string,
): Promise<PublishResult> {
  assertPostSlug(slug)
  const target = publishTarget()
  if (target === 'disabled') {
    throw new Error(NOT_CONFIGURED)
  }
  if (target === 'local') return saveLocally(slug, changes, expectedVersion)

  const { repo, branch } = config()
  const path = `content/posts/${slug}.mdx`

  const response = await gh(`/repos/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`)
  if (!response.ok) throw new Error(`Cannot read ${path} (${response.status})`)
  const file = (await response.json()) as { content?: string; sha?: string }
  if (typeof file.content !== 'string' || typeof file.sha !== 'string' || !file.sha) {
    throw new Error(`GitHub post content or blob SHA is missing for ${path}.`)
  }
  const prepared = preparePostSave(slug, Buffer.from(file.content, 'base64'), changes, expectedVersion)
  let commit: Pick<PublishResult, 'sha' | 'commitUrl'>
  try {
    // Compare-and-swap against the blob from the reviewed source read. Never
    // upgrade this SHA with a second read before the write.
    commit = await writeGitHubFile(path, prepared.contents, message, file.sha)
  } catch (error) {
    if (error instanceof GitHubWriteError && (error.status === 409 || error.status === 422)) {
      // These codes also cover unrelated validation errors. Only label an
      // actual source change as a conflict; retain other GitHub failures.
      const latestSha = await currentSha(path)
      if (latestSha !== file.sha) throw postConflict()
    }
    throw error
  }

  return {
    target: 'github',
    branch,
    ...prepared.result,
    ...commit,
  }
}

/** Validate against the source before applying any caller-supplied changes. */
function preparePostSave(slug: string, raw: Buffer, changes: PostDraft, expectedVersion?: string) {
  const existing = matter(raw.toString('utf8'))
  const existingPost = parsePost(slug, raw.toString('utf8'))
  const previousStatus = normaliseStatus(existing.data.status)
  const status = normaliseStatus(Object.hasOwn(changes, 'status') ? changes.status : existing.data.status)
  if (status === 'Published' && (typeof expectedVersion !== 'string' || !expectedVersion.trim())) {
    throw new PostSaveError('post_review_required', 'Open the saved post in the editor and review it before publishing.')
  }
  if (expectedVersion !== undefined && expectedVersion !== sourceVersion(raw)) throw postConflict()

  const publishing = previousStatus !== 'Published' && status === 'Published'
  if (publishing) {
    const baseline = { ...existing.data, ...existingPost }
    const differs = Object.entries(changes).some(([key, value]) =>
      key !== 'status' && !isDeepStrictEqual(value, baseline[key as keyof typeof baseline]),
    )
    if (differs) {
      throw new PostSaveError('post_unsaved_changes', 'Save your edits first, then review the saved post before publishing.')
    }
  }

  const { body, ...frontmatterChanges } = changes
  // Publication changes only status. YAML's own serializer preserves all
  // frontmatter values. Remove the empty-body newline stringify adds, keeping
  // one newline after the closing delimiter before appending the exact body.
  const contents = publishing
    ? matter.stringify('', { ...existing.data, status: 'Published' }).trimEnd() + '\n' + existing.content
    : serialise({ ...existing.data, ...frontmatterChanges }, body ?? existing.content)
  const post = parsePost(slug, contents)
  // Check the persisted interpretation too: serializer bugs or malformed
  // metadata must never promote a non-publishing save into publication.
  if (post.status !== status) {
    throw new PostSaveError('post_unsaved_changes', 'The saved metadata would change this post\'s status unexpectedly. Review the post before saving again.')
  }
  if (post.status === 'Published') validateArticleBody(post.body)
  if (post.status === 'Published' && (typeof expectedVersion !== 'string' || !expectedVersion.trim())) {
    throw new PostSaveError('post_review_required', 'Open the saved post in the editor and review it before publishing.')
  }
  if (previousStatus !== 'Published' && post.status === 'Published') {
    if (!isDeepStrictEqual({ ...existingPost, status: undefined }, { ...post, status: undefined })) {
      throw new PostSaveError('post_unsaved_changes', 'The saved post could not be published without changing its content. Save and review it again.')
    }
  }
  return {
    contents,
    result: { previousStatus, status: post.status, post, postVersion: sourceVersion(contents) },
  }
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
export function publishTarget(): PublishTarget {
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) return 'github'
  return process.env.NODE_ENV === 'production' ? 'disabled' : 'local'
}

async function saveLocally(slug: string, changes: PostDraft, expectedVersion?: string): Promise<PublishResult> {
  const path = join(process.cwd(), 'content', 'posts', `${slug}.mdx`)
  const lockPath = `${path}.lock`
  const temporaryPath = `${path}.${randomUUID()}.tmp`
  let lock: Awaited<ReturnType<typeof open>>
  try {
    lock = await open(lockPath, 'wx')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw postConflict()
    throw error
  }
  let ownsTemporary = false
  try {
    const prepared = preparePostSave(slug, await readFile(path), changes, expectedVersion)
    const temporary = await open(temporaryPath, 'wx')
    ownsTemporary = true
    try {
      await temporary.writeFile(prepared.contents, 'utf8')
    } finally {
      await temporary.close()
    }
    await rename(temporaryPath, path)
    ownsTemporary = false
    return { target: 'local', ...prepared.result }
  } finally {
    try {
      if (ownsTemporary) await unlink(temporaryPath)
    } finally {
      try {
        await lock.close()
      } finally {
        await unlink(lockPath)
      }
    }
  }
}

/**
 * Create a post. Like `createProject`, it refuses to overwrite: a title that
 * slugs to an existing post is an error, not a silent replacement.
 */
export async function createPost(slug: string, draft: PostDraft, message: string): Promise<PublishResult> {
  assertPostSlug(slug)
  const target = publishTarget()
  if (target === 'disabled') throw new Error(NOT_CONFIGURED)

  const path = `content/posts/${slug}.mdx`
  const { body, ...frontmatter } = draft
  const contents = serialise(frontmatter as Record<string, unknown>, body ?? '')
  const status = normaliseStatus(frontmatter.status)
  const savedPost = parsePost(slug, contents)
  if (savedPost.status !== status) {
    throw new PostSaveError('post_unsaved_changes', 'The new post\'s metadata would change its status unexpectedly. Save it as a draft and review it first.')
  }
  if (status === 'Published') validateArticleBody(savedPost.body)
  const post = { ...frontmatter, slug, body: body ?? '', status } as Post

  if (target === 'local') {
    const absolute = join(process.cwd(), path)
    try {
      await writeFile(absolute, contents, { encoding: 'utf8', flag: 'wx' })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new PostAlreadyExistsError(slug)
      throw error
    }
    return { target: 'local', status, post }
  }

  if (await currentSha(path)) throw new PostAlreadyExistsError(slug)
  let commit: Pick<PublishResult, 'sha' | 'commitUrl'>
  try {
    // Never re-read a SHA for the write: that would turn a racing creation into
    // an update of the other writer's post.
    commit = await writeGitHubFile(path, contents, message)
  } catch (error) {
    if (
      error instanceof GitHubWriteError &&
      (error.status === 409 || error.status === 422) &&
      await currentSha(path)
    ) {
      throw new PostAlreadyExistsError(slug)
    }
    throw error
  }
  return {
    target: 'github',
    branch: config().branch,
    status,
    post,
    ...commit,
  }
}

/** Read current source content for authenticated admin callers, before redeploy. */
export async function getLatestPost(slug: string): Promise<Post | null> {
  return (await getLatestPostSnapshot(slug))?.post ?? null
}

/** Post and review version always originate from the same fresh source read. */
export async function getLatestPostSnapshot(slug: string): Promise<{ post: Post; version: string } | null> {
  assertPostSlug(slug)
  // Existing local content is readable even when production publishing is off.
  if (publishTarget() !== 'github') {
    try {
      const raw = await readFile(join(process.cwd(), 'content', 'posts', `${slug}.mdx`))
      return { post: parsePost(slug, raw.toString('utf8')), version: sourceVersion(raw) }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    }
  }

  const { repo, branch } = config()
  const path = `content/posts/${slug}.mdx`
  const response = await gh(`/repos/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`)
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`GitHub post read failed (${response.status}) for ${path}.`)
  const payload = (await response.json()) as { content?: string }
  if (typeof payload.content !== 'string') throw new Error(`GitHub post content is missing for ${path}.`)
  const raw = Buffer.from(payload.content, 'base64')
  return { post: parsePost(slug, raw.toString('utf8')), version: sourceVersion(raw) }
}

function parsePost(slug: string, raw: string): Post {
  const { data, content } = matter(raw)
  return {
    slug,
    title: String(data.title ?? ''),
    excerpt: String(data.excerpt ?? ''),
    date: String(data.date ?? ''),
    readingTime: String(data.readingTime ?? ''),
    category: String(data.category ?? ''),
    cover: String(data.cover ?? '/images/sudi.jpeg'),
    featured: Boolean(data.featured),
    status: normaliseStatus(data.status),
    generatedWeek: data.generatedWeek,
    subtitle: data.subtitle,
    breadcrumb: data.breadcrumb,
    tags: data.tags,
    home: data.home,
    body: content,
  }
}

/** Find the article already generated for an ISO week, locally or in GitHub. */
export async function findPostByGeneratedWeek(week: string): Promise<Post | null> {
  const canonicalSlug = `weekly-${week.toLowerCase()}`
  const isCandidate = (slug: string) => slug === canonicalSlug || slug.startsWith(`${canonicalSlug}-`)
  if (publishTarget() === 'local') {
    return (await getPosts()).find((post) => isCandidate(post.slug) && post.generatedWeek === week) ?? null
  }
  if (publishTarget() === 'disabled') throw new Error(NOT_CONFIGURED)

  const { repo, branch } = config()
  const response = await gh(`/repos/${repo}/contents/content/posts?ref=${encodeURIComponent(branch)}`)
  if (!response.ok) throw new Error(`GitHub post listing failed (${response.status}).`)
  const files = (await response.json()) as Array<{ name?: string; type?: string }>

  for (const file of files) {
    if (file.type !== 'file' || !file.name?.endsWith('.mdx')) continue
    const slug = file.name.slice(0, -'.mdx'.length)
    if (!isCandidate(slug)) continue
    const post = await getLatestPost(slug)
    if (post?.generatedWeek === week) return post
  }

  return null
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
export async function createProject(
  slug: string,
  draft: ProjectDraft,
  message: string,
): Promise<PublishResult> {
  assertProjectSlug(slug)
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
    try {
      await writeFile(absolute, contents, { encoding: 'utf8', flag: 'wx' })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        throw new Error(`A project called "${slug}" already exists.`)
      }
      throw error
    }
    return { target: 'local', contentVersion: sourceVersion(contents) }
  }

  if (await currentSha(path)) throw new Error(`A project called "${slug}" already exists.`)
  try {
    // No SHA means create-only. GitHub rejects a racing writer's existing file.
    const result = await writeGitHubFile(path, contents, message)
    return { target: 'github', branch: config().branch, ...result, contentVersion: sourceVersion(contents) }
  } catch (error) {
    if (error instanceof GitHubWriteError && (error.status === 409 || error.status === 422)) {
      let winnerExists = false
      try {
        winnerExists = Boolean(await currentSha(path))
      } catch {
        // Preserve the original write failure when race diagnosis also fails.
      }
      if (winnerExists) throw new Error(`A project called "${slug}" already exists.`)
    }
    throw error
  }
}

/** Read a source snapshot from the publishing target, preserving source bytes. */
async function readVersionedSource(relativeContentPath: string): Promise<{ raw: Buffer; sha?: string } | null> {
  if (publishTarget() !== 'github') {
    try {
      return { raw: await readFile(join(process.cwd(), 'content', relativeContentPath)) }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    }
  }

  const { repo, branch } = config()
  const path = `content/${relativeContentPath}`
  const response = await gh(`/repos/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`)
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Cannot read ${path} (${response.status})`)
  const file = (await response.json()) as { content?: string; sha?: string }
  if (typeof file.content !== 'string' || typeof file.sha !== 'string' || !file.sha) {
    throw new Error(`GitHub content or blob SHA is missing for ${path}.`)
  }
  return { raw: Buffer.from(file.content, 'base64'), sha: file.sha }
}

function projectFromSource(slug: string, raw: Buffer): Project {
  const { data, content } = matter(raw.toString('utf8'))
  return {
    slug,
    title: String(data.title ?? ''),
    year: String(data.year ?? ''),
    description: String(data.description ?? ''),
    shortDescription: data.shortDescription,
    tech: data.tech ?? [],
    category: String(data.category ?? ''),
    cover: String(data.cover ?? ''),
    links: data.links ?? {},
    body: content,
  }
}

/** Read a project and version from one fresh source read. */
export async function getLatestProjectSnapshot(slug: string): Promise<{ project: Project; version: string } | null> {
  assertProjectSlug(slug)
  const source = await readVersionedSource(`projects/${slug}.mdx`)
  if (!source) return null
  return { project: projectFromSource(slug, source.raw), version: sourceVersion(source.raw) }
}

/** Read merged settings and version from the same fresh source bytes. */
export async function getLatestSettingsSnapshot(): Promise<{ settings: SiteSettings; version: string }> {
  const source = await readVersionedSource('site.json')
  const raw = source?.raw ?? Buffer.from(`${JSON.stringify(DEFAULT_SETTINGS, null, 2)}\n`)
  let parsed: SiteSettingsInput
  try {
    parsed = JSON.parse(raw.toString('utf8')) as SiteSettingsInput
  } catch {
    throw new Error('Site settings are invalid JSON. Reload after repairing the saved settings.')
  }
  return { settings: mergeSiteSettings(parsed), version: sourceVersion(raw) }
}

function requireFreshVersion(expectedVersion: string | undefined, raw: Buffer): void {
  if (typeof expectedVersion !== 'string' || !expectedVersion.trim()) {
    throw new Error('Reload the saved content and review it before saving.')
  }
  if (expectedVersion !== sourceVersion(raw)) {
    throw new Error('This content changed after you opened it. Reload the saved content and review it before saving.')
  }
}

async function saveLocallyVersioned(
  relativeContentPath: string,
  contents: string,
  expectedVersion: string,
  allowCreate = false,
): Promise<string> {
  const absolute = join(process.cwd(), 'content', relativeContentPath)
  const lockPath = `${absolute}.lock`
  const temporaryPath = `${absolute}.${randomUUID()}.tmp`
  let lock: Awaited<ReturnType<typeof open>>
  try {
    lock = await open(lockPath, 'wx')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error('Another save is in progress. Reload the saved content and review it before trying again.')
    }
    throw error
  }

  let ownsTemporary = false
  try {
    let current: Buffer | null
    try {
      current = await readFile(absolute)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      current = null
    }
    if (current) requireFreshVersion(expectedVersion, current)
    else if (!allowCreate) {
      throw new Error('This content was deleted after you opened it. Reload the saved content before saving.')
    } else {
      const defaultSettings = Buffer.from(`${JSON.stringify(DEFAULT_SETTINGS, null, 2)}\n`)
      requireFreshVersion(expectedVersion, defaultSettings)
    }

    const temporary = await open(temporaryPath, 'wx')
    ownsTemporary = true
    try {
      await temporary.writeFile(contents, 'utf8')
    } finally {
      await temporary.close()
    }
    await rename(temporaryPath, absolute)
    ownsTemporary = false
    return sourceVersion(contents)
  } finally {
    try {
      if (ownsTemporary) await unlink(temporaryPath)
    } finally {
      try {
        await lock.close()
      } finally {
        await unlink(lockPath)
      }
    }
  }
}

async function saveRemoteVersioned(
  path: string,
  contents: string,
  message: string,
  expectedVersion: string,
  snapshot: { raw: Buffer; sha?: string } | null,
): Promise<PublishResult> {
  const currentRaw = snapshot?.raw ?? Buffer.from(`${JSON.stringify(DEFAULT_SETTINGS, null, 2)}\n`)
  requireFreshVersion(expectedVersion, currentRaw)
  const { branch } = config()
  try {
    const commit = await writeGitHubFile(path, contents, message, snapshot?.sha)
    return { target: 'github', branch, ...commit, contentVersion: sourceVersion(contents) }
  } catch (error) {
    if (error instanceof GitHubWriteError && (error.status === 409 || error.status === 422)) {
      let latestSha: string | undefined
      let readSucceeded = false
      try {
        latestSha = await currentSha(path)
        readSucceeded = true
      } catch {
        // Preserve the original write failure when conflict diagnosis also fails.
      }
      if (readSucceeded && latestSha !== snapshot?.sha) {
        throw new Error('This content changed after you opened it. Reload the saved content and review it before saving.')
      }
    }
    throw error
  }
}

/** Update a project using the exact source snapshot reviewed by the caller. */
export async function saveProject(
  slug: string,
  changes: ProjectDraft,
  message: string,
  expectedVersion: string,
): Promise<PublishResult> {
  assertProjectSlug(slug)
  const target = publishTarget()
  if (target === 'disabled') throw new Error(NOT_CONFIGURED)

  const relativeContentPath = `projects/${slug}.mdx`
  const path = `content/${relativeContentPath}`
  const snapshot = await readVersionedSource(relativeContentPath)
  if (!snapshot) throw new Error(`Cannot save ${path}: it no longer exists. Reload the project list.`)
  requireFreshVersion(expectedVersion, snapshot.raw)
  const existing = matter(snapshot.raw.toString('utf8'))
  const { body, ...frontmatter } = changes
  const contents = serialise(
    { ...existing.data, ...(frontmatter as Record<string, unknown>) },
    body ?? existing.content,
  )

  if (target === 'local') {
    // Recheck after taking the lock to catch another cooperating local writer.
    const contentVersion = await saveLocallyVersioned(relativeContentPath, contents, expectedVersion)
    return { target: 'local', contentVersion }
  }
  return saveRemoteVersioned(path, contents, message, expectedVersion, snapshot)
}

/** Write any JSON file in the repo through the configured target. */
export async function writeJson(
  path: string,
  data: unknown,
  message: string,
): Promise<PublishResult> {
  const target = publishTarget()
  if (target === 'disabled') throw new Error(NOT_CONFIGURED)

  const contents = `${JSON.stringify(data, null, 2)}\n`
  if (target === 'local') {
    await writeFile(join(process.cwd(), path), contents, 'utf8')
    return { target: 'local' }
  }
  const { branch } = config()
  return { target: 'github', branch, ...(await commitFile(path, contents, message)) }
}

/** Site settings live in content/site.json, written the same way as content. */
export async function saveSettings(
  settings: SiteSettings,
  message: string,
  expectedVersion: string,
): Promise<PublishResult> {
  const target = publishTarget()
  if (target === 'disabled') throw new Error(NOT_CONFIGURED)

  const relativeContentPath = 'site.json'
  const path = `content/${relativeContentPath}`
  const snapshot = await readVersionedSource(relativeContentPath)
  const currentRaw = snapshot?.raw ?? Buffer.from(`${JSON.stringify(DEFAULT_SETTINGS, null, 2)}\n`)
  requireFreshVersion(expectedVersion, currentRaw)
  const contents = `${JSON.stringify(settings, null, 2)}\n`

  if (target === 'local') {
    const contentVersion = await saveLocallyVersioned(relativeContentPath, contents, expectedVersion, true)
    return { target: 'local', contentVersion }
  }
  return saveRemoteVersioned(path, contents, message, expectedVersion, snapshot)
}

/** True when saving will actually persist somewhere. */
export function isPublishingConfigured(): boolean {
  return publishTarget() !== 'disabled'
}

/** What an upload is allowed to be. */
const IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
}
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/**
 * Commit an uploaded image into `public/images/` and return its public path.
 *
 * The repo is the asset store. It already holds the content and already has a
 * write path through the GitHub API, so an image needs no new service, no
 * bucket and no second set of credentials — and it deploys with the post that
 * references it rather than arriving separately.
 *
 * The trade-off is that images are permanent in git history, so this refuses
 * anything large and anything that is not an image.
 */
export async function uploadImage(file: File): Promise<string> {
  const target = publishTarget()
  if (target === 'disabled') throw new Error(NOT_CONFIGURED)

  const extension = IMAGE_TYPES[file.type]
  if (!extension) {
    throw new Error(`${file.type || 'That file'} is not a supported image (PNG, JPG, WebP, AVIF)`)
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`Image is ${(file.size / 1024 / 1024).toFixed(1)}MB; the limit is 5MB`)
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const path = `public/images/${imageName(file.name, extension)}`

  if (target === 'local') {
    await writeFile(join(process.cwd(), path), bytes)
  } else {
    await commitFile(path, bytes, `content: upload ${path}`)
  }

  // The public URL, which is the path minus the `public` prefix.
  return path.replace(/^public/, '')
}

/**
 * A safe, unique filename.
 *
 * The original name is kept in readable form so the repo stays browsable, with
 * a short random suffix so re-uploading a file called `cover.png` never
 * silently overwrites a different post's cover.
 */
function imageName(original: string, extension: string): string {
  const base = original
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

  const suffix = randomUUID().slice(0, 8)
  return `${base || 'image'}-${suffix}.${extension}`
}
