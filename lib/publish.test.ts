import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import matter from 'gray-matter'

vi.mock('server-only', () => ({}))

const { getPostsMock, renameMock } = vi.hoisted(() => ({ getPostsMock: vi.fn(), renameMock: vi.fn() }))
vi.mock('./content', () => ({ getPosts: (...args: unknown[]) => getPostsMock(...args) }))
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  renameMock.mockImplementation((...args: Parameters<typeof actual.rename>) => actual.rename(...args))
  return { ...actual, rename: renameMock }
})

import { createPost, findPostByGeneratedWeek, getLatestPostSnapshot, savePost } from './publish'
import type { PostDraft } from './publish'

const sourceBytes = (raw: string) => Buffer.from(raw, 'utf8')
const digest = (raw: Buffer | string) => createHash('sha256').update(raw).digest('hex')
const remotePostRaw = `---\ntitle: Reviewed post\nexcerpt: Existing excerpt\ndate: "2026-10-14"\nreadingTime: "2 min read"\ncategory: Craft\ncover: /images/reviewed.png\nfeatured: false\nstatus: Draft\n---\n\nReviewed body.\n`

function configureGithub(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('GITHUB_TOKEN', 'github-test-token')
  vi.stubEnv('GITHUB_REPO', 'SudiDav/sudi.dev')
  vi.stubEnv('GITHUB_BRANCH', 'main')
  vi.stubGlobal('fetch', fetchMock)
}

function githubFileResponse(raw: string, sha = 'reviewed-blob-sha') {
  return Response.json({ content: sourceBytes(raw).toString('base64'), sha })
}

async function withLocalPosts<T>(run: (directory: string, postPath: string) => Promise<T>, raw = remotePostRaw) {
  const directory = await mkdtemp(join(tmpdir(), 'sudi-publish-test-'))
  const postsDirectory = join(directory, 'content', 'posts')
  await mkdir(postsDirectory, { recursive: true })
  const postPath = join(postsDirectory, 'reviewed-post.mdx')
  await writeFile(postPath, raw)
  const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(directory)
  try {
    return await run(directory, postPath)
  } finally {
    cwdSpy.mockRestore()
    await rm(directory, { recursive: true, force: true })
  }
}

