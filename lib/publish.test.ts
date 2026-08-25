import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { createPost } from './publish'

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
})
