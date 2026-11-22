import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FeaturedBlogCard } from '@/components/featured-blog-card'

const post = {
  slug: 'article-vedette',
  title: 'Un article en français',
  excerpt: 'Un résumé traduit.',
  date: '2026-10-02',
  readingTime: '5 min de lecture',
  category: 'Life',
  cover: '/images/blog/article.png',
  featured: true,
  tags: [],
  body: '',
}

describe('FeaturedBlogCard locale', () => {
  it('localizes the article path, accessible label and category in French', () => {
    const html = renderToStaticMarkup(
      createElement(FeaturedBlogCard, { post, locale: 'fr' }),
    )

    expect(html).toContain('href="/fr/blog/article-vedette"')
    expect(html).toContain('aria-label="Lire Un article en français"')
    expect(html).toContain('>Vie</span>')
    expect(html).toContain('Publié le')
    expect(html).not.toContain('Life')
  })

  it('keeps English links and labels as the default', () => {
    const html = renderToStaticMarkup(createElement(FeaturedBlogCard, { post }))

    expect(html).toContain('href="/blog/article-vedette"')
    expect(html).toContain('aria-label="Read Un article en français"')
    expect(html).toContain('>Life</span>')
    expect(html).toContain('Published')
  })
})
