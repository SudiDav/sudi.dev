import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import { formatViewCount, getPostViewCounts } from './vercel-analytics'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubEnv('VERCEL_TOKEN', 'vercel-test-token')
  vi.stubEnv('VERCEL_PROJECT_ID', 'prj_test')
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('Vercel Web Analytics view counts', () => {
  it('queries each exact blog path and returns page views', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { pageviews: 1250 } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { pageviews: 8.9 } }), { status: 200 }))

    const result = await getPostViewCounts(['maybe-love-is-the-now', 'after-amen-move'])

    expect(result).toEqual({ counts: { 'maybe-love-is-the-now': 1250, 'after-amen-move': 8 }, available: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const first = new URL(fetchMock.mock.calls[0][0] as string)
    expect(first.pathname).toBe('/v1/query/web-analytics/visits/count')
    expect(first.searchParams.get('projectId')).toBe('prj_test')
    expect(first.searchParams.get('filter')).toMatch(/^requestPath eq '\/blog\/(?:maybe-love-is-the-now|after-amen-move)'$/)
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer vercel-test-token')
  })

  it('supports the team slug and avoids the API when credentials are missing', async () => {
    vi.stubEnv('VERCEL_TEAM_SLUG', 'sudi-team')
    const response = new Response(JSON.stringify({ data: { pageviews: 4 } }), { status: 200 })
    fetchMock.mockResolvedValue(response)
    expect(await getPostViewCounts(['post'])).toMatchObject({ counts: { post: 4 }, available: true })
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('slug')).toBe('sudi-team')

    vi.stubEnv('VERCEL_TOKEN', '')
    expect(await getPostViewCounts(['post'])).toMatchObject({ counts: {}, available: false })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('keeps successful counts when one response fails and rejects unsafe slugs', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { pageviews: 7 } }), { status: 200 }))
      .mockResolvedValueOnce(new Response('upstream failure', { status: 500 }))

    const result = await getPostViewCounts(['safe-post', '../secrets', 'broken-post'])

    expect(result).toEqual({ counts: { 'safe-post': 7 }, available: true, error: 'Some Vercel Web Analytics counts could not be loaded.' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('formats counts for the admin table', () => {
    expect(formatViewCount(1234567)).toBe('1,234,567')
  })
})
