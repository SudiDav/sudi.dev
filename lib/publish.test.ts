import { afterEach, describe, expect, it, vi } from 'vitest'
import { unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

vi.mock('server-only', () => ({}))

import { createPost, findPostByGeneratedWeek } from './publish'

describe('publishing metadata', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
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

  it('finds a generated week from local post content', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('GITHUB_TOKEN', '')
    vi.stubEnv('GITHUB_REPO', '')
    const slug = `weekly-2026-w07-local-${Date.now()}`
    const path = join(process.cwd(), 'content', 'posts', `${slug}.mdx`)
    await writeFile(path, `---\ntitle: Local weekly draft\nexcerpt: Draft\ndate: "2026-02-10"\nreadingTime: 1 min read\ncategory: Craft\ncover: /images/sudi.jpeg\nfeatured: false\nstatus: Draft\ngeneratedWeek: 2026-W07\n---\n\nBody.\n`)
    try {
      await expect(findPostByGeneratedWeek('2026-W07')).resolves.toMatchObject({
        slug,
        generatedWeek: '2026-W07',
        status: 'Draft',
      })
    } finally {
      await unlink(path)
    }
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
