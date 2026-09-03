import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

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
  bio: string
  location: string
  website: string
  social: { github: string; twitter: string; linkedin: string; instagram?: string }
  seo: { title: string; description: string }
}

/** Used when the file is missing or unreadable, so the site still renders. */
export const DEFAULT_SETTINGS: SiteSettings = {
  displayName: 'Sudi M. David',
  avatar: '/images/sudi.jpeg',
  email: 'contact@sudi.dev',
  bio: 'I build software that helps institutions operate—from fintech and lending platforms to agricultural value-chain tools and school administration systems.',
  location: 'Lubumbashi, DRC',
  website: 'sudi.dev',
  social: {
    github: 'github.com/SudiDav',
    twitter: '@Sudi_Dav',
    linkedin: 'linkedin.com/in/sudidav',
    instagram: '@sudi_dav',
  },
  seo: {
    title: 'Sudi M. David — Full-Stack Engineer',
    description: 'I build software that helps institutions operate—from fintech and lending platforms to agricultural value-chain tools and school administration systems.',
  },
}

export const SITE_URL = 'https://sudi.dev'

export async function getSettings(): Promise<SiteSettings> {
  try {
    const raw = await readFile(join(process.cwd(), 'content', 'site.json'), 'utf8')
    const parsed = JSON.parse(raw) as Partial<SiteSettings>
    // Shallow-merge so a partial file still yields a complete object.
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      social: { ...DEFAULT_SETTINGS.social, ...parsed.social },
      seo: { ...DEFAULT_SETTINGS.seo, ...parsed.seo },
    }
  } catch {
    return DEFAULT_SETTINGS
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
