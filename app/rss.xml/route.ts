import { getPublishedPosts } from '@/lib/content'
import { renderRssFeed } from '@/lib/rss'
import { getSettings } from '@/lib/site'

/** The design's footer links to RSS, so the feed is a real route. */
export async function GET() {
  const [posts, settings] = await Promise.all([getPublishedPosts(), getSettings()])
  const xml = renderRssFeed(posts, settings, 'en')

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
