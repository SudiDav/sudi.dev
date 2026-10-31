const movieCopy = {
  en: { heading: 'A good story is waiting.', label: 'Highly rated movies', nav: 'Movie picks',
    intro: 'Movies worth making time for. IMDb scores of 7 or higher, with at least 10,000 votes.',
    preparing: 'Our movie picks are being prepared. Check back soon.', loading: 'Finding a few good stories…', error: 'Movie picks are temporarily unavailable. Please try again shortly.',
    empty: 'New movie picks are on their way.', retry: 'Try again', details: 'View on IMDb', votes: 'votes',
    updated: 'Ratings checked', stale: 'Showing our last saved picks. Ratings may have changed.',
    scope: 'A selection discovered with TMDB, ranked by IMDb score. Availability depends on your streaming services.',
    credits: 'Movie information and ratings via OMDb. Posters and discovery from TMDB.',
    noPoster: 'Poster unavailable', noPlot: 'Discover more about this film on IMDb.' },
  fr: { heading: 'Une belle histoire vous attend.', label: 'Les films les mieux notés', nav: 'Idées de films',
    intro: 'Des films qui méritent votre soirée. Une note IMDb de 7 ou plus et au moins 10 000 votes.',
    preparing: 'Nous préparons notre sélection de films. Revenez bientôt.', loading: 'À la recherche de belles histoires…', error: 'Les suggestions sont momentanément indisponibles. Réessayez dans quelques instants.',
    empty: 'De nouvelles suggestions arrivent bientôt.', retry: 'Réessayer', details: 'Voir sur IMDb', votes: 'votes',
    updated: 'Notes vérifiées le', stale: 'Nous affichons la dernière sélection enregistrée. Les notes ont pu évoluer.',
    scope: 'Une sélection découverte avec TMDB, classée par note IMDb. La disponibilité dépend de vos services de streaming.',
    credits: 'Informations et notes via OMDb. Affiches et découverte via TMDB.',
    noPoster: 'Affiche indisponible', noPlot: 'Découvrez ce film sur IMDb.' },
}
const grid = document.querySelector('#movie-grid')
const message = document.querySelector('#movie-message')
const retry = document.querySelector('#movie-retry')
const updated = document.querySelector('#movie-updated')
let catalog = null
let state = 'loading'
let pending = false
function element(tag, className, content) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (content) node.textContent = content
  return node
}
function renderMovies() {
  const lang = document.documentElement.lang === 'fr' ? 'fr' : 'en'
  const t = movieCopy[lang]
  document.querySelectorAll('[data-movie-t]').forEach(node => { node.textContent = t[node.dataset.movieT] })
  grid.replaceChildren()
  message.textContent = state === 'ready' ? (catalog.stale ? t.stale : '') : t[state]
  retry.hidden = !['error', 'preparing'].includes(state)
  updated.textContent = catalog ? `${t.updated} ${new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(new Date(catalog.updatedAt))}` : ''
  if (!catalog) return
  for (const movie of catalog.movies) {
    if (!/^tt\d{7,10}$/.test(movie.imdbId) || !Number.isFinite(movie.rating) || movie.rating < 7 || movie.rating > 10 || movie.votes < 10000) continue
    const card = element('article', 'movie-card')
    const posterLink = element('a', 'movie-poster')
    posterLink.href = `https://www.imdb.com/title/${movie.imdbId}/`
    posterLink.target = '_blank'; posterLink.rel = 'noopener noreferrer'
    posterLink.setAttribute('aria-label', `${movie.title} — ${t.details}`)
    if (typeof movie.poster === 'string' && /^https:\/\/image\.tmdb\.org\/t\/p\/w342\/[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(movie.poster)) {
      const img = document.createElement('img')
      img.src = movie.poster; img.alt = ''; img.loading = 'lazy'; img.width = 342; img.height = 513
      img.addEventListener('error', () => { img.replaceWith(element('span', 'movie-poster-fallback', t.noPoster)) }, { once: true })
      posterLink.append(img)
    } else posterLink.append(element('span', 'movie-poster-fallback', t.noPoster))
    const score = element('span', 'movie-score', `★ ${movie.rating.toFixed(1)} / 10`)
    score.setAttribute('aria-label', `IMDb ${movie.rating.toFixed(1)} / 10`)
    posterLink.append(score)
    card.append(posterLink, element('p', 'movie-year', `${movie.year} · ${new Intl.NumberFormat(lang).format(movie.votes)} ${t.votes}`),
      element('h3', '', movie.title), element('p', 'movie-genre', movie.genre === 'N/A' ? '' : movie.genre),
      element('p', 'movie-overview', movie.overview && movie.overview !== 'N/A' ? movie.overview : t.noPlot))
    const link = element('a', 'plain-link', `${t.details} ↗`)
    link.href = posterLink.href; link.target = '_blank'; link.rel = 'noopener noreferrer'
    card.append(link); grid.append(card)
  }
}
async function loadMovies() {
  if (pending) return
  pending = true; state = 'loading'; renderMovies()
  grid.setAttribute('aria-busy', 'true')
  try {
    const response = await fetch('/api/movies', { signal: AbortSignal.timeout(12000) })
    if (!response.ok) {
      const failure = await response.json().catch(() => ({}))
      state = failure.code === 'catalog_pending' ? 'preparing' : 'error'
      return
    }
    const data = await response.json()
    if (!Array.isArray(data.movies) || !Number.isFinite(Date.parse(data.updatedAt))) throw new Error('Invalid catalog')
    catalog = data; state = data.movies.length ? 'ready' : 'empty'
  } catch { state = 'error' }
  finally { pending = false; grid.setAttribute('aria-busy', 'false'); renderMovies() }
}
retry.addEventListener('click', loadMovies)
new MutationObserver(renderMovies).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
loadMovies()
