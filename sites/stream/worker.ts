import { MovieProviderError, refreshCatalog, type Catalog, type CatalogEnv } from './catalog'
export type Env = CatalogEnv & {
  MOVIE_REFRESH_TOKEN?: string
  ASSETS: { fetch(request: Request): Promise<Response> }
}
const reply = (data: unknown, status = 200, cache = false) => Response.json(data, {
  status, headers: { 'Cache-Control': cache ? 'public, max-age=300' : 'no-store',
    'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow' },
})
const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname
    if (path === '/api/movies') {
      if (request.method !== 'GET' && request.method !== 'HEAD') return reply({ error: 'Method not allowed' }, 405)
      try {
        const raw = await env.MOVIES_STORAGE.get('catalog')
        if (!raw) return reply({ error: 'Movie recommendations are being prepared', code: 'catalog_pending' }, 503)
        const catalog = JSON.parse(raw) as Catalog
        if (!Array.isArray(catalog.movies) || !Number.isFinite(Date.parse(catalog.updatedAt))) throw new Error('Invalid snapshot')
        const response = reply({ updatedAt: catalog.updatedAt, movies: catalog.movies, stale: Date.now() - Date.parse(catalog.updatedAt) > 24 * 60 * 60 * 1000 }, 200, true)
        return request.method === 'HEAD' ? new Response(null, response) : response
      } catch { return reply({ error: 'Movie recommendations are temporarily unavailable' }, 503) }
    }
    if (path === '/api/movies/refresh') {
      if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405)
      const header = request.headers.get('Authorization')
      if (!env.MOVIE_REFRESH_TOKEN || header !== `Bearer ${env.MOVIE_REFRESH_TOKEN}`) return reply({ error: 'Unauthorized' }, 401)
      try { return reply({ ok: true, count: (await refreshCatalog(env)).movies.length }) }
      catch (error) {
        return reply({ error: 'Movie refresh failed; saved recommendations have been kept',
          code: error instanceof MovieProviderError ? error.code : 'refresh_failed' }, 502)
      }
    }
    if (path.startsWith('/api/')) return reply({ error: 'Not found' }, 404)
    return env.ASSETS.fetch(request)
  },
  async scheduled(_event: unknown, env: Env): Promise<void> {
    try { await refreshCatalog(env, fetch, true) }
    catch { console.error('Movie catalog refresh failed; keeping saved recommendations') }
  },
}

export default worker
