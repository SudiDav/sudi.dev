import { isValidElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next-mdx-remote/rsc', () => ({ MDXRemote: () => null }))
vi.mock('@/components/newsletter-form', () => ({ NewsletterForm: () => null }))

import { mdxComponents } from '@/components/article-body'
import { NewsletterLink } from '@/components/newsletter-link'

describe('article links', () => {
  it('turns a #newsletter link into the newsletter modal trigger', () => {
    const link = mdxComponents.a({ href: '#newsletter', children: 'join the newsletter' })
    expect(isValidElement(link) && link.type).toBe(NewsletterLink)
  })

  it('keeps every other link a plain anchor', () => {
    const link = mdxComponents.a({ href: '/blog', children: 'the blog' })
    expect(isValidElement(link) && link.type).toBe('a')
  })
})