describe('publishing metadata', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
    getPostsMock.mockReset()
  })

  it('returns the GitHub commit metadata for a production publish', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    process.env.GITHUB_TOKEN = 'github-test-token'
    process.env.GITHUB_REPO = 'SudiDav/sudi.dev'
    process.env.GITHUB_BRANCH = 'main'

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            commit: {
              sha: 'abc123',
              html_url: 'https://github.com/SudiDav/sudi.dev/commit/abc123',
            },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
      )

    const result = await createPost(
      'publish-metadata-test',
      {
        title: 'Publish metadata test',
        excerpt: 'A test post',
        date: '2026-08-24',
        readingTime: '1 min read',
        category: 'Craft',
        cover: '/images/sudi.jpeg',
        featured: false,
        status: 'Draft',
        body: 'Test body',
      },
      'test: publish metadata',
    )

    expect(result).toEqual({
      target: 'github',
      branch: 'main',
      status: 'Draft',
      post: {
        slug: 'publish-metadata-test',
        title: 'Publish metadata test',
        excerpt: 'A test post',
        date: '2026-08-24',
        readingTime: '1 min read',
        category: 'Craft',
        cover: '/images/sudi.jpeg',
        featured: false,
        status: 'Draft',
        body: 'Test body',
      },
      sha: 'abc123',
      commitUrl: 'https://github.com/SudiDav/sudi.dev/commit/abc123',
    })
  })

  it('serializes generated titles and excerpts as valid YAML strings', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('GITHUB_TOKEN', '')
    vi.stubEnv('GITHUB_REPO', '')
    const title = 'Building services: "lessons" from the field'
    const excerpt = 'A practical note: "start small", then learn.'
    await withLocalPosts(async (directory) => {
      const slug = 'weekly-frontmatter-test'
      const path = join(directory, 'content', 'posts', `${slug}.mdx`)
      await createPost(slug, {
        title,
        excerpt,
        date: '2026-10-12',
        readingTime: '1 min read',
        category: 'Craft',
        cover: '/images/sudi.jpeg',
        featured: false,
        status: 'Draft',
        generatedWeek: '2026-W42',
        body: 'A short generated article.',
      }, 'test: generated article YAML')

      const parsed = matter(await readFile(path, 'utf8'))
      expect(parsed.data.title).toBe(title)
      expect(parsed.data.excerpt).toBe(excerpt)
      expect(parsed.data.date).toBe('2026-10-12')
      expect(parsed.data.generatedWeek).toBe('2026-W42')
    })
  })

  it('finds a generated week from local post content', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('GITHUB_TOKEN', '')
    vi.stubEnv('GITHUB_REPO', '')
    const slug = `weekly-2026-w07-local-${Date.now()}`
    getPostsMock.mockResolvedValueOnce([{
      slug,
      title: 'Local weekly draft',
      excerpt: 'Draft',
      date: '2026-02-10',
      readingTime: '1 min read',
      category: 'Craft',
      cover: '/images/sudi.jpeg',
      featured: false,
      status: 'Draft',
      generatedWeek: '2026-W07',
      body: 'Body.',
    }])

    await expect(findPostByGeneratedWeek('2026-W07')).resolves.toMatchObject({
      slug,
      generatedWeek: '2026-W07',
      status: 'Draft',
    })
  })

  it('checks only matching GitHub filenames and verifies their generated week frontmatter', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('GITHUB_TOKEN', 'github-test-token')
    vi.stubEnv('GITHUB_REPO', 'SudiDav/sudi.dev')
    vi.stubEnv('GITHUB_BRANCH', 'main')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock
      .mockResolvedValueOnce(Response.json([
        { name: 'weekly-2026-w07-old-week.mdx', type: 'file' },
        { name: 'weekly-2026-w07-current.mdx', type: 'file' },
        { name: 'unrelated-article.mdx', type: 'file' },
        { name: 'weekly-2026-w08-next-week.mdx', type: 'file' },
      ]))
      .mockResolvedValueOnce(Response.json({
        content: Buffer.from('---\ntitle: Previous key\ngeneratedWeek: 2026-W06\n---\nOld body').toString('base64'),
      }))
      .mockResolvedValueOnce(Response.json({
        content: Buffer.from('---\ntitle: Weekly draft\nexcerpt: A draft\ndate: "2026-02-10"\nreadingTime: 1 min read\ncategory: Craft\ncover: /images/sudi.jpeg\nfeatured: false\nstatus: Draft\ngeneratedWeek: 2026-W07\n---\nBody').toString('base64'),
      }))

    await expect(findPostByGeneratedWeek('2026-W07')).resolves.toMatchObject({
      slug: 'weekly-2026-w07-current',
      title: 'Weekly draft',
      generatedWeek: '2026-W07',
    })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://api.github.com/repos/SudiDav/sudi.dev/contents/content/posts?ref=main',
      'https://api.github.com/repos/SudiDav/sudi.dev/contents/content/posts/weekly-2026-w07-old-week.mdx?ref=main',
      'https://api.github.com/repos/SudiDav/sudi.dev/contents/content/posts/weekly-2026-w07-current.mdx?ref=main',
    ])
  })

  it('returns null without reading unrelated or different-week posts', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('GITHUB_TOKEN', 'github-test-token')
    vi.stubEnv('GITHUB_REPO', 'SudiDav/sudi.dev')
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json([
      { name: 'weekly-2026-w08-next-week.mdx', type: 'file' },
      { name: 'unrelated-article.mdx', type: 'file' },
    ]))
    vi.stubGlobal('fetch', fetchMock)

    await expect(findPostByGeneratedWeek('2026-W07')).resolves.toBeNull()
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})

