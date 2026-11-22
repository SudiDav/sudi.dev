import type { MetadataRoute } from 'next'
import { getPublishedPosts } from '@/lib/content'
import { languageAlternates, localePath } from '@/lib/locale'
import { SITE_URL } from '@/lib/site'

const CORE_PAGES = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/work', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/blog', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/about', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.2 },
] as const

function absoluteLanguageAlternates(path: string) {
  return Object.fromEntries(
    Object.entries(languageAlternates(path)).map(([locale, localizedPath]) => [
      locale,
      `${SITE_URL}${localizedPath}`,
    ]),
  )
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [englishPosts, frenchPosts] = await Promise.all([
    getPublishedPosts('en'),
    getPublishedPosts('fr'),
  ])
  const frenchSlugs = new Set(frenchPosts.map((post) => post.slug))

  const englishCore = CORE_PAGES.map(({ path, ...metadata }) => ({
    url: `${SITE_URL}${path}`,
    ...metadata,
    alternates: { languages: absoluteLanguageAlternates(path) },
  }))
  const frenchCore = CORE_PAGES.map(({ path, ...metadata }) => ({
    url: `${SITE_URL}${localePath('fr', path)}`,
    ...metadata,
    alternates: { languages: absoluteLanguageAlternates(path) },
  }))
  const englishArticles = englishPosts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(`${post.date}T00:00:00Z`),
    changeFrequency: 'yearly' as const,
    priority: 0.6,
    ...(frenchSlugs.has(post.slug)
      ? { alternates: { languages: absoluteLanguageAlternates(`/blog/${post.slug}`) } }
      : {}),
  }))
  const frenchArticles = frenchPosts.map((post) => ({
    url: `${SITE_URL}${localePath('fr', `/blog/${post.slug}`)}`,
    lastModified: new Date(`${post.date}T00:00:00Z`),
    changeFrequency: 'yearly' as const,
    priority: 0.6,
    alternates: { languages: absoluteLanguageAlternates(`/blog/${post.slug}`) },
  }))

  return [...englishCore, ...frenchCore, ...englishArticles, ...frenchArticles]
}
