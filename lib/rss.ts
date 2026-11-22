import type { Post } from './content.types'
import { localePath, type SiteLocale } from './locale'
import { SITE_URL, type SiteSettings } from './site'

type FeedPost = Pick<Post, 'title' | 'excerpt' | 'slug' | 'date'>
type FeedSettings = Pick<SiteSettings, 'displayName' | 'seo'>

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return '&apos;'
    }
  })
}

export function renderRssFeed(posts: FeedPost[], settings: FeedSettings, locale: SiteLocale): string {
  const homepage = `${SITE_URL}${localePath(locale, '/')}`
  const feedUrl = `${SITE_URL}${localePath(locale, '/rss.xml')}`
  const articlePath = (slug: string) => localePath(locale, `/blog/${slug}`)

  const items = posts
    .map((post) => {
      const url = `${SITE_URL}${articlePath(post.slug)}`
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(post.excerpt)}</description>
      <pubDate>${escapeXml(new Date(`${post.date}T00:00:00Z`).toUTCString())}</pubDate>
    </item>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(settings.displayName)}</title>
    <link>${escapeXml(homepage)}</link>
    <description>${escapeXml(settings.seo.description)}</description>
    <language>${locale}</language>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`
}
