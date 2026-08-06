import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      // The admin is behind auth, but keep it out of crawlers regardless.
      { userAgent: '*', disallow: '/admin' },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
