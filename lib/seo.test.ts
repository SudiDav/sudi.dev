import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './site'
import { buildSiteMetadata } from './seo'

describe('buildSiteMetadata', () => {
  it('publishes canonical identity and social metadata for the site', () => {
    const metadata = buildSiteMetadata(DEFAULT_SETTINGS)

    expect(metadata.metadataBase?.toString()).toBe('https://sudi.dev/')
    expect(metadata.title).toEqual({
      default: 'Sudi M. David — Full-Stack Engineer',
      template: '%s | Sudi M. David',
    })
    expect(metadata.alternates?.canonical).toBe('/')
    expect(metadata.authors).toEqual([{ name: 'Sudi M. David', url: 'https://sudi.dev' }])
    expect(metadata.openGraph).toMatchObject({
      type: 'website',
      url: '/',
      siteName: 'Sudi M. David',
    })
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' })
  })
})
