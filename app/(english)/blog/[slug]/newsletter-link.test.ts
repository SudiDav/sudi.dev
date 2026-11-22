import { createElement, isValidElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next-mdx-remote/rsc', () => ({ MDXRemote: () => null }))
vi.mock('@/components/newsletter-form', () => ({ NewsletterForm: () => null }))

import { createMdxComponents, mdxComponents } from '@/components/article-body'
import { NewsletterLink } from '@/components/newsletter-link'

describe('article links', () => {
  it('turns a #newsletter link into the newsletter modal trigger', () => {
    const link = mdxComponents.a({ href: '#newsletter', children: 'join the newsletter' })
    expect(isValidElement(link) && link.type).toBe(NewsletterLink)
  })

  it('passes the French locale through to the newsletter modal trigger', () => {
    const link = createMdxComponents('fr').a({ href: '#newsletter', children: 'abonnez-vous' })
    expect(isValidElement(link) && link.type).toBe(NewsletterLink)
    expect(isValidElement<{ locale?: string }>(link) ? link.props.locale : undefined).toBe('fr')
  })

  it('keeps the no-JavaScript newsletter fallback in French', () => {
    const html = renderToStaticMarkup(
      createElement(NewsletterLink, { locale: 'fr' }, 'abonnez-vous'),
    )
    expect(html).toContain('href="/fr/blog"')
    expect(html).toContain('abonnez-vous')
  })

  it('keeps every other link a plain anchor', () => {
    const link = mdxComponents.a({ href: '/blog', children: 'the blog' })
    expect(isValidElement(link) && link.type).toBe('a')
  })
})
