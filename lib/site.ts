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
  email: string
  bio: string
  location: string
  website: string
  social: { github: string; twitter: string; linkedin: string }
  seo: { title: string; description: string }
}

/** Used when the file is missing or unreadable, so the site still renders. */
export const DEFAULT_SETTINGS: SiteSettings = {
  displayName: 'Sudi David',
  avatar: '/images/generated-1784965046774.png',
  email: 'sudi@sudidavid.dev',
  bio: 'Full-stack engineer specializing in real-time systems, distributed architectures, and developer tooling.',
  location: 'San Francisco, CA',
  website: 'sudidavid.dev',
  social: {
    github: 'github.com/sudidavid',
    twitter: '@sudidavid',
    linkedin: 'linkedin.com/in/sudidavid',
  },
  seo: {
    title: 'Sudi David — Developer Portfolio',
    description: 'Full-stack engineer building real-time systems and developer tools.',
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
  const host = { github: 'github.com', twitter: 'twitter.com', linkedin: 'linkedin.com/in' }[kind]
  return `https://${host}/${handle}`
}
