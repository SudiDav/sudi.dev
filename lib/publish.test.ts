import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import matter from 'gray-matter'

vi.mock('server-only', () => ({}))

const { getPostsMock } = vi.hoisted(() => ({ getPostsMock: vi.fn() }))
vi.mock('./content', () => ({ getPosts: (...args: unknown[]) => getPostsMock(...args) }))

import { createPost, findPostByGeneratedWeek } from './publish'

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
    const slug = `weekly-frontmatter-${Date.now()}`
    const path = join(process.cwd(), 'content', 'posts', `${slug}.mdx`)
    const title = 'Building services: "lessons" from the field'
    const excerpt = 'A practical note: "start small", then learn.'
    try {
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
    } finally {
      await unlink(path).catch(() => {})
    }
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
