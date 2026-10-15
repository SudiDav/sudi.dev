import { Children, isValidElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/content', () => ({
  getPublishedPosts: vi.fn().mockResolvedValue([
    {
      slug: 'post',
      title: 'First query wins',
      excerpt: 'A test post',
      category: 'Craft',
      readingTime: '4 min read',
      tags: [],
      featured: false,
    },
  ]),
}))
vi.mock('@/components/site-header', () => ({ SiteHeader: () => null }))
vi.mock('@/components/site-footer', () => ({ SiteFooter: () => null }))
vi.mock('@/components/page-intro', () => ({ PageIntro: () => null }))
vi.mock('@/components/filter-bar', () => ({ FilterBar: () => null }))
vi.mock('@/components/blog-search', () => ({ BlogSearch: () => null }))
vi.mock('@/components/featured-blog-card', () => ({ FeaturedBlogCard: () => null }))
vi.mock('@/components/article-item', () => ({ ArticleItem: () => null }))
vi.mock('@/components/tech-badge', () => ({ TechBadge: () => null }))
vi.mock('@/components/newsletter-form', () => ({ NewsletterForm: () => null }))
vi.mock('@/components/layout', () => ({ PAGE_GUTTER: '' }))

import { BlogSearch } from '@/components/blog-search'
import BlogPage from './page'

function findBlogSearchQuery(node: unknown): string | undefined {
  if (!isValidElement<{ children?: ReactNode; query?: string }>(node)) return undefined
  if (node.type === BlogSearch) return node.props.query

  for (const child of Children.toArray(node.props.children)) {
    const query = findBlogSearchQuery(child)
    if (query !== undefined) return query
  }
}

describe('BlogPage search query boundary', () => {
  it('uses the first value when q is repeated', async () => {
    const page = await BlogPage({ searchParams: Promise.resolve({ q: ['first', 'second'] }) })

    expect(findBlogSearchQuery(page)).toBe('first')
  })

  it('uses an empty query when a repeated q has no values', async () => {
    const page = await BlogPage({ searchParams: Promise.resolve({ q: [] }) })

    expect(findBlogSearchQuery(page)).toBe('')
  })
})
