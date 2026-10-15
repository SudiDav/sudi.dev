import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, mergeSiteSettings } from './site'

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
