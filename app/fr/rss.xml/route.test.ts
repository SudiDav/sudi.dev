import { afterEach, describe, expect, it, vi } from 'vitest'

const { getPublishedPosts, getLocalizedSiteSettings } = vi.hoisted(() => ({
  getPublishedPosts: vi.fn(),
  getLocalizedSiteSettings: vi.fn(),
}))

vi.mock('@/lib/content', () => ({ getPublishedPosts }))
vi.mock('@/lib/site', () => ({
  SITE_URL: 'https://example.test',
  getLocalizedSiteSettings,
}))

import { GET } from './route'

describe('French RSS route', () => {
  afterEach(() => vi.clearAllMocks())

  it('returns a French feed with translated metadata and canonical French article URLs', async () => {
    getPublishedPosts.mockResolvedValue([
      {
        title: 'Un article traduit',
        excerpt: 'Une description en français.',
        slug: 'paired-story',
        date: '2026-10-19',
      },
    ])
    getLocalizedSiteSettings.mockResolvedValue({
      displayName: 'Sudi M. David',
      seo: { description: 'Des articles sur le développement logiciel.' },
    })

    const response = await GET()
    const xml = await response.text()

    expect(getPublishedPosts).toHaveBeenCalledWith('fr')
    expect(getLocalizedSiteSettings).toHaveBeenCalledWith('fr')
    expect(response.headers.get('Content-Type')).toBe('application/rss+xml; charset=utf-8')
    expect(xml).toContain('<title>Sudi M. David</title>')
    expect(xml).toContain('<description>Des articles sur le développement logiciel.</description>')
    expect(xml).toContain('<link>https://example.test/fr</link>')
    expect(xml).toContain('<language>fr</language>')
    expect(xml).toContain('href="https://example.test/fr/rss.xml"')
    expect(xml).toContain('<link>https://example.test/fr/blog/paired-story</link>')
    expect(xml).toContain('<guid isPermaLink="true">https://example.test/fr/blog/paired-story</guid>')
    expect(xml).toContain('<title>Un article traduit</title>')
    expect(xml).toContain('<description>Une description en français.</description>')
    expect(xml).not.toContain('english-only')
  })
})
