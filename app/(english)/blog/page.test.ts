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
import { ArticleItem } from '@/components/article-item'
import { FeaturedBlogCard } from '@/components/featured-blog-card'
import { getPublishedPosts } from '@/lib/content'
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

  it('provides a reading desk composition for the live featured post', async () => {
    const page = await BlogPage({ searchParams: Promise.resolve({}) })

    expect(findClassName(page, 'reading-desk-page')).toBe(true)
  })

  it('keeps regular articles available when no post is featured', async () => {
    const page = await BlogPage({ searchParams: Promise.resolve({}) })

    expect(findElementType(page, ArticleItem)).toBe(true)
  })

  it('passes a changed featured post title and cover together to the book link', async () => {
    const title = 'A long title that should stay attached to its cover and destination'
    vi.mocked(getPublishedPosts).mockResolvedValueOnce([
      {
        slug: 'changed-feature', title, excerpt: 'A changed featured post.', date: '2026-10-10',
        readingTime: '8 min read', category: 'Craft', cover: '/images/blog/now.png', featured: true,
        tags: [], body: '',
      },
      {
        slug: 'recent-note', title: 'A recent note', excerpt: 'A recent post.', date: '2026-10-09',
        readingTime: '4 min read', category: 'Life', cover: '/images/blog/now.png', featured: false,
        tags: [], body: '',
      },
    ])
    const page = await BlogPage({ searchParams: Promise.resolve({}) })
    const book = findElementProps(page, FeaturedBlogCard)

    expect(book?.post).toMatchObject({
      slug: 'changed-feature',
      title,
      cover: '/images/blog/now.png',
    })
  })
})

function findClassName(node: unknown, expected: string): boolean {
  if (!isValidElement<{ children?: ReactNode; className?: string }>(node)) return false
  if (node.props.className?.split(/\s+/).includes(expected)) return true

  return Children.toArray(node.props.children).some((child) => findClassName(child, expected))
}

function findElementType(node: unknown, expectedType: unknown): boolean {
  if (!isValidElement<{ children?: ReactNode }>(node)) return false
  if (node.type === expectedType) return true
  return Children.toArray(node.props.children).some((child) => findElementType(child, expectedType))
}

function findElementProps(node: unknown, expectedType: unknown): Record<string, unknown> | undefined {
  if (!isValidElement<{ children?: ReactNode }>(node)) return undefined
  if (node.type === expectedType) return node.props
  for (const child of Children.toArray(node.props.children)) {
    const props = findElementProps(child, expectedType)
    if (props) return props
  }
}
