import { getPublishedPosts } from '@/lib/content'
import { renderRssFeed } from '@/lib/rss'
import { getLocalizedSiteSettings } from '@/lib/site'

export async function GET() {
  const [posts, settings] = await Promise.all([
    getPublishedPosts('fr'),
    getLocalizedSiteSettings('fr'),
  ])
  const xml = renderRssFeed(posts, settings, 'fr')

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
