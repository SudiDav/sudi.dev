import { afterEach, describe, expect, it, vi } from 'vitest'

const { getPublishedPosts, getSettings } = vi.hoisted(() => ({
  getPublishedPosts: vi.fn(),
  getSettings: vi.fn(),
}))

vi.mock('@/lib/content', () => ({ getPublishedPosts }))
vi.mock('@/lib/site', () => ({
  SITE_URL: 'https://example.test',
  getSettings,
}))

import { GET } from './route'

describe('RSS route', () => {
  afterEach(() => vi.clearAllMocks())

  it('returns valid XML text for escaped settings and post content', async () => {
    getPublishedPosts.mockResolvedValue([
      {
        title: 'A & B <News>',
        excerpt: 'A safe ]]> payload & details',
        slug: 'safe-feed',
        date: '2026-10-15',
      },
    ])
    getSettings.mockResolvedValue({
      displayName: 'Sudi & Friends <Feed>',
      seo: { description: 'A & B <C>' },
    })

    const response = await GET()
    const xml = await response.text()

    expect(response.headers.get('Content-Type')).toBe('application/rss+xml; charset=utf-8')
    expect(xml).toContain('<title>Sudi &amp; Friends &lt;Feed&gt;</title>')
    expect(xml).toContain('<description>A &amp; B &lt;C&gt;</description>')
    expect(xml).toContain('<title>A &amp; B &lt;News&gt;</title>')
    expect(xml).toContain('<description>A safe ]]&gt; payload &amp; details</description>')
    expect(xml).toContain('<link>https://example.test/blog/safe-feed</link>')
    expect(xml).toContain('<guid isPermaLink="true">https://example.test/blog/safe-feed</guid>')
    expect(xml).toContain('<pubDate>Thu, 15 Oct 2026 00:00:00 GMT</pubDate>')
    expect(xml).not.toContain('<![CDATA[')
  })

  it('returns a valid empty feed for an unknown/no-post result', async () => {
    getPublishedPosts.mockResolvedValue([])
    getSettings.mockResolvedValue({ displayName: 'Feed', seo: { description: 'Latest posts' } })

    const response = await GET()
    const xml = await response.text()

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">')
    expect(xml).toContain(
      '<atom:link href="https://example.test/rss.xml" rel="self" type="application/rss+xml" />',
    )
    expect(xml).toContain('<title>Feed</title>')
    expect(xml).not.toContain('<item>')
    expect(xml).toContain('</channel>\n</rss>')
  })
})
