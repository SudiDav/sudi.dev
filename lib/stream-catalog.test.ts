import { describe, expect, it, vi } from 'vitest'
import { refreshCatalog, selectMovies, type CatalogEnv } from '../sites/stream/catalog'

const movie = (imdbId: string, rating: string, votes = '20,000') => ({
  imdbID: imdbId, imdbRating: rating, imdbVotes: votes, Type: 'movie', Response: 'True',
  Title: 'A movie', Year: '2001', Genre: 'Drama', Plot: 'A story.',
})
const candidate = (id: number) => ({ id, title: 'Movie', original_title: 'Movie', release_date: '2001-01-01', adult: false, poster_path: '/poster.jpg' })

describe('stream movie catalog', () => {
  it('filters unrated, low-score, low-vote, adult and future movies; sorts and deduplicates IMDb results', () => {
    const rows = [
      { candidate: candidate(1), details: movie('tt0000001', '7.0') },
      { candidate: candidate(2), details: movie('tt0000002', '9.1') },
      { candidate: candidate(3), details: movie('tt0000003', '6.9') },
      { candidate: candidate(4), details: movie('tt0000004', 'N/A') },
      { candidate: candidate(5), details: movie('tt0000005', '9.9', '12') },
      { candidate: { ...candidate(6), adult: true }, details: movie('tt0000006', '9.8') },
      { candidate: { ...candidate(7), release_date: '2099-01-01' }, details: movie('tt0000007', '9.7') },
      { candidate: candidate(8), details: movie('tt0000002', '9.1') },
    ]
    expect(selectMovies(rows, '2026-10-31').map(m => [m.imdbId, m.rating])).toEqual([['tt0000002', 9.1], ['tt0000001', 7]])
  })

  it('rejects malformed votes, ratings, IDs and poster paths instead of trusting provider fields', () => {
    const rows = [
      { candidate: candidate(1), details: movie('javascript:alert(1)', '8') },
      { candidate: candidate(2), details: movie('tt0000002', '8bad') },
      { candidate: candidate(3), details: movie('tt0000003', '11') },
      { candidate: candidate(4), details: movie('tt0000004', '8', '-10000') },
    ]
    expect(selectMovies(rows, '2026-10-31')).toEqual([])
    expect(selectMovies([{ candidate: { ...candidate(1), poster_path: '//evil.test/a.jpg' }, details: movie('tt0000001', '8') }], '2026-10-31')[0].poster).toBeNull()
  })

  it('persists a real catalog while bounding each refresh to 20 IMDb lookups', async () => {
    const stored = new Map<string, string>()
    let omdbCalls = 0
    const fetcher: typeof fetch = vi.fn(async (input) => {
      const url = new URL(String(input))
      if (url.pathname.includes('/discover/')) return Response.json({ results: Array.from({ length: 30 }, (_, i) => candidate(i + 1)) })
      if (url.pathname.includes('/external_ids')) return Response.json({ imdb_id: `tt${url.pathname.split('/')[3].padStart(7, '0')}` })
      omdbCalls++
      return Response.json(movie(url.searchParams.get('i')!, '8.5'))
    })
    const env: CatalogEnv = { TMDB_READ_TOKEN: 'private-tmdb-fixture', OMDB_API_KEY: 'private-omdb-fixture', MOVIES_STORAGE: {
      get: async key => stored.get(key) ?? null,
      put: async (key, value) => { stored.set(key, value) },
    } }
    const result = await refreshCatalog(env, fetcher)
    expect(result.movies).toHaveLength(20)
    expect(omdbCalls).toBe(20)
    expect(JSON.stringify(result)).not.toContain('private-')
    expect(JSON.parse(stored.get('catalog')!).movies).toHaveLength(20)
    expect(await refreshCatalog(env, fetcher)).toEqual(result)
    expect(omdbCalls).toBe(20)
  })

  it('preserves the saved catalog when a provider fails instead of replacing it with partial data', async () => {
    const previous = JSON.stringify({ updatedAt: '2001-01-01T00:00:00.000Z', movies: [{ title: 'Keep me' }] })
    let saved = previous
    const env: CatalogEnv = { TMDB_READ_TOKEN: 'private-tmdb-fixture', OMDB_API_KEY: 'private-omdb-fixture', MOVIES_STORAGE: {
      get: async () => saved, put: async (_key, value) => { saved = value },
    } }
    await expect(refreshCatalog(env, async () => new Response('upstream failure', { status: 503 }))).rejects.toThrow('Movie provider unavailable')
    expect(saved).toBe(previous)
  })
  it('refreshes on schedule even when the previous run finished just under six hours ago', async () => {
    const previous = JSON.stringify({ updatedAt: new Date(Date.now() - 6 * 3600000 + 5000).toISOString(), movies: [{ title: 'Old snapshot' }] })
    const env: CatalogEnv = { TMDB_READ_TOKEN: 'fixture', OMDB_API_KEY: 'fixture', MOVIES_STORAGE: { get: async () => previous, put: async () => {} } }
    await expect(refreshCatalog(env, async () => new Response(null, { status: 503 }), true)).rejects.toThrow('Movie provider unavailable')
  })

  it.each(['discovery', 'external-id', 'rating', 'score'])('preserves the old snapshot when one %s response is malformed', async (broken) => {
    const previous = JSON.stringify({ updatedAt: '2001-01-01T00:00:00.000Z', movies: [{ title: 'Keep me' }] })
    let saved = previous
    const env: CatalogEnv = { TMDB_READ_TOKEN: 'fixture', OMDB_API_KEY: 'fixture', MOVIES_STORAGE: {
      get: async () => saved, put: async (_key, value) => { saved = value },
    } }
    const fetcher: typeof fetch = async input => {
      const url = new URL(String(input))
      if (url.pathname.includes('/discover/')) return Response.json({ results: [candidate(1), broken === 'discovery' ? { ...candidate(2), id: 'bad' } : candidate(2)] })
      if (url.pathname.includes('/external_ids')) return Response.json(broken === 'external-id' && url.pathname.includes('/2/') ? {} : { imdb_id: url.pathname.includes('/2/') ? 'tt0000002' : 'tt0000001' })
      const id = url.searchParams.get('i')!
      return Response.json(broken === 'rating' && id === 'tt0000002' ? { imdbID: id } : movie(id, broken === 'score' && id === 'tt0000002' ? '8bad' : '8.5'))
    }
    await expect(refreshCatalog(env, fetcher)).rejects.toThrow('Movie provider unavailable')
    expect(saved).toBe(previous)
  })

})
