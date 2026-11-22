import type { Metadata } from 'next'

export type SiteLocale = 'en' | 'fr'

export function localePath(locale: SiteLocale, path: string): string {
  return locale === 'en' ? path : path === '/' ? '/fr' : `/fr${path}`
}

export function publicPath(pathname: string): string {
  return pathname.replace(/^\/fr(?=\/|$)/, '') || '/'
}

export function languageAlternates(path: string) {
  return { en: path, fr: localePath('fr', path) }
}

export function localizedMetadata(
  locale: SiteLocale,
  path: string,
  title: string,
  description: string,
  paired = true,
): Metadata {
  const canonical = localePath(locale, path)
  return {
    title,
    description,
    alternates: { canonical, languages: paired ? languageAlternates(path) : undefined },
    openGraph: {
      type: 'website',
      title,
      description,
      url: canonical,
      locale: locale === 'fr' ? 'fr_CD' : 'en_US',
      alternateLocale: paired ? (locale === 'fr' ? 'en_US' : 'fr_CD') : undefined,
    },
  }
}
