import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PortfolioWorld } from '@/components/world/portfolio-world'

const markup = renderToStaticMarkup(createElement(PortfolioWorld))

describe('home orbit gallery room art', () => {
  it('keeps the architectural room behind the live transparent sculpture', () => {
    expect(markup).toContain('home-orbit-room')
    expect(markup).toContain('world-canvas')
  })

  it('shows the complete room still while WebGL is unavailable or loading', () => {
    expect(markup).toContain('home-orbit-still')
    expect(markup).toContain('world-fallback')
  })
})
