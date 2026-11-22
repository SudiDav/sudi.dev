import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { SiteLocale } from './locale'

/**
 * Site settings live in `content/site.json`, alongside the MDX — the same
 * git-backed store, so editing them in the admin is the same kind of commit as
 * editing a post, and the file is versioned and reviewable.
 */
export type SiteSettings = {
  displayName: string
  /** Path under /public. There is no asset store yet, so this is a path, not an upload. */
  avatar: string
  /** The larger About-page portrait. Falls back to `avatar` when unset. */
  portrait?: string
  email: string
  bookingUrls?: Partial<Record<SiteLocale, string>>
  phone: string
  bio: string
  location: string
  website: string
  social: { github: string; twitter: string; linkedin: string; instagram?: string }
  seo: { title: string; description: string }
  writingProfile: { interests: string; styleGuidance: string }
}

export type SiteSettingsInput = Omit<
  Partial<SiteSettings>,
  'social' | 'seo' | 'writingProfile'
> & {
  social?: Partial<SiteSettings['social']>
  seo?: Partial<SiteSettings['seo']>
  writingProfile?: Partial<SiteSettings['writingProfile']>
}

/** Used when the file is missing or unreadable, so the site still renders. */
export const DEFAULT_SETTINGS: SiteSettings = {
  displayName: 'Sudi M. David',
  avatar: '/images/sudi.jpeg',
  email: 'hello@sudi.dev',
  phone: '+243 817 334 881',
  bio: 'Software engineer in Lubumbashi building applications, connecting systems, and helping teams run reliable software.',
  location: 'Lubumbashi, DRC',
  website: 'sudi.dev',
  social: {
    github: 'github.com/SudiDav',
    twitter: '@Sudi_Dav',
    linkedin: 'linkedin.com/in/sudidav',
    instagram: '@sudi_dav',
  },
  seo: {
    title: 'Sudi M. David — Software Engineer | DevOps & Cloud',
    description: 'Sudi M. David builds applications, connects systems, and helps teams improve the software they already use.',
  },
  writingProfile: {
    interests: '',
    styleGuidance: '',
  },
}

export const SITE_URL = 'https://sudi.dev'

export function mergeSiteSettings(parsed: SiteSettingsInput): SiteSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...parsed,
    social: { ...DEFAULT_SETTINGS.social, ...parsed.social },
    seo: { ...DEFAULT_SETTINGS.seo, ...parsed.seo },
    writingProfile: { ...DEFAULT_SETTINGS.writingProfile, ...parsed.writingProfile },
  }
}

export async function getSettings(): Promise<SiteSettings> {
  try {
    const raw = await readFile(join(process.cwd(), 'content', 'site.json'), 'utf8')
    const parsed = JSON.parse(raw) as SiteSettingsInput
    return mergeSiteSettings(parsed)
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function getLocalizedSiteSettings(locale: SiteLocale): Promise<SiteSettings> {
  const settings = await getSettings()
  if (locale === 'en') return settings

  return {
    ...settings,
    bio: 'Ingénieur logiciel à Lubumbashi. Je crée des applications, je relie des systèmes et j’aide les équipes à faire fonctionner leurs logiciels de manière fiable.',
    location: 'Lubumbashi, RDC',
    seo: {
      title: `${settings.displayName} — Ingénieur logiciel | DevOps et cloud`,
      description: 'Sudi M. David crée des applications, relie des systèmes et aide les équipes à améliorer les logiciels qu’elles utilisent au quotidien.',
    },
  }
}

export function getBookingUrl(settings: SiteSettings, locale: SiteLocale): string | undefined {
  const value = settings.bookingUrls?.[locale]
  if (typeof value !== 'string' || !value.trim()) return
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' && url.hostname === 'cal.com' && !url.username && !url.password &&
        /^\/[\w-]+\/[\w-]+\/?$/.test(url.pathname) && !url.port) {
      return url.href
    }
  } catch {
    return undefined
  }
}

/** A social handle as a URL — the settings store them as display strings. */
export function socialUrl(kind: keyof SiteSettings['social'], value: string): string {
  const handle = value.replace(/^@/, '').replace(/^https?:\/\//, '')
  if (handle.includes('/')) return `https://${handle}`
  const host = {
    github: 'github.com',
    twitter: 'x.com',
    linkedin: 'linkedin.com/in',
    instagram: 'instagram.com',
  }[kind]
  return `https://${host}/${handle}`
}
