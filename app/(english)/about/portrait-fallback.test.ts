import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/site', () => ({
  getSettings: vi.fn().mockResolvedValue({
    displayName: 'Sudi M. David',
    avatar: '/images/fallback-avatar.png',
    portrait: undefined,
    email: 'contact@sudi.dev',
    phone: '+243 817 334 881',
    bio: 'Software engineer.',
    location: 'Lubumbashi, DRC',
    website: 'sudi.dev',
    social: { github: 'github.com/SudiDav', twitter: '@Sudi_Dav', linkedin: 'linkedin.com/in/sudidav' },
  }),
  socialUrl: (_kind: string, value: string) => `https://${value}`,
}))
vi.mock('@/components/site-header', () => ({ SiteHeader: () => null }))
vi.mock('@/components/site-footer', () => ({ SiteFooter: () => null }))
vi.mock('@/components/location-badge', () => ({ LocationBadge: () => null }))
vi.mock('@/components/career-stepper/career-stepper', () => ({ CareerStepper: () => null }))
vi.mock('@/components/outbound-link', () => ({
  OutboundLink: ({ children }: { children: ReactNode }) => createElement('span', null, children),
}))

import AboutPage from './page'

describe('portrait studio fallback', () => {
  it('uses the configured avatar when no separate portrait is configured', async () => {
    const html = renderToStaticMarkup(await AboutPage())

    expect(html).toContain('about-portrait-studio__opening')
    expect(html).toContain('%2Fimages%2Ffallback-avatar.png')
    expect(html).not.toContain('data-portrait-relief')
  })
})
