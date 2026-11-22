import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, getBookingUrl, mergeSiteSettings } from './site'

describe('mergeSiteSettings', () => {
  it('provides a default writing profile when it is missing', () => {
    const settings = mergeSiteSettings({ displayName: 'Sudi' })

    expect(settings.writingProfile).toEqual(DEFAULT_SETTINGS.writingProfile)
  })

  it('preserves untouched writing profile defaults when partially configured', () => {
    const settings = mergeSiteSettings({ writingProfile: { interests: 'Public services' } })

    expect(settings.writingProfile).toEqual({
      interests: 'Public services',
      styleGuidance: DEFAULT_SETTINGS.writingProfile.styleGuidance,
    })
  })

  it('continues to merge nested social and SEO defaults', () => {
    const settings = mergeSiteSettings({
      social: { github: 'github.com/custom' },
      seo: { title: 'Custom title' },
    })

    expect(settings.social).toEqual({ ...DEFAULT_SETTINGS.social, github: 'github.com/custom' })
    expect(settings.seo).toEqual({ ...DEFAULT_SETTINGS.seo, title: 'Custom title' })
  })
})

describe('public Cal.com event links', () => {
  it('selects the event for the current language and otherwise uses email', () => {
    const settings = mergeSiteSettings({ bookingUrls: { en: 'https://cal.com/example/project-call' } })
    expect(getBookingUrl(settings, 'en')).toBe('https://cal.com/example/project-call')
    expect(getBookingUrl(settings, 'fr')).toBeUndefined()
  })

  it.each([
    'https://cal.com/example',
    'http://cal.com/example/30min',
    'https://cal.com.example.com/example/30min',
    'https://user@cal.com/example/30min',
    'javascript:void(0)',
    'invalid',
  ])('uses email for a missing or invalid event URL %s', (url) => {
    expect(getBookingUrl(mergeSiteSettings({ bookingUrls: { fr: url } }), 'fr')).toBeUndefined()
  })
})
