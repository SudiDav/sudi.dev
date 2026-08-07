/**
 * Theme preference: an explicit choice, or follow the OS.
 *
 * "system" is a real third state, not the absence of a choice — once someone
 * picks dark or light there has to be a way back to following the OS, which a
 * two-state toggle cannot express.
 */
export type ThemePreference = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'theme'

/** Applied to <html>: `.light` for the public site, `.dark-admin` for the admin. */
export const LIGHT_CLASS = 'light'
export const DARK_ADMIN_CLASS = 'dark-admin'

/**
 * Runs before first paint, inlined in <head>.
 *
 * It has to be a string rather than an imported function: anything bundled runs
 * after hydration, by which point the wrong theme has already been painted.
 *
 * The admin inverts: its default is light (the design's only admin frames), so
 * `.dark-admin` is added when resolving to dark, while the public site defaults
 * to dark and adds `.light`.
 */
export const themeBootstrapScript = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var pref = stored === 'light' || stored === 'dark' ? stored : 'system';
    var resolved =
      pref === 'system'
        ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
        : pref;
    var root = document.documentElement;
    root.classList.toggle('${LIGHT_CLASS}', resolved === 'light');
    root.classList.toggle('${DARK_ADMIN_CLASS}', resolved === 'dark');
  } catch (e) {}
})();
`

export function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference !== 'system') return preference
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

/**
 * Apply a preference and persist it.
 *
 * Transitions are suppressed for one frame around the swap: flipping the colour
 * custom properties under every element at once leaves anything mid
 * `transition-colors` interpolating from its old value, and elements that
 * already existed can wedge partway.
 */
export function applyPreference(preference: ThemePreference) {
  const root = document.documentElement
  const resolved = resolveTheme(preference)

  root.classList.add('theme-switching')
  root.classList.toggle(LIGHT_CLASS, resolved === 'light')
  root.classList.toggle(DARK_ADMIN_CLASS, resolved === 'dark')

  try {
    if (preference === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
    else localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // A blocked localStorage should not stop the theme from applying.
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.remove('theme-switching'))
  })
}

/**
 * Keep the page in step with the OS while the preference is "system".
 * Returns an unsubscribe function.
 */
export function watchSystemTheme(onChange: () => void): () => void {
  const query = window.matchMedia('(prefers-color-scheme: light)')
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
