import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('./content', () => ({ getPosts: async () => [] }))

import { getAdminComments } from './admin-comments'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('GitHub discussion requests', () => {
  it.each(['', 'contents-only-token'])('loads public comments with a required User-Agent, token=%s', async (token) => {
    vi.stubEnv('GITHUB_REPO', 'SudiDav/sudi.dev')
    vi.stubEnv('GITHUB_TOKEN', token)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      if (!headers.get('User-Agent')) return new Response('User agent required', { status: 403 })
      if (headers.has('Authorization')) return new Response('Discussions permission missing', { status: 403 })
      if (url.endsWith('/discussions?per_page=100&sort=created&direction=desc')) {
        return Response.json([{
          number: 1,
          title: 'blog/example',
          html_url: 'https://github.com/SudiDav/sudi.dev/discussions/1',
          comments: 1,
          created_at: '2026-10-01T12:00:00Z',
        }])
      }
      if (url.endsWith('/discussions/1/comments?per_page=100&sort=created&direction=asc')) {
        return Response.json([{
          id: 42,
          body: 'Useful article.',
          created_at: '2026-10-01T12:05:00Z',
          updated_at: '2026-10-01T12:05:00Z',
          user: { login: 'reader', html_url: 'https://github.com/reader' },
        }])
      }
      throw new Error(`Unexpected GitHub request: ${url}`)
    }))

    const result = await getAdminComments()

    expect(result.error).toBeNull()
    expect(result.discussions).toBe(1)
    expect(result.comments).toEqual([expect.objectContaining({
      id: '42', author: 'reader', body: 'Useful article.', postSlug: 'example',
    })])
  })
})
