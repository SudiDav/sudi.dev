import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePathname } from 'next/navigation'

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }))

import { SiteHeader } from '@/components/site-header'

describe('public site header navigation', () => {
  let markup: string

  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue('/blog/maybe-love-is-the-now')
    markup = renderToStaticMarkup(createElement(SiteHeader))
  })

  it('provides a collapsed mobile navigation disclosure with a stable panel target', () => {
    expect(markup).toMatch(/aria-label="Open navigation menu"/)
    expect(markup).toMatch(/aria-expanded="false"/)
    expect(markup).toMatch(/aria-controls="site-mobile-navigation"/)
    expect(markup).toMatch(/id="site-mobile-navigation"/)
  })

  it('marks the current room on a nested article and keeps the article search destination', () => {
    expect(markup).toMatch(/aria-current="page"[^>]*href="\/blog"/)
    expect(markup).toMatch(/aria-label="Search articles"[^>]*href="\/blog\?focus=search"/)
  })

  it.each([
    ['en', '/blog/maybe-love-is-the-now', 'fr', '/fr/blog/maybe-love-is-the-now', 'Français', 'English', 'Language', 'Toggle colour theme'],
    ['fr', '/fr/blog/maybe-love-is-the-now', 'en', '/blog/maybe-love-is-the-now', 'English', 'Français', 'Langue', 'Changer le thème'],
  ] as const)('shows both flags beside the %s theme toggle and links to the paired article', (locale, path, otherLocale, target, name, current, groupLabel, themeLabel) => {
    vi.mocked(usePathname).mockReturnValue(path)
    const header = renderToStaticMarkup(createElement<{ locale: typeof locale }>(SiteHeader, { locale }))
    const group = header.match(/<div role="group" aria-label="(?:Language|Langue)"[^>]*>.*?<\/div>/)?.[0] ?? ''

    expect(group).toContain(`aria-label="${groupLabel}"`)
    expect(group.match(/<svg\b[^>]*aria-hidden="true"/g)).toHaveLength(2)
    expect(group).toContain(`title="${current}" aria-current="true"`)
    expect(group.indexOf('title="English"')).toBeLessThan(group.indexOf('title="Français"'))
    expect(group).toContain(`href="${target}" hrefLang="${otherLocale}" lang="${otherLocale}" aria-label="${name}"`)
    expect(header.slice(header.indexOf(`aria-label="${themeLabel}"`))).toContain(`</button>${group}`)
  })
})
