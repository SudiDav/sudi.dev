import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ usePathname: () => '/blog/maybe-love-is-the-now' }))

import { SiteHeader } from '@/components/site-header'

describe('public site header navigation', () => {
  let markup: string

  beforeEach(() => {
    markup = renderToStaticMarkup(createElement(SiteHeader))
  })

  it('provides a collapsed mobile navigation disclosure with a stable panel target', () => {
    expect(markup).toMatch(/aria-label="Open navigation menu"/)
    expect(markup).toMatch(/aria-expanded="false"/)
    expect(markup).toMatch(/aria-controls="site-mobile-navigation"/)
    expect(markup).toMatch(/id="site-mobile-navigation"/)
  })

  it('marks the current room on a nested article and keeps the article search destination', () => {
    expect(markup).toMatch(/aria-current="page"[^>]*href="\/blog"/)
    expect(markup).toMatch(/aria-label="Search articles"[^>]*href="\/blog\?focus=search"/)
  })
})
