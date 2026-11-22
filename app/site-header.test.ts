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
    ['en', '/blog/maybe-love-is-the-now', 'fr', '/fr/blog/maybe-love-is-the-now', 'Français', 'Toggle colour theme'],
    ['fr', '/fr/blog/maybe-love-is-the-now', 'en', '/blog/maybe-love-is-the-now', 'English', 'Changer le thème'],
  ] as const)('puts the flag beside the %s theme toggle and links to the paired article', (locale, path, otherLocale, target, name, themeLabel) => {
    vi.mocked(usePathname).mockReturnValue(path)
    const header = renderToStaticMarkup(createElement<{ locale: typeof locale }>(SiteHeader, { locale }))
    const languageLinks = header.match(/<a\b[^>]*\bhreflang="[^"]+"[^>]*>.*?<\/a>/gi) ?? []
    expect(languageLinks).toHaveLength(1)

    const [flag] = languageLinks
    expect(flag).toContain(`href="${target}"`)
    expect(flag).toContain(`lang="${otherLocale}"`)
    expect(flag).toContain(`aria-label="${name}"`)
    expect(flag).toMatch(/<svg\b[^>]*aria-hidden="true"/)
    expect(flag).not.toContain(`>${name}<`)
    expect(header.slice(header.indexOf(`aria-label="${themeLabel}"`))).toContain(`</button>${flag}`)
  })
})
