import { getPublishedPosts } from '@/lib/content'
import { SITE_URL, getSettings } from '@/lib/site'

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

/** The design's footer links to RSS, so the feed is a real route. */
export async function GET() {
  const [posts, settings] = await Promise.all([getPublishedPosts(), getSettings()])

  const items = posts
    .map(
      (post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(`${SITE_URL}/blog/${post.slug}`)}</link>
      <guid isPermaLink="true">${escapeXml(`${SITE_URL}/blog/${post.slug}`)}</guid>
      <description>${escapeXml(post.excerpt)}</description>
      <pubDate>${escapeXml(new Date(`${post.date}T00:00:00Z`).toUTCString())}</pubDate>
    </item>`,
    )
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(settings.displayName)}</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>${escapeXml(settings.seo.description)}</description>
    <language>en</language>
    <atom:link href="${escapeXml(`${SITE_URL}/rss.xml`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
