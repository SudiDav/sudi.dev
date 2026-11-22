import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/content', () => ({
  getPublishedPosts: vi.fn().mockResolvedValue([
    {
      slug: 'article-en-vedette',
      title: 'Article en vedette',
      excerpt: 'Résumé de la vedette.',
      date: '2026-10-02',
      readingTime: '5 min de lecture',
      category: 'Life',
      cover: '/images/blog/article.png',
      featured: true,
      tags: ['Philosophy', 'Life', 'Presence', 'Career', 'Distributed Systems', 'Messaging'],
      body: 'Contenu vedette.',
    },
    {
      slug: 'article-francais',
      title: 'Un article en français',
      excerpt: 'Un résumé traduit.',
      date: '2026-10-01',
      readingTime: '4 min de lecture',
      category: 'Craft',
      cover: '/images/blog/article.png',
      featured: false,
      tags: [],
      body: 'Contenu traduit.',
    },
  ]),
}))
vi.mock('@/components/site-header', () => ({ SiteHeader: () => null }))
vi.mock('@/components/site-footer', () => ({ SiteFooter: () => null }))
vi.mock('@/components/blog-search', () => ({
  BlogSearch: ({ locale, query }: { locale: string; query: string }) =>
    createElement('input', { 'aria-label': locale === 'fr' ? 'Rechercher des articles' : 'Search articles', defaultValue: query }),
}))
vi.mock('@/components/filter-bar', () => ({
  FilterBar: ({ label, labels }: { label: string; labels?: Record<string, string> }) =>
    createElement('div', { 'aria-label': label }, labels?.Craft),
}))
vi.mock('@/components/newsletter-form', () => ({
  NewsletterForm: ({ locale }: { locale: string }) => createElement('div', { 'data-newsletter-locale': locale }),
}))
vi.mock('@/components/featured-blog-card', () => ({
  FeaturedBlogCard: ({ post, locale }: { post: { slug: string; title: string }; locale: string }) =>
    createElement('a', { href: `${locale === 'fr' ? '/fr' : ''}/blog/${post.slug}` }, post.title),
}))
vi.mock('@/components/tech-badge', () => ({
  TechBadge: ({ label }: { label: string }) => createElement('span', null, label),
}))
vi.mock('@/components/layout', () => ({ PAGE_GUTTER: '' }))

import FrenchBlogPage, { metadata } from './page'
import { tagLabel } from '../../(english)/blog/views'
import { getPublishedPosts } from '@/lib/content'

describe('French blog index', () => {
  it('loads French posts and renders translated blog controls and links', async () => {
    const html = renderToStaticMarkup(
      await FrenchBlogPage({ searchParams: Promise.resolve({}) }),
    )

    expect(getPublishedPosts).toHaveBeenCalledWith('fr')
    expect(html).toContain('Des réflexions sur les logiciels')
    expect(html).toContain('Articles récents')
    expect(html).toContain('Rechercher des articles')
    expect(html).toContain('Filtrer les articles par catégorie')
    expect(html).toContain('Pratiques')
    expect(html).toContain('Un article en français')
    expect(html).toContain('Présence')
    expect(html).toContain('Carrière')
    expect(html).toContain('Systèmes distribués')
    expect(html).toContain('Messagerie')
    expect(html).toContain('Philosophie')
    expect(html).toContain('Vie')
    expect(html).toContain('href="/fr/blog/article-francais"')
    expect(html).toContain('data-newsletter-locale="fr"')
    expect(html).not.toContain('No articles match that search yet.')
  })

  it('localizes human-language tags while retaining technical names', () => {
    expect([
      'Action', 'Africa', 'AI', 'Attention', 'Career', 'Communication', 'Distributed Systems',
      'Faith', 'Focus', 'Life', 'Messaging', 'Observability', 'Performance', 'Philosophy',
      'Presence', 'Tracing',
    ].map((tag) => tagLabel(tag, 'fr'))).toEqual([
      'Action', 'Afrique', 'IA', 'Attention', 'Carrière', 'Communication', 'Systèmes distribués',
      'Foi', 'Concentration', 'Vie', 'Messagerie', 'Observabilité', 'Performance', 'Philosophie',
      'Présence', 'Traçage',
    ])
    expect(tagLabel('PostgreSQL', 'fr')).toBe('PostgreSQL')
    expect(tagLabel('Performance', 'en')).toBe('Performance')
  })

  it('sets a canonical French URL and reciprocal language alternates', () => {
    expect(metadata.alternates).toMatchObject({
      canonical: '/fr/blog',
      languages: { en: '/blog', fr: '/fr/blog' },
    })
  })
})
