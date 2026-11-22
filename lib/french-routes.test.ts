import { describe, expect, it } from 'vitest'

const base = process.env.TEST_BASE_URL
const pages = ['/', '/work', '/about', '/blog', '/privacy']
const launchArticles = new Set([
  'adding-entity-framework-core-and-sqlite',
  'after-amen-move',
  'attention-is-all-you-need',
  'code-smart-not-fast-avoiding-premature-optimization',
  'getting-started-with-aspnet-core-7-minimal-apis',
  'how-to-send-an-email-with-aspnet-core-minimal-api-and-mailkit',
  'maybe-love-is-the-now',
  'observability-101-stop-debugging-in-the-dark',
  'outbox-and-inbox-pattern-dotnet-ef-core-postgres',
  'the-crucial-role-of-english-proficiency-in-software-development',
])

async function read(path: string, status = 200, userAgent?: string) {
  const response = await fetch(new URL(path, base), {
    headers: userAgent === undefined ? undefined : { 'user-agent': userAgent },
    signal: AbortSignal.timeout(15000),
  })
  expect(response.status, path).toBe(status)
  return response.text()
}

function expectHeadLinks(html: string, path: string, english: string, french: string) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? ''
  const links = head.match(/<link\b[^>]*>/gi) ?? []
  const hrefs = (rel: string, language?: string) => links.flatMap((tag) => {
    const href = tag.match(/\shref="([^"]+)"/i)?.[1]
    const actualRel = tag.match(/\srel="([^"]+)"/i)?.[1]
    const actualLanguage = tag.match(/\shreflang="([^"]+)"/i)?.[1]
    return href && actualRel === rel && actualLanguage === language ? [new URL(href).href] : []
  })
  const url = (pathname: string) => new URL(pathname, 'https://sudi.dev').href

  expect(hrefs('canonical'), path).toEqual([url(path)])
  expect(hrefs('alternate', 'en'), path).toEqual([url(english)])
  expect(hrefs('alternate', 'fr'), path).toEqual([url(french)])
}

describe.skipIf(!base)('public French version', () => {
  it('keeps metadata in the head when a static page is first requested without a user agent', async () => {
    const path = '/fr/about'
    expectHeadLinks(await read(path, 200, ''), path, '/about', path)
    expectHeadLinks(await read(path, 200, 'Googlebot'), path, '/about', path)
  })

  it('serves paired public pages with the correct document language', async () => {
    for (const path of pages) {
      const french = path === '/' ? '/fr' : '/fr' + path
      expect(await read(path)).toMatch(/<html\b[^>]*\blang="en"/)
      expect(await read(french)).toMatch(/<html\b[^>]*\blang="fr"/)
    }
  }, 20000)

  it('serves French editions of the published launch archive and later paired articles', async () => {
    const sitemap = await read('/sitemap.xml')
    const paths = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map(([, location]) => new URL(location).pathname))
    for (const path of paths) {
      if (!path.startsWith('/blog/')) continue
      const hasFrenchEdition = paths.has('/fr' + path)
      if (launchArticles.has(path.slice('/blog/'.length))) expect(hasFrenchEdition, path).toBe(true)
      if (!hasFrenchEdition) continue
      const english = await read(path)
      const html = await read('/fr' + path)
      expect(html).toMatch(/<html\b[^>]*\blang="fr"/)
      expect(html).toContain('https://sudi.dev/fr' + path)
      expect(html).toContain('https://sudi.dev' + path)
      const heading = /<h1\b[^>]*>([\s\S]*?)<\/h1>/
      const frenchTitle = html.match(heading)?.[1]
      expect(frenchTitle, path).toBeTruthy()
      expect(frenchTitle, path).not.toBe(english.match(heading)?.[1])
    }
  }, 25000)

  it('puts canonical and reciprocal language links in the crawler HTML head', async () => {
    const sitemap = await read('/sitemap.xml')
    const frenchArticles = [...sitemap.matchAll(/<loc>https:\/\/sudi\.dev(\/fr\/blog\/[^<]+)<\/loc>/g)]
      .map(([, path]) => path)
    const pairs = [
      ...pages.map((path) => [path, path === '/' ? '/fr' : '/fr' + path]),
      ...frenchArticles.map((path) => [path.slice(3), path]),
    ]

    for (const [english, french] of pairs) {
      for (const path of [english, french]) {
        expectHeadLinks(await read(path, 200, 'Googlebot'), path, english, french)
      }
    }
  }, 25000)

  it('includes translated content and excludes drafts from the French feed and sitemap', async () => {
    const feed = await read('/fr/rss.xml')
    const sitemap = await read('/sitemap.xml')
    expect(feed).toContain('<language>fr</language>')
    expect(feed).toContain('https://sudi.dev/fr/blog/after-amen-move')
    expect(sitemap).toContain('https://sudi.dev/fr/blog/after-amen-move')
    expect(feed).not.toContain('the-energy-of-emotion')
    expect(sitemap).not.toContain('/fr/blog/the-energy-of-emotion')
    await read('/fr/blog/the-energy-of-emotion', 404)
  }, 20000)

  it('offers the contact email and the live scene in both languages', async () => {
    for (const path of ['/', '/fr']) {
      const html = await read(path)
      expect(html).toContain('mailto:hello@sudi.dev')
      expect(html).toContain('id="contact"')
      expect(html).toContain('world-canvas')
      expect(html).toContain('world-fallback')
    }
  }, 20000)
})
