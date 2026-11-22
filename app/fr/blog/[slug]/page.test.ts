import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/content', () => ({
  getPublishedPost: vi.fn(async (slug: string, locale = 'en') => ({
    slug,
    title: locale === 'fr' ? 'Un article en français' : 'An English article',
    excerpt: locale === 'fr' ? 'Résumé en français.' : 'An English summary.',
    date: '2026-10-01',
    readingTime: locale === 'fr' ? '4 min de lecture' : '4 min read',
    category: 'Craft',
    cover: '/images/blog/article.png',
    featured: false,
    tags: [],
    body: locale === 'fr' ? 'Texte français.' : 'English text.',
  })),
  getPublishedPosts: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/lib/site', () => ({
  getSettings: vi.fn(),
  getLocalizedSiteSettings: vi.fn().mockResolvedValue({
    displayName: 'Sudi M. David',
    avatar: '/images/sudi.jpeg',
    email: 'hello@sudi.dev',
    bio: 'Ingénieur logiciel.',
    social: { github: 'github.com/SudiDav', twitter: '@Sudi_Dav' },
  }),
  socialUrl: (_kind: string, value: string) => `https://${value.replace(/^@/, 'x.com/')}`,
}))
vi.mock('@/components/site-header', () => ({ SiteHeader: () => null }))
vi.mock('@/components/site-footer', () => ({ SiteFooter: () => null }))
vi.mock('@/components/article-body', () => ({
  ArticleBody: ({ locale, body }: { locale: string; body: string }) => createElement('div', { 'data-body-locale': locale }, body),
}))
vi.mock('@/components/article-comments', () => ({
  ArticleComments: ({ locale, slug }: { locale: string; slug: string }) =>
    createElement('section', { 'data-comments-locale': locale, 'data-comments-slug': slug }),
}))
vi.mock('@/components/newsletter-form', () => ({ NewsletterForm: () => null }))
vi.mock('@/components/article-item', () => ({ ArticleItem: () => null }))

import FrenchArticlePage, { generateMetadata, generateStaticParams } from './page'
import { getPublishedPost, getPublishedPosts } from '@/lib/content'

describe('French article page', () => {
  it('renders localized article labels, content and related links', async () => {
    const html = renderToStaticMarkup(
      await FrenchArticlePage({ params: Promise.resolve({ slug: 'article-francais' }) }),
    )

    expect(html).toContain('Un article en français')
    expect(html).toContain('4 min de lecture')
    expect(html).toContain('ÉCRIT PAR')
    expect(html).toContain('data-body-locale="fr"')
    expect(html).toContain('Texte français.')
    expect(html).toContain('data-comments-locale="fr"')
    expect(html).toContain('data-comments-slug="article-francais"')
    expect(html).toContain('Articles similaires')
    expect(html).toContain('href="/fr/blog"')
    expect(getPublishedPost).toHaveBeenCalledWith('article-francais', 'fr')
  })

  it('generates metadata and static params only for published French translations', async () => {
    vi.mocked(getPublishedPosts).mockResolvedValueOnce([{ slug: 'article-francais' } as never])
    expect(await generateStaticParams()).toEqual([{ slug: 'article-francais' }])

    const result = await generateMetadata({ params: Promise.resolve({ slug: 'article-francais' }) })
    expect(result.alternates).toMatchObject({
      canonical: '/fr/blog/article-francais',
      languages: { en: '/blog/article-francais', fr: '/fr/blog/article-francais' },
    })
  })
})
