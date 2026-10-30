import { describe, it, expect } from 'vitest'
import { isExternal } from '@/components/outbound-link'

/**
 * Every link that leaves the site must open in a new tab.
 *
 * This is asserted against the rendered source of every page rather than by
 * reviewing components, because the rule is easy to satisfy in one place and
 * miss in another — it has already been missed on a hardcoded author card and a
 * booking button. Reading the shipped HTML is the only check that covers links
 * wherever they came from, including MDX bodies written later through the admin.
 *
 * Requires the dev server. Skipped when it is not running so that `pnpm test`
 * stays useful offline; CI should run it with the server up.
 */
const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

async function serverUp() {
  try {
    await fetch(BASE, { signal: AbortSignal.timeout(2000) })
    return true
  } catch {
    return false
  }
}

async function routes() {
  // Use the running build's published routes, not temporary files created by
  // concurrent content tests or drafts that must return 404 publicly.
  const sitemap = await pageHtml('/sitemap.xml')
  const articles = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => new URL(match[1]).pathname)
    .filter((path) => path.startsWith('/blog/'))
  expect(articles.length, 'The published article sitemap must not be empty').toBeGreaterThan(0)
  return ['/', '/work', '/blog', '/about', ...articles]
}

async function pageHtml(route: string) {
  const response = await fetch(BASE + route)
  expect(response.status, `Page ${route} must render before checking its links`).toBe(200)
  return response.text()
}

/** Anchors in the served HTML, as [href, fullTag] pairs. */
function anchors(html: string) {
  return [...html.matchAll(/<a\b[^>]*>/g)]
    .map((m) => m[0])
    .map((tag) => [tag.match(/href="([^"]*)"/)?.[1] ?? '', tag] as const)
    .filter(([href]) => href)
}

describe('outbound links', async () => {
  const up = await serverUp()

  it.skipIf(!up)('open in a new tab on every page', async () => {
    const offenders: string[] = []

    for (const route of await routes()) {
      const html = await pageHtml(route)
      for (const [href, tag] of anchors(html)) {
        // mailto: hands off to a mail client without navigating away, so a new
        // tab would only leave a blank one behind.
        if (!isExternal(href) || href.startsWith('mailto:')) continue
        if (!tag.includes('target="_blank"')) offenders.push(`${route} → ${href}`)
      }
    }

    expect(offenders).toEqual([])
  })

  it.skipIf(!up)('carry rel="noopener" wherever they target a new tab', async () => {
    const offenders: string[] = []

    for (const route of await routes()) {
      const html = await pageHtml(route)
      for (const [href, tag] of anchors(html)) {
        if (!tag.includes('target="_blank"')) continue
        // Without noopener the opened page can navigate this tab elsewhere.
        if (!/rel="[^"]*noopener/.test(tag)) offenders.push(`${route} → ${href}`)
      }
    }

    expect(offenders).toEqual([])
  })

  it('treats site-relative paths as internal', () => {
    expect(isExternal('/blog')).toBe(false)
    expect(isExternal('/rss.xml')).toBe(false)
    expect(isExternal('#top')).toBe(false)
    expect(isExternal('https://x.com/Sudi_Dav')).toBe(true)
    expect(isExternal('mailto:contact@sudi.dev')).toBe(true)
  })
})
