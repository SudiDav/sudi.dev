import { afterEach, describe, expect, it, vi } from 'vitest'

const { getPublishedPosts } = vi.hoisted(() => ({ getPublishedPosts: vi.fn() }))

vi.mock('@/lib/content', () => ({ getPublishedPosts }))
vi.mock('@/lib/site', () => ({ SITE_URL: 'https://example.test' }))

import sitemap from './sitemap'

describe('sitemap', () => {
  afterEach(() => vi.clearAllMocks())

  it('includes both core page locales and only translated published articles with reciprocal alternates', async () => {
    getPublishedPosts.mockImplementation(async (locale: 'en' | 'fr' = 'en') =>
      locale === 'fr'
        ? [{ slug: 'paired-story', date: '2026-10-19' }]
        : [
            { slug: 'paired-story', date: '2026-10-19' },
            { slug: 'english-only', date: '2026-10-18' },
          ],
    )

    const entries = await sitemap()
    const byUrl = new Map(entries.map((entry) => [entry.url, entry]))

    for (const path of ['/', '/work', '/about', '/blog', '/privacy']) {
      const english = byUrl.get(`https://example.test${path}`)
      const french = byUrl.get(`https://example.test/fr${path === '/' ? '' : path}`)
      expect(english?.alternates?.languages).toEqual({
        en: `https://example.test${path}`,
        fr: `https://example.test/fr${path === '/' ? '' : path}`,
      })
      expect(french?.alternates?.languages).toEqual(english?.alternates?.languages)
    }

    expect(byUrl.get('https://example.test/fr/blog/paired-story')?.alternates?.languages).toEqual({
      en: 'https://example.test/blog/paired-story',
      fr: 'https://example.test/fr/blog/paired-story',
    })
    expect(byUrl.get('https://example.test/blog/paired-story')?.alternates?.languages).toEqual({
      en: 'https://example.test/blog/paired-story',
      fr: 'https://example.test/fr/blog/paired-story',
    })
    expect(byUrl.has('https://example.test/fr/blog/english-only')).toBe(false)
    expect(byUrl.has('https://example.test/blog/english-only')).toBe(true)
    expect(getPublishedPosts).toHaveBeenCalledWith('en')
    expect(getPublishedPosts).toHaveBeenCalledWith('fr')
  })
})
