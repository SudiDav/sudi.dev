import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FeaturedBlogCard } from './featured-blog-card'

describe('featured article book', () => {
  it('binds the long live title, cover, and destination to one accessible link', () => {
    const title = 'A long field note about building systems that keep working when everything changes'
    const html = renderToStaticMarkup(
      createElement(FeaturedBlogCard, {
        post: {
          slug: 'feature-changed',
          title,
          excerpt: 'An honest account of the work.',
          date: '2026-10-01',
          readingTime: '8 min read',
          category: 'Craft',
          cover: '/images/blog/now.png',
          featured: true,
          body: '',
        },
      }),
    )

    expect(html).toContain('href="/blog/feature-changed"')
    expect(html).toContain(title)
    expect(html).toContain('%2Fimages%2Fblog%2Fnow.png')
    expect(html).toContain('aria-label="Read ' + title + '"')
  })
})