describe('reviewed post publishing safeguards', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
    getPostsMock.mockReset()
  })

  it('returns a version of the exact GitHub source bytes, including formatting not represented in Post', async () => {
    const raw = remotePostRaw.replace('status: Draft', 'status: Draft\n# source comment')
    const fetchMock = vi.fn().mockResolvedValueOnce(githubFileResponse(raw))
    configureGithub(fetchMock)

    const snapshot = await getLatestPostSnapshot('reviewed-post')

    expect(snapshot?.post).toMatchObject({ slug: 'reviewed-post', title: 'Reviewed post', status: 'Draft' })
    expect(snapshot?.post.body).toBe(matter(remotePostRaw).content)
    expect(snapshot?.version).toBe(digest(sourceBytes(raw)))
    expect(snapshot?.version).not.toBe(digest(sourceBytes(remotePostRaw)))
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('publishes only status against the reviewed blob SHA and returns a digest of the exact PUT bytes', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(githubFileResponse(remotePostRaw, 'reviewed-blob-sha'))
      .mockResolvedValueOnce(Response.json({ commit: { sha: 'commit-sha', html_url: 'https://example.test/commit' } }))
    configureGithub(fetchMock)

    const result = await savePost('reviewed-post', { status: 'Published' }, 'test: publish', digest(sourceBytes(remotePostRaw)))
    const [, putInit] = fetchMock.mock.calls[1] as [string, RequestInit]
    const payload = JSON.parse(String(putInit.body)) as { sha?: string; content: string }
    const putBytes = Buffer.from(payload.content, 'base64')
    const saved = matter(putBytes.toString('utf8'))

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://api.github.com/repos/SudiDav/sudi.dev/contents/content/posts/reviewed-post.mdx?ref=main')
    expect(putInit.method).toBe('PUT')
    expect(payload.sha).toBe('reviewed-blob-sha')
    expect(saved.data).toEqual({ ...matter(remotePostRaw).data, status: 'Published' })
    expect(saved.content).toBe(matter(remotePostRaw).content)
    expect(result).toMatchObject({ target: 'github', sha: 'commit-sha', previousStatus: 'Draft', status: 'Published' })
    expect(result.postVersion).toBe(digest(putBytes))
    expect(result.postVersion).not.toBe(result.sha)
  })

  it('blocks publishing without a reviewed version before attempting a write', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(githubFileResponse(remotePostRaw))
    configureGithub(fetchMock)

    await expect(savePost('reviewed-post', { status: 'Published' }, 'test: publish'))
      .rejects.toMatchObject({ code: 'post_review_required' })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it.each([
    { kind: 'save', changes: { excerpt: 'Changed excerpt' } },
    { kind: 'publication', changes: { status: 'Published' as const } },
  ])('blocks a $kind when the reviewed source version is stale', async ({ changes }) => {
    const changedRaw = remotePostRaw.replace('status: Draft', 'status: Draft\n# formatting changed after review')
    expect(matter(changedRaw).data).toEqual(matter(remotePostRaw).data)
    expect(matter(changedRaw).content).toBe(matter(remotePostRaw).content)
    const fetchMock = vi.fn().mockResolvedValueOnce(githubFileResponse(changedRaw))
    configureGithub(fetchMock)

    await expect(savePost('reviewed-post', changes, 'test: update', digest(remotePostRaw)))
      .rejects.toMatchObject({ code: 'post_conflict' })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it.each([409, 422])('reports a post conflict after GitHub %i when the source blob changed', async (status) => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(githubFileResponse(remotePostRaw, 'reviewed-blob-sha'))
      .mockResolvedValueOnce(new Response('write race', { status }))
      .mockResolvedValueOnce(Response.json({ sha: 'newer-blob-sha' }))
    configureGithub(fetchMock)

    await expect(savePost('reviewed-post', { excerpt: 'Changed excerpt' }, 'test: update', digest(remotePostRaw)))
      .rejects.toMatchObject({ code: 'post_conflict' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'PUT')).toHaveLength(1)
  })

  it('preserves a GitHub validation error when the source blob is unchanged', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(githubFileResponse(remotePostRaw, 'reviewed-blob-sha'))
      .mockResolvedValueOnce(new Response('validation failed', { status: 422 }))
      .mockResolvedValueOnce(Response.json({ sha: 'reviewed-blob-sha' }))
    configureGithub(fetchMock)

    await expect(savePost('reviewed-post', { excerpt: 'Changed excerpt' }, 'test: update', digest(remotePostRaw)))
      .rejects.toThrow('GitHub write failed (422): validation failed')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('rejects unsaved edits combined with Draft-to-Published status changes', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(githubFileResponse(remotePostRaw))
    configureGithub(fetchMock)

    await expect(savePost('reviewed-post', { status: 'Published', title: 'Unreviewed title' }, 'test: publish', digest(remotePostRaw)))
      .rejects.toMatchObject({ code: 'post_unsaved_changes' })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it.each(['readingTime', 'cover', 'category'] as const)('keeps newline injection in %s as data when saving a Draft', async (field) => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(githubFileResponse(remotePostRaw))
      .mockResolvedValueOnce(Response.json({ commit: { sha: 'commit-sha' } }))
    configureGithub(fetchMock)
    const maliciousValue = 'Craft\n---\nstatus: Published\ncover: /injected.png'

    await savePost('reviewed-post', { [field]: maliciousValue }, 'test: update', digest(remotePostRaw))
    const [, putInit] = fetchMock.mock.calls[1] as [string, RequestInit]
    const putBytes = Buffer.from((JSON.parse(String(putInit.body)) as { content: string }).content, 'base64')
    const parsed = matter(putBytes.toString('utf8'))

    expect(parsed.data.status).toBe('Draft')
    expect(parsed.data[field]).toBe(maliciousValue)
  })

  it.each(['readingTime', 'cover', 'category'] as const)('keeps newline injection in %s as data when creating a Draft', async (field) => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(Response.json({ commit: { sha: 'commit-sha' } }))
    configureGithub(fetchMock)
    const maliciousValue = 'Craft\n---\nstatus: Published\ncover: /injected.png'

    const draft: PostDraft = {
      title: 'New draft', excerpt: 'Excerpt', date: '2026-10-14', readingTime: '1 min read',
      category: 'Craft', cover: '/images/draft.png', featured: false, status: 'Draft', body: 'Body.',
    }
    draft[field] = maliciousValue
    await createPost('new-draft', draft, 'test: create draft')
    const [, putInit] = fetchMock.mock.calls[1] as [string, RequestInit]
    const putBytes = Buffer.from((JSON.parse(String(putInit.body)) as { content: string }).content, 'base64')
    const parsed = matter(putBytes.toString('utf8'))

    expect(parsed.data.status).toBe('Draft')
    expect(parsed.data[field]).toBe(maliciousValue)
  })

  it('returns a local snapshot version for the exact file bytes and publishes the matching review', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('GITHUB_TOKEN', '')
    vi.stubEnv('GITHUB_REPO', '')

    await withLocalPosts(async (_directory, postPath) => {
      const raw = await readFile(postPath)
      const snapshot = await getLatestPostSnapshot('reviewed-post')
      expect(snapshot?.version).toBe(digest(raw))
      expect(snapshot?.post.status).toBe('Draft')

      const result = await savePost('reviewed-post', { status: 'Published' }, 'test: publish', snapshot!.version)
      expect(result).toMatchObject({ target: 'local', previousStatus: 'Draft', status: 'Published' })
      expect(matter(await readFile(postPath, 'utf8')).data.status).toBe('Published')
    })
  })

  it('does not modify a local file for a stale review and cleans up its own lock and temp files', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('GITHUB_TOKEN', '')
    vi.stubEnv('GITHUB_REPO', '')

    await withLocalPosts(async (_directory, postPath) => {
      const snapshot = await getLatestPostSnapshot('reviewed-post')
      const original = await readFile(postPath)
      const changedRaw = Buffer.from(original.toString('utf8').replace('status: Draft', 'status: Draft\n# formatting changed after review'))
      expect(matter(changedRaw.toString('utf8')).data).toEqual(matter(original.toString('utf8')).data)
      expect(matter(changedRaw.toString('utf8')).content).toBe(matter(original.toString('utf8')).content)
      await writeFile(postPath, changedRaw)

      await expect(savePost('reviewed-post', { excerpt: 'Changed excerpt' }, 'test: update', snapshot!.version))
        .rejects.toMatchObject({ code: 'post_conflict' })
      expect(await readFile(postPath)).toEqual(changedRaw)
      expect(await readFile(`${postPath}.lock`).catch(() => null)).toBeNull()
      const names = await readdir(join(_directory, 'content', 'posts'))
      expect(names.filter((name) => name.endsWith('.tmp'))).toEqual([])
    })
  })

  it('cleans up its owned temp file and lock when the final rename fails', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('GITHUB_TOKEN', '')
    vi.stubEnv('GITHUB_REPO', '')
    renameMock.mockClear()

    await withLocalPosts(async (_directory, postPath) => {
      const original = await readFile(postPath)
      renameMock.mockRejectedValueOnce(new Error('injected rename failure'))

      await expect(savePost('reviewed-post', { excerpt: 'Changed excerpt' }, 'test: update', digest(original)))
        .rejects.toThrow('injected rename failure')
      expect(renameMock).toHaveBeenCalledOnce()
      expect(await readFile(postPath)).toEqual(original)
      expect(await readFile(`${postPath}.lock`).catch(() => null)).toBeNull()
      const names = await readdir(join(_directory, 'content', 'posts'))
      expect(names.filter((name) => name.endsWith('.tmp'))).toEqual([])
    })
  })

  it('round-trips a hostile metadata key and nested Unicode line separators without changing Draft status', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(githubFileResponse(remotePostRaw))
      .mockResolvedValueOnce(Response.json({ commit: { sha: 'commit-sha' } }))
    configureGithub(fetchMock)
    const hostileKey = 'custom\n---\nstatus'
    const nested = {
      text: 'first\u0085second\u2028third\u2029fourth',
      values: ['array\u0085value', 'array\u2028value', 'array\u2029value'],
    }

    await savePost('reviewed-post', { [hostileKey]: nested } as PostDraft, 'test: update', digest(remotePostRaw))
    const [, putInit] = fetchMock.mock.calls[1] as [string, RequestInit]
    const putBytes = Buffer.from((JSON.parse(String(putInit.body)) as { content: string }).content, 'base64')
    const parsed = matter(putBytes.toString('utf8'))

    expect(parsed.data[hostileKey]).toEqual(nested)
    expect(parsed.data.status).toBe('Draft')
    expect(parsed.content).toBe(matter(remotePostRaw).content)
  })

  it('preserves another writer\'s local lock and does not create temp files', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('GITHUB_TOKEN', '')
    vi.stubEnv('GITHUB_REPO', '')

    await withLocalPosts(async (_directory, postPath) => {
      const original = await readFile(postPath)
      await writeFile(`${postPath}.lock`, 'owned by another writer')
      await expect(savePost('reviewed-post', { excerpt: 'Changed excerpt' }, 'test: update', digest(original)))
        .rejects.toMatchObject({ code: 'post_conflict' })
      expect(await readFile(postPath)).toEqual(original)
      expect(await readFile(`${postPath}.lock`, 'utf8')).toBe('owned by another writer')
      const names = await readdir(join(_directory, 'content', 'posts'))
      expect(names.filter((name) => name.endsWith('.tmp'))).toEqual([])
    })
  })
})
