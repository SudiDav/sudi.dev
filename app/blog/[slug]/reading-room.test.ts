import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/content', () => ({
  getPublishedPost: vi.fn().mockResolvedValue({
    slug: 'room-test',
    title: 'A live article title',
    excerpt: 'A test excerpt',
    subtitle: 'A quiet reading page',
    date: '2026-10-01',
    readingTime: '4 min read',
    category: 'Craft',
    cover: '/images/blog/now.png',
    featured: true,
    tags: [],
    body: 'A small published article.',
  }),
  getPublishedPosts: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/lib/site', () => ({
  getSettings: vi.fn().mockResolvedValue({
    displayName: 'Sudi M. David',
    avatar: '/images/sudi.jpeg',
    email: 'contact@sudi.dev',
    bio: 'Software engineer.',
    social: { github: 'github.com/SudiDav', twitter: '@Sudi_Dav' },
  }),
  socialUrl: (_kind: string, value: string) => `https://${value.replace(/^@/, 'x.com/')}`,
}))
vi.mock('@/components/article-body', () => ({
  ArticleBody: ({ body }: { body: string }) => createElement('div', null, body),
}))
vi.mock('@/components/article-comments', () => ({
  ArticleComments: () => createElement('section', { 'data-comments-enabled': true }, 'Comments'),
}))
vi.mock('@/components/site-header', () => ({ SiteHeader: () => null }))
vi.mock('@/components/site-footer', () => ({ SiteFooter: () => null }))
vi.mock('@/components/article-item', () => ({ ArticleItem: () => null }))

import ArticlePage from './page'

describe('article reading room', () => {
  it('renders the published post in its reading layout with its actual cover', async () => {
    const html = renderToStaticMarkup(
      await ArticlePage({ params: Promise.resolve({ slug: 'room-test' }) }),
    )

    expect(html).toContain('article-reading-room__paper')
    expect(html).toContain('A live article title')
    expect(html).toContain('%2Fimages%2Fblog%2Fnow.png')
    expect(html).toContain('data-comments-enabled')
  })
})
