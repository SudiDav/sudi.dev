import type { MetadataRoute } from 'next'
import { getPosts } from '@/lib/content'
import { SITE } from '@/lib/site'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPosts()

  return [
    { url: SITE.url, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE.url}/work`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE.url}/blog`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE.url}/about`, changeFrequency: 'yearly', priority: 0.5 },
    ...posts.map((post) => ({
      url: `${SITE.url}/blog/${post.slug}`,
      lastModified: new Date(`${post.date}T00:00:00Z`),
      changeFrequency: 'yearly' as const,
      priority: 0.6,
    })),
  ]
}
