import { describe, expect, it, vi } from 'vitest'
import worker from '../sites/stream/worker'
const snapshot = { updatedAt: '2026-10-31T08:00:00.000Z', movies: [{ title: 'A saved movie', rating: 8 }] }
const env = (stored: string | null = JSON.stringify({ ...snapshot, providerToken: 'private-upstream-fixture' })) => ({
  MOVIES_STORAGE: { get: async () => stored, put: async () => {} },
  MOVIE_REFRESH_TOKEN: 'private-refresh-fixture',
  ASSETS: { fetch: async () => new Response('portal') },
})
describe('stream movie API', () => {
  it('serves only the stored catalog without spending upstream quota or exposing secrets', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('No provider calls on reads'))
    try {
      const response = await worker.fetch(new Request('https://stream.sudi.dev/api/movies?refresh=true'), env())
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toMatchObject(snapshot)
      expect(JSON.stringify(data)).not.toContain('private-')
      expect(fetcher).not.toHaveBeenCalled()
    } finally { fetcher.mockRestore() }
  })
  it('rejects unauthenticated maintenance refreshes and unsupported methods', async () => {
    expect((await worker.fetch(new Request('https://stream.sudi.dev/api/movies/refresh', { method: 'POST' }), env())).status).toBe(401)
    expect((await worker.fetch(new Request('https://stream.sudi.dev/api/movies', { method: 'POST' }), env())).status).toBe(405)
  })
  it('shows an unavailable response when no snapshot exists, and keeps serving portal assets', async () => {
    const response = await worker.fetch(new Request('https://stream.sudi.dev/api/movies'), env(null))
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain('private-')
    expect(await (await worker.fetch(new Request('https://stream.sudi.dev/'), env())).text()).toBe('portal')
  })
})
