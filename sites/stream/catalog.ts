export type Movie = {
  imdbId: string; title: string; year: string; rating: number; votes: number
  genre: string; overview: string; poster: string | null
}
export type Catalog = { updatedAt: string; movies: Movie[] }
export type CatalogEnv = {
  MOVIES_STORAGE: { get(key: string): Promise<string | null>; put(key: string, value: string): Promise<void> }
  TMDB_READ_TOKEN?: string; OMDB_API_KEY?: string
}
type Candidate = { id: number; title?: string; original_title?: string; release_date?: string; adult?: boolean; poster_path?: string }
type Details = Record<string, unknown>
type Row = { candidate: Candidate; details: Details }
const SIX_HOURS = 6 * 60 * 60 * 1000

export class MovieProviderError extends Error {
  constructor(public readonly code: string, message = 'Movie provider unavailable') {
    super(message)
    this.name = 'MovieProviderError'
  }
}

export function selectMovies(rows: Row[], today: string): Movie[] {
  const seen = new Set<string>()
  return rows.flatMap(({ candidate: c, details: d }) => {
    const id = String(d.imdbID ?? '')
    const score = String(d.imdbRating ?? '')
    const voteText = String(d.imdbVotes ?? '')
    const rating = Number(score)
    const votes = Number(voteText.replaceAll(',', ''))
    if (d.Response !== 'True' || d.Type !== 'movie' || !/^tt\d{7,10}$/.test(id) || seen.has(id) ||
      !/^\d+(\.\d+)?$/.test(score) || rating < 7 || rating > 10 ||
      !/^\d{1,3}(,\d{3})*$|^\d+$/.test(voteText) || !Number.isSafeInteger(votes) || votes < 10000 ||
      c.adult !== false || !/^\d{4}-\d{2}-\d{2}$/.test(c.release_date ?? '') || c.release_date! > today ||
      typeof d.Title !== 'string' || !d.Title.trim()) return []
    seen.add(id)
    return [{
      imdbId: id, title: d.Title.slice(0, 200), year: String(d.Year ?? '').slice(0, 12), rating, votes,
      genre: String(d.Genre ?? '').slice(0, 150), overview: String(d.Plot ?? '').slice(0, 600),
      poster: /^\/[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(c.poster_path ?? '')
        ? `https://image.tmdb.org/t/p/w342${c.poster_path}` : null,
    }]
  }).sort((a, b) => b.rating - a.rating || b.votes - a.votes || a.title.localeCompare(b.title)).slice(0, 20)
}

async function json(url: string, fetcher: typeof fetch, token?: string): Promise<Details> {
  const provider = token ? 'tmdb' : 'omdb'
  try {
    const response = await fetcher(url, {
      headers: token ? { Authorization: `Bearer ${token}`, Accept: 'application/json' } : { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000), redirect: 'manual',
    })
    if (!response.ok) throw new MovieProviderError(`${provider}_http_${response.status}`)
    const data = await response.json()
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new MovieProviderError(`${provider}_schema`)
    return data as Details
  } catch (error) {
    if (error instanceof MovieProviderError) throw error
    throw new MovieProviderError(`${provider}_request_failed`)
  }
}

export async function refreshCatalog(env: CatalogEnv, fetcher: typeof fetch = fetch, scheduled = false): Promise<Catalog> {
  if (!env.TMDB_READ_TOKEN || !env.OMDB_API_KEY) throw new MovieProviderError('providers_missing', 'Movie providers are not configured')
  const stored = await env.MOVIES_STORAGE.get('catalog')
  if (stored) {
    const previous = JSON.parse(stored) as Catalog
    const age = Date.now() - Date.parse(previous.updatedAt)
    if (!scheduled && age >= 0 && age < SIX_HOURS && previous.movies.length) return previous
  }
  const today = new Date().toISOString().slice(0, 10)
  const params = new URLSearchParams({ include_adult: 'false', include_video: 'false',
    language: 'en-US', sort_by: 'vote_average.desc', 'vote_count.gte': '10000',
    'primary_release_date.lte': today, page: '1' })
  const discovery = await json(`https://api.themoviedb.org/3/discover/movie?${params}`, fetcher, env.TMDB_READ_TOKEN)
  if (!Array.isArray(discovery.results) || discovery.results.some(c =>
    !c || typeof c !== 'object' || !Number.isSafeInteger(c.id) || c.id <= 0 ||
    typeof c.adult !== 'boolean' || typeof c.release_date !== 'string'
  )) throw new MovieProviderError('tmdb_schema')
  // One discovery +20 ID requests +20 rating requests stays below 50 subrequests.
  const candidates = (discovery.results as Candidate[]).filter(c => Number.isSafeInteger(c.id) && c.id > 0 && c.adult === false && c.release_date && c.release_date <= today).slice(0, 20)
  const rows: Row[] = []
  for (let start = 0; start < candidates.length; start += 4) {
    const batch = await Promise.all(candidates.slice(start, start + 4).map(async candidate => {
      const ids = await json(`https://api.themoviedb.org/3/movie/${candidate.id}/external_ids`, fetcher, env.TMDB_READ_TOKEN)
      if (ids.imdb_id === null) return null
      if (typeof ids.imdb_id !== 'string' || !/^tt\d{7,10}$/.test(ids.imdb_id)) throw new MovieProviderError('tmdb_schema')
      const query = new URLSearchParams({ i: ids.imdb_id, apikey: env.OMDB_API_KEY!, plot: 'short', r: 'json' })
      const details = await json(`https://www.omdbapi.com/?${query}`, fetcher)
      if (details.Response === 'False') {
        if (details.Error === 'Movie not found!') return null
        throw new MovieProviderError('omdb_response_rejected')
      }
      if (details.Response !== 'True' || details.imdbID !== ids.imdb_id ||
        ['Title', 'Year', 'Type', 'imdbRating', 'imdbVotes'].some(key => typeof details[key] !== 'string')) {
        throw new MovieProviderError('omdb_schema')
      }
      if ((details.imdbRating !== 'N/A' && (!/^\d+(\.\d+)?$/.test(String(details.imdbRating)) || Number(details.imdbRating) > 10)) ||
        (details.imdbVotes !== 'N/A' && !/^(?:\d{1,3}(?:,\d{3})*|\d+)$/.test(String(details.imdbVotes)))) {
        throw new MovieProviderError('omdb_schema')
      }
      return { candidate, details }
    }))
    rows.push(...batch.filter((row): row is Row => row !== null))
  }
  const movies = selectMovies(rows, today)
  if (!movies.length) throw new MovieProviderError('no_qualifying_movies', 'No qualifying movies returned')
  const catalog = { updatedAt: new Date().toISOString(), movies }
  await env.MOVIES_STORAGE.put('catalog', JSON.stringify(catalog))
  return catalog
}
